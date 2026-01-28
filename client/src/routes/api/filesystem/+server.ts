import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

const API_URL = env.PUBLIC_API_URL || 'http://api:4000';

/**
 * GET /api/filesystem - Obtiene el árbol del filesystem desde la BD
 */
export const GET: RequestHandler = async () => {
	try {
		const response = await fetch(`${API_URL}/filesystem`, {
			headers: { 'Content-Type': 'application/json' }
		});

		if (!response.ok) {
			return new Response(
				JSON.stringify({ tree: [], error: 'No se pudo cargar el filesystem' }),
				{
					status: response.status,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}

		const tree = await response.json();
		return new Response(JSON.stringify({ tree }), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		console.error('[Filesystem API Error]', error);
		return new Response(JSON.stringify({ tree: [], error: 'Error de conexión' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};

/**
 * POST /api/filesystem - Sincroniza el filesystem con los proyectos de memoria
 */
export const POST: RequestHandler = async () => {
	try {
		const response = await fetch(`${API_URL}/filesystem/sync`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' }
		});

		if (!response.ok) {
			const errorText = await response.text();
			return new Response(
				JSON.stringify({ success: false, error: errorText || 'Error al sincronizar' }),
				{
					status: response.status,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}

		const result = await response.json();
		return new Response(JSON.stringify(result), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		console.error('[Filesystem Sync API Error]', error);
		return new Response(
			JSON.stringify({ success: false, error: 'Error de conexión al sincronizar' }),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
};
