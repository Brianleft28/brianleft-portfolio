import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	// Permitir acceso a la página de login sin autenticación
	if (url.pathname === '/admin/login') {
		return {};
	}

	// Redirigir a login si no está autenticado
	if (!locals.user?.authenticated) {
		throw redirect(302, '/admin/login');
	}

	return {
		user: locals.user
	};
};
