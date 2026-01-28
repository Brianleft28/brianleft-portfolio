import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	validateCredentials,
	createSessionToken,
	sessionCookieOptions,
	SESSION_COOKIE_NAME
} from '$lib/server/auth';

// Si ya está autenticado, redirigir a /admin/projects
export const load: PageServerLoad = async ({ locals, fetch }) => {
	if (locals.user?.authenticated) {
		throw redirect(302, '/admin/projects');
	}
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const formData = await request.formData();
		const username = formData.get('username')?.toString() || '';
		const password = formData.get('password')?.toString() || '';

		if (!username || !password) {
			return fail(400, { error: 'Usuario y contraseña son requeridos' });
		}
		

		if (!validateCredentials(username, password)) {
			return fail(401, { error: 'Credenciales inválidas' });
		}

		// Crear sesión
		const token = createSessionToken();

		cookies.set(SESSION_COOKIE_NAME, token, {
			path: sessionCookieOptions.path,
			maxAge: sessionCookieOptions.maxAge,
			httpOnly: sessionCookieOptions.httpOnly,
			secure: sessionCookieOptions.secure,
			sameSite: sessionCookieOptions.sameSite
		});

		throw redirect(302, '/admin/projects');
	}
};
