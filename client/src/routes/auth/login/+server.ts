import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sessionCookieOptions, SESSION_COOKIE_NAME } from '$lib/server/auth';
import { PUBLIC_API_URL } from '$env/static/public';

const API_URL = PUBLIC_API_URL || 'http://api:4000';

/**
 * Endpoint de login que autentica contra la API y setea las cookies de sesión.
 * Esto permite que el comando login de la terminal también establezca la sesión del admin panel.
 */
export const POST: RequestHandler = async ({ request, cookies, fetch }) => {
	try {
		const { username, password } = await request.json();

		if (!username || !password) {
			return json({ message: 'Usuario y contraseña son requeridos' }, { status: 400 });
		}

		// Autenticar contra la API real
		const response = await fetch(`${API_URL}/auth/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username, password })
		});

		const data = await response.json();

		if (!response.ok) {
			return json({ message: data.message || 'Credenciales inválidas' }, { status: response.status });
		}

		// Setear cookies de sesión
		cookies.set(SESSION_COOKIE_NAME, data.accessToken, {
			path: sessionCookieOptions.path,
			maxAge: sessionCookieOptions.maxAge,
			httpOnly: sessionCookieOptions.httpOnly,
			secure: sessionCookieOptions.secure,
			sameSite: sessionCookieOptions.sameSite
		});

		cookies.set('refresh_token', data.refreshToken, {
			path: '/',
			maxAge: 60 * 60 * 24 * 7, // 7 días
			httpOnly: true,
			secure: sessionCookieOptions.secure,
			sameSite: 'strict'
		});

		return json({
			message: 'Login exitoso',
			user: data.user,
			accessToken: data.accessToken
		});

	} catch (error) {
		console.error('[Auth Login] Error:', error);
		return json({ message: 'Error de conexión con el servidor' }, { status: 500 });
	}
};
