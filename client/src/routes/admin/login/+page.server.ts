import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	sessionCookieOptions,
	SESSION_COOKIE_NAME
} from '$lib/server/auth';
import { PUBLIC_API_URL } from '$env/static/public';

const API_URL = PUBLIC_API_URL || 'http://api:4000';

// Si ya está autenticado, redirigir a /admin/settings
export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user?.authenticated) {
		throw redirect(302, '/admin/settings');
	}
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies, fetch }) => {
		const formData = await request.formData();
		const username = formData.get('username')?.toString() || '';
		const password = formData.get('password')?.toString() || '';

		if (!username || !password) {
			return fail(400, { error: 'Usuario y contraseña son requeridos' });
		}

		try {
			// Autenticar contra la API
			const response = await fetch(`${API_URL}/auth/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, password })
			});

			if (!response.ok) {
				const data = await response.json().catch(() => ({}));
				return fail(401, { error: data.message || 'Credenciales inválidas' });
			}

			const tokens = await response.json();

			// Guardar access token en cookie
			cookies.set(SESSION_COOKIE_NAME, tokens.accessToken, {
				path: sessionCookieOptions.path,
				maxAge: sessionCookieOptions.maxAge,
				httpOnly: sessionCookieOptions.httpOnly,
				secure: sessionCookieOptions.secure,
				sameSite: sessionCookieOptions.sameSite
			});

			// También guardar refresh token
			cookies.set('refresh_token', tokens.refreshToken, {
				path: '/',
				maxAge: 60 * 60 * 24 * 7, // 7 días
				httpOnly: true,
				secure: sessionCookieOptions.secure,
				sameSite: 'strict'
			});

		} catch (error) {
			console.error('Error de login:', error);
			return fail(500, { error: 'Error de conexión con el servidor' });
		}

		throw redirect(302, '/admin/settings');
	}
};
