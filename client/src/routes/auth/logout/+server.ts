import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SESSION_COOKIE_NAME } from '$lib/server/auth';

/**
 * Endpoint de logout que elimina las cookies de sesión.
 * Esto permite que el comando logout de la terminal también cierre la sesión del admin panel.
 */
export const POST: RequestHandler = async ({ cookies }) => {
	// Eliminar cookies de sesión
	cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
	cookies.delete('refresh_token', { path: '/' });

	return json({ message: 'Logout exitoso' });
};
