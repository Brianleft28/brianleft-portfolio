import { env } from '$env/dynamic/private';

const API_URL = env.PUBLIC_API_URL || 'http://api:4000';

// Configuración por defecto si no hay BD
const DEFAULT_SETTINGS: Record<string, string> = {
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
	ai_greeting: 'Hola! Soy el asistente AI. ¿En qué puedo ayudarte?'
};

/**
 * GET /api/settings - Obtiene todos los settings públicos
 * Usa el endpoint público del backend
 */
export const GET = async () => {
	try {
		// Intentar el endpoint público primero
		const response = await fetch(`${API_URL}/settings/public`, {
			headers: { 'Content-Type': 'application/json' }
		});

		if (!response.ok) {
			// Devolver defaults si la API falla
			return new Response(JSON.stringify(DEFAULT_SETTINGS), {
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const settings = await response.json();

		// Convertir array a objeto key-value
		const settingsMap: Record<string, string> = { ...DEFAULT_SETTINGS };
		for (const setting of settings) {
			settingsMap[setting.key] = setting.value;
		}

		return new Response(JSON.stringify(settingsMap), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		console.error('[Settings API Error]', error);
		// Devolver defaults en caso de error
		return new Response(JSON.stringify(DEFAULT_SETTINGS), {
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
