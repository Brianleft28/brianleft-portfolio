import type { Handle } from '@sveltejs/kit';
import { validateSessionToken, SESSION_COOKIE_NAME, getUserIdFromToken } from '$lib/server/auth';
import { PUBLIC_API_URL } from '$env/static/public';

/**
 * Este hook se ejecuta en cada petición al servidor.
 * Maneja: autenticación de sesión y configuración de idioma.
 */

/**
 * Intercepta las peticiones del cliente (fetch)
 * Si la petición es relativa, la deja pasar.
 * Si es a nuestra propia API, la reescribe para que funcione en el server.
 */
export const handleFetch: HandleFetch = async ({ request, fetch }) => {
	return fetch(request);
};

/**
 * Intercepta las peticiones que llegan al servidor de SvelteKit
 */
export const handle: Handle = async ({ event, resolve }) => {
	const { url, fetch } = event;

	// Proxy para todas las rutas /api/*
	if (url.pathname.startsWith('/api')) {
		// Eliminar '/api' del path
		const apiPath = url.pathname.substring(4);
		const proxiedUrl = `${PUBLIC_API_URL}${apiPath}${url.search}`;

		// Copiar headers y body originales
		const headers = new Headers(event.request.headers);
		headers.delete('host'); // El host lo pone el fetch en base a la URL

		try {
			const response = await fetch(proxiedUrl, {
				method: event.request.method,
				headers,
				body: event.request.body,
				// Duplex es necesario para stream de request/response
				// @ts-expect-error - duplex es una adición reciente
				duplex: 'half'
			});

			return response;
		} catch (error) {
			console.error(`[API Proxy Error] ${event.request.method} ${proxiedUrl}`, error);
			return new Response('Error en el proxy de la API', { status: 500 });
		}
	}

	// Para el resto de las peticiones, continuar normalmente
	return resolve(event);
};
