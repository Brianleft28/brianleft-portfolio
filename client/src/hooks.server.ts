import type { Handle, HandleFetch, RequestEvent } from '@sveltejs/kit';
import { SESSION_COOKIE_NAME, sessionCookieOptions } from '$lib/server/auth';
import { env } from '$env/dynamic/private';
import '$lib/i18n';

// Dinámico y no estático: docker-compose pasa PUBLIC_API_URL como env de runtime,
// no como build arg, así que $env/static/public la hornearía vacía en la imagen.
const API_URL = env.PUBLIC_API_URL || 'http://api:4000';

/**
 * Headers hop-by-hop: son de la conexión, no del mensaje, y undici rechaza
 * la request si se los reenvía (UND_ERR_INVALID_ARG). `content-length` va
 * aparte porque el body se reenvía como stream.
 */
const HOP_BY_HOP_HEADERS = [
	'host',
	'connection',
	'keep-alive',
	'upgrade',
	'proxy-connection',
	'proxy-authenticate',
	'proxy-authorization',
	'transfer-encoding',
	'te',
	'trailer',
	'content-length'
];

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

type RenewedTokens = { accessToken: string; refreshToken: string };

/**
 * El refresh token rota en cada uso: si dos requests concurrentes intentan
 * renovar con el mismo token, la segunda recibe 401 y mataría la sesión.
 * Compartimos la renovación en curso para que todas usen el mismo resultado.
 */
let renewalInFlight: Promise<RenewedTokens | null> | null = null;

async function requestRenewal(
	event: RequestEvent,
	refreshToken: string
): Promise<RenewedTokens | null> {
	try {
		const response = await event.fetch(`${API_URL}/auth/refresh`, {
			method: 'POST',
			headers: { Authorization: `Bearer ${refreshToken}` }
		});

		if (!response.ok) return null;

		const tokens = await response.json();
		if (!tokens?.accessToken || !tokens?.refreshToken) return null;

		return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
	} catch (error) {
		console.error('[Auth Hook] Error renovando sesión:', error);
		return null;
	}
}

/**
 * Renueva la sesión con el refresh token (7 días) cuando el access token (15 min)
 * ya venció. Devuelve el nuevo access token, o `null` si no se pudo renovar.
 */
async function renewSession(event: RequestEvent): Promise<string | null> {
	const refreshToken = event.cookies.get('refresh_token');
	if (!refreshToken) return null;

	if (!renewalInFlight) {
		renewalInFlight = requestRenewal(event, refreshToken).finally(() => {
			renewalInFlight = null;
		});
	}

	const tokens = await renewalInFlight;
	if (!tokens) return null;

	// Las cookies se setean por request: la respuesta que las lleva es la de este evento.
	event.cookies.set(SESSION_COOKIE_NAME, tokens.accessToken, {
		path: sessionCookieOptions.path,
		maxAge: sessionCookieOptions.maxAge,
		httpOnly: sessionCookieOptions.httpOnly,
		secure: sessionCookieOptions.secure,
		sameSite: sessionCookieOptions.sameSite
	});

	event.cookies.set('refresh_token', tokens.refreshToken, {
		path: '/',
		maxAge: 60 * 60 * 24 * 7,
		httpOnly: true,
		secure: sessionCookieOptions.secure,
		sameSite: 'strict'
	});

	return tokens.accessToken;
}

/**
 * Intercepta las peticiones que llegan al servidor de SvelteKit
 */
export const handle: Handle = async ({ event, resolve }) => {
	const { url, cookies, fetch } = event;

	// Verificar autenticación para rutas de admin
	const sessionToken = cookies.get(SESSION_COOKIE_NAME);

	if (sessionToken) {
		try {
			const fetchUser = (token: string) =>
				fetch(`${API_URL}/users/me`, { headers: { Authorization: `Bearer ${token}` } });

			let activeToken = sessionToken;
			let response = await fetchUser(activeToken);

			// El access token dura 15 min y la cookie 24h: antes de dar la sesión
			// por muerta, intentamos renovarla con el refresh token (7 días).
			if (!response.ok) {
				const renewed = await renewSession(event);
				if (renewed) {
					activeToken = renewed;
					response = await fetchUser(activeToken);
				}
			}

			if (response.ok) {
				const user = await response.json();
				event.locals.user = {
					authenticated: true,
					userId: user.id,
					username: user.username,
					role: user.role,
					token: activeToken
				};
			} else {
				// Token inválido y sin refresh posible: limpiar y marcar como no autenticado
				cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
				cookies.delete('refresh_token', { path: '/' });
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
		const proxiedUrl = `${API_URL}${apiPath}${url.search}`;

		// Copiar headers originales, menos los de conexión
		const headers = new Headers(event.request.headers);
		for (const header of HOP_BY_HOP_HEADERS) {
			headers.delete(header);
		}

		// Si hay token, agregarlo
		if (event.locals.user?.token) {
			headers.set('Authorization', `Bearer ${event.locals.user.token}`);
		}

		const method = event.request.method;
		const hasBody = method !== 'GET' && method !== 'HEAD';

		try {
			return await fetch(proxiedUrl, {
				method,
				headers,
				body: hasBody ? event.request.body : undefined,
				// Duplex es necesario para stream de request/response
				...(hasBody ? { duplex: 'half' } : {})
			} as RequestInit);
		} catch (error) {
			console.error(`[API Proxy Error] ${method} ${proxiedUrl}`, error);
			return new Response('Error en el proxy de la API', { status: 500 });
		}
	}

	// Para el resto de las peticiones, continuar normalmente
	return resolve(event);
};
