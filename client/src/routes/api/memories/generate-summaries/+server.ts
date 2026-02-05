import type { RequestHandler } from './$types';
import { PUBLIC_API_URL } from '$env/static/public';
import { SESSION_COOKIE_NAME } from '$lib/server/auth';

const API_URL = PUBLIC_API_URL || 'http://api:4000';

/**
 * POST /api/memories/generate-summaries - Genera resúmenes con IA para proyectos sin resumen
 */
export const POST: RequestHandler = async ({ cookies }) => {
	try {
		// Obtener token de autenticación
		const accessToken = cookies.get(SESSION_COOKIE_NAME);
		
		if (!accessToken) {
			return new Response(
				JSON.stringify({ success: false, error: 'No autenticado' }),
				{ status: 401, headers: { 'Content-Type': 'application/json' } }
			);
		}
		
		const headers: HeadersInit = {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${accessToken}`
		};

		const response = await fetch(`${API_URL}/memories/generate-summaries`, {
			method: 'POST',
			headers
		});

		if (!response.ok) {
			const errorText = await response.text();
			return new Response(
				JSON.stringify({ success: false, error: errorText || 'Error al generar resúmenes' }),
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
		console.error('[Generate Summaries API Error]', error);
		return new Response(
			JSON.stringify({ success: false, error: 'Error de conexión al generar resúmenes' }),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
};
