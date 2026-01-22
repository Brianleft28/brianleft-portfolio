import { writable, derived } from 'svelte/store';

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
	active: true,
	isDefault: true
};

// Stores
export const portfolioConfig = writable<PortfolioConfig>(DEFAULT_CONFIG);
export const aiPersonality = writable<AiPersonality>(DEFAULT_PERSONALITY);
export const dynamicFilesystem = writable<FileSystemNode[]>([]);

// Store para API key de Gemini (localStorage)
export const geminiApiKey = writable<string>('');

// Derived values para fácil acceso
export const ownerName = derived(portfolioConfig, ($c) => $c.owner_name);
export const aiName = derived(aiPersonality, ($p) => $p.displayName);
export const aiCommand = derived(portfolioConfig, ($c) => $c.ai_command || 'ai');
export const asciiBanner = derived(portfolioConfig, ($c) => $c.branding_ascii_banner || '');

// Cargar API key desde localStorage
export function loadGeminiApiKey(): string {
	if (typeof window === 'undefined') return '';
	const key = localStorage.getItem('gemini_api_key') || '';
	geminiApiKey.set(key);
	return key;
}

// Guardar API key en localStorage
export function saveGeminiApiKey(key: string): void {
	if (typeof window === 'undefined') return;
	if (key) {
		localStorage.setItem('gemini_api_key', key);
	} else {
		localStorage.removeItem('gemini_api_key');
	}
	geminiApiKey.set(key);
}

// Cargar configuración desde API
export async function loadConfig(): Promise<void> {
	try {
		const [settingsRes, personalityRes, filesystemRes, bannerRes] = await Promise.all([
			fetch('/api/settings'),
			fetch('/api/ai-personalities/active'),
			fetch('/api/filesystem'),
			fetch('/api/settings/banner')
		]);

		if (settingsRes.ok) {
			const settings = await settingsRes.json();
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

		if (filesystemRes.ok) {
			const data = await filesystemRes.json();
			if (data.tree && Array.isArray(data.tree)) {
				dynamicFilesystem.set(data.tree);
			}
		}
	} catch (error) {
		console.error('[Config] Error loading:', error);
		// Mantener defaults
		portfolioConfig.update((c) => ({ ...c, _loaded: true }));
	}
}

// Helper para obtener valor sync
export function getConfigValue(key: keyof PortfolioConfig): string {
	let value = '';
	portfolioConfig.subscribe((c) => {
		value = String(c[key] || '');
	})();
	return value;
}
