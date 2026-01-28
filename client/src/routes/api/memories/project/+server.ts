import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

const API_URL = env.PUBLIC_API_URL || 'http://api:4000';

/**
 * POST /api/memories/project - Crea un proyecto con retroalimentación de memoria
 * Genera summary y keywords con IA, actualiza memory.md
 */
export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const body = await request.json();
		
		// Obtener token de autenticación
		const accessToken = cookies.get('access_token');
		
		const headers: HeadersInit = {
			'Content-Type': 'application/json',
		};
		
		if (accessToken) {
			headers['Authorization'] = `Bearer ${accessToken}`;
		}

		const response = await fetch(`${API_URL}/memories/project`, {
			method: 'POST',
			headers,
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			const errorText = await response.text();
			return new Response(
				JSON.stringify({ 
					success: false, 
					error: errorText || 'Error al crear proyecto' 
				}),
				{
					status: response.status,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}

		const result = await response.json();
		return new Response(JSON.stringify({ success: true, ...result }), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		console.error('[Create Project API Error]', error);
		return new Response(
			JSON.stringify({ 
				success: false, 
				error: 'Error de conexión al crear proyecto' 
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
};
