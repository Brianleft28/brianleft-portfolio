import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

const API_URL = env.PUBLIC_API_URL || 'http://api:4000';

/**
 * POST /api/memories/generate-summaries - Genera resúmenes con IA para proyectos sin resumen
 */
export const POST: RequestHandler = async ({ cookies }) => {
	try {
		// Obtener token de autenticación
		const accessToken = cookies.get('access_token');
		
		const headers: HeadersInit = {
			'Content-Type': 'application/json'
		};
		
		if (accessToken) {
			headers['Authorization'] = `Bearer ${accessToken}`;
		}

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
