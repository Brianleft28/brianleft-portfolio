import type { Handle, HandleFetch } from '@sveltejs/kit';
import { SESSION_COOKIE_NAME } from '$lib/server/auth';
import { PUBLIC_API_URL } from '$env/static/public';

const API_URL = PUBLIC_API_URL || 'http://api:4000';

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
	const { url, cookies, fetch } = event;

	// Verificar autenticación para rutas de admin
	const sessionToken = cookies.get(SESSION_COOKIE_NAME);
	
	if (sessionToken) {
		try {
			// Validar token contra la API
			const response = await fetch(`${API_URL}/users/me`, {
				headers: {
					'Authorization': `Bearer ${sessionToken}`
				}
			});

			if (response.ok) {
				const user = await response.json();
				event.locals.user = {
					authenticated: true,
					userId: user.id,
					username: user.username,
					role: user.role,
					token: sessionToken
				};
			} else {
				// Token inválido, limpiar cookie y marcar como no autenticado
				cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
				event.locals.user = { authenticated: false };
				
				// Si está intentando acceder a una ruta protegida de admin, redirigir
				if (url.pathname.startsWith('/admin') && url.pathname !== '/admin/login' && url.pathname !== '/admin/logout') {
					return new Response(null, {
						status: 302,
						headers: { Location: '/admin/login' }
					});
				}
			}
		} catch (error) {
			console.error('[Auth Hook] Error validating token:', error);
			cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
			event.locals.user = { authenticated: false };
		}
	} else {
		event.locals.user = { authenticated: false };
	}

	// Proxy para todas las rutas /api/*
	if (url.pathname.startsWith('/api')) {
		// Eliminar '/api' del path
		const apiPath = url.pathname.substring(4);
		const proxiedUrl = `${PUBLIC_API_URL}${apiPath}${url.search}`;

		// Copiar headers y body originales
		const headers = new Headers(event.request.headers);
		headers.delete('host'); // El host lo pone el fetch en base a la URL
		
		// Si hay token, agregarlo
		if (event.locals.user?.token) {
			headers.set('Authorization', `Bearer ${event.locals.user.token}`);
		}

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
