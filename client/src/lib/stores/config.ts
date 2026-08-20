import { writable, derived } from 'svelte/store';
import { getCurrentLocale } from '$lib/i18n';

export interface PortfolioConfig {
	// Owner info
	owner_name: string;
	owner_first_name: string;
	owner_last_name: string;
	owner_role: string;
	owner_role_short: string;
	owner_location: string;
	owner_philosophy: string;
	// Contact
	contact_email: string;
	// Social
	social_github: string;
	social_linkedin: string;
	/** URL pública del sitio; se usa como base para canonical y og:url. */
	social_website: string;
	// Branding
	branding_primary_color: string;
	branding_ascii_banner: string;
	branding_site_title: string;
	branding_site_description: string;
	// AI
	ai_name: string;
	ai_command: string;
	ai_greeting: string;
	// Loaded flag
	_loaded: boolean;
}

export interface AiPersonality {
	id?: number;
	slug: string;
	name: string;
	displayName: string;
	description: string;
	systemPrompt: string;
	greeting: string | null;
	traits: string | null;
	language: string;
	voiceStyle: string;
	/** Modo con el que se abre el chat (`asistente`, `arquitecto`, …). */
	mode: string;
	active: boolean;
	isDefault: boolean;
}

export interface FileSystemNode {
	id: number;
	name: string;
	type: 'folder' | 'file';
	fileType?: string;
	content?: string;
	children?: FileSystemNode[];
}

// Defaults
const DEFAULT_CONFIG: PortfolioConfig = {
	owner_name: 'Developer',
	owner_first_name: 'Dev',
	owner_last_name: 'User',
	owner_role: 'Full Stack Developer',
	owner_role_short: 'Developer',
	owner_location: 'Remote',
	owner_philosophy: 'Code with purpose',
	contact_email: 'dev@example.com',
	social_github: '',
	social_linkedin: '',
	social_website: '',
	branding_primary_color: '#4ec9b0',
	branding_ascii_banner: '',
	branding_site_title: '',
	branding_site_description: '',
	ai_name: 'AI Assistant',
	ai_command: 'ai',
	ai_greeting: 'Hola! Soy el asistente AI. ¿En qué puedo ayudarte?',
	_loaded: false
};

const DEFAULT_PERSONALITY: AiPersonality = {
	slug: 'default',
	name: 'assistant',
	displayName: 'AI Assistant',
	description: 'Asistente técnico',
	systemPrompt:
		'Sos un asistente técnico. Respondé en español sútil argentino de forma clara y concisa.',
	greeting: '¡Hola papá! Como te puedo ayudar?',
	traits: null,
	language: 'es-AR',
	voiceStyle: 'technical',
	mode: 'asistente',
	active: true,
	isDefault: true
};

// Stores
export const portfolioConfig = writable<PortfolioConfig>(DEFAULT_CONFIG);
export const aiPersonality = writable<AiPersonality>(DEFAULT_PERSONALITY);
export const dynamicFilesystem = writable<FileSystemNode[]>([]);

// Derived values para fácil acceso
export const ownerName = derived(portfolioConfig, ($c) => $c.owner_name);
export const aiName = derived(aiPersonality, ($p) => $p.displayName);
export const aiCommand = derived(portfolioConfig, ($c) => $c.ai_command || 'ai');
export const asciiBanner = derived(portfolioConfig, ($c) => $c.branding_ascii_banner || '');

/**
 * Árbol del filesystem, por idioma.
 *
 * Se pide aparte del resto de la config porque es lo único que cambia cuando el
 * visitante cambia de idioma. Antes se pedía una sola vez, sin `lang`, en el
 * `onMount` del layout: el árbol se quedaba para siempre en el idioma de entrada.
 *
 * La promesa se cachea por idioma, así que el pedido inicial y el que dispara la
 * suscripción a `locale` no se duplican.
 */
let filesystemRequest: { lang: string; promise: Promise<void> } | null = null;

export function loadFilesystem(lang: string = getCurrentLocale()): Promise<void> {
	if (filesystemRequest?.lang === lang) return filesystemRequest.promise;

	const promise = fetchFilesystem(lang).catch((error) => {
		console.error('[Config] Error cargando el filesystem:', error);
		filesystemRequest = null; // que un fallo de red se pueda reintentar
	});

	filesystemRequest = { lang, promise };
	return promise;
}

async function fetchFilesystem(lang: string): Promise<void> {
	const response = await fetch(`/api/filesystem?lang=${lang}`);
	if (!response.ok) return;

	const data = await response.json();
	// La API devuelve el árbol como array plano. Esto esperaba `{tree: [...]}`,
	// que nunca matcheaba: el filesystem dinámico quedaba vacío y la home caía
	// al estático de `file-system.ts` — sin proyectos y con el texto de
	// instalación white-label. Se aceptan las dos formas por las dudas.
	const tree = Array.isArray(data) ? data : data?.tree;
	if (Array.isArray(tree) && tree.length > 0) {
		dynamicFilesystem.set(tree);
	}
}

// Cargar configuración desde API
export async function loadConfig(): Promise<void> {
	// Sin await: viaja en paralelo con el resto y se espera al final.
	const filesystem = loadFilesystem();

	try {
		const [settingsRes, personalityRes, bannerRes] = await Promise.all([
			// Endpoint público: `/api/settings` está detrás de JwtAuthGuard y devuelve
			// 401 al visitante anónimo, por eso el sitio se quedaba con los defaults
			// ("Developer"). `/settings/public` sí es abierto y trae la parametría real.
			fetch(`/api/settings/public?lang=${getCurrentLocale()}`),
			fetch('/api/ai-personalities/active'),
			fetch('/api/settings/banner')
		]);

		if (settingsRes.ok) {
			// El endpoint público devuelve un array [{key, value}], no un objeto:
			// lo reducimos a mapa antes de mezclarlo con la config.
			const raw = await settingsRes.json();
			const settings = Array.isArray(raw)
				? Object.fromEntries(
						raw.map((s: { key: string; value: string }) => [s.key, s.value])
					)
				: raw;
			portfolioConfig.update((current) => ({
				...current,
				...settings,
				_loaded: true
			}));
		}

		// Cargar banner por separado y mapearlo al campo correcto
		if (bannerRes.ok) {
			const bannerData = await bannerRes.json();
			if (bannerData.ascii_banner) {
				portfolioConfig.update((current) => ({
					...current,
					branding_ascii_banner: bannerData.ascii_banner
				}));
			}
		}

		if (personalityRes.ok) {
			const personality = await personalityRes.json();
			if (personality && personality.slug) {
				aiPersonality.set(personality);
			}
		}

	} catch (error) {
		console.error('[Config] Error loading:', error);
		// Mantener defaults
		portfolioConfig.update((c) => ({ ...c, _loaded: true }));
	}

	await filesystem;
}

// Helper para obtener valor sync
export function getConfigValue(key: keyof PortfolioConfig): string {
	let value = '';
	portfolioConfig.subscribe((c) => {
		value = String(c[key] || '');
	})();
	return value;
}
