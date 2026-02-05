import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SESSION_COOKIE_NAME } from '$lib/server/auth';

export const POST: RequestHandler = async ({ cookies }) => {
	// Eliminar la cookie de sesión
	cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
	
	throw redirect(302, '/admin/login');
};

export const GET: RequestHandler = async ({ cookies }) => {
	// También permitir logout por GET para simplicidad
	cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
	
	throw redirect(302, '/admin/login');
};
