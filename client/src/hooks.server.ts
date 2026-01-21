import type { Handle } from '@sveltejs/kit';
import { validateSessionToken, SESSION_COOKIE_NAME } from '$lib/server/auth';

/**
 * Este hook se ejecuta en cada petición al servidor.
 * Maneja: autenticación de sesión y configuración de idioma.
 */

export const handle: Handle = async ({ event, resolve }) => {
	// Validar sesión de admin
	const sessionToken = event.cookies.get(SESSION_COOKIE_NAME);

	if (sessionToken && validateSessionToken(sessionToken)) {
		event.locals.user = { authenticated: true };
	} else {
		event.locals.user = null;
	}

	// Leer idioma de las cookies
	const lang = event.cookies.get('lang') || 'ES';

	// Resolver la petición
	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%sveltekit.lang%', lang)
	});
};
