import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

const API_URL = env.PUBLIC_API_URL || 'http://api:4000';

/**
 * GET /api/settings/banner - Obtiene el ASCII banner
 */
export const GET: RequestHandler = async () => {
	try {
		const response = await fetch(`${API_URL}/settings/banner`);

		if (!response.ok) {
			return new Response(JSON.stringify({ error: 'Error al obtener banner' }), {
				status: response.status,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const data = await response.json();
		return new Response(JSON.stringify(data), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		console.error('[Settings Banner Error]', error);
		return new Response(JSON.stringify({ error: 'Error interno' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};

/**
 * POST /api/settings/banner - Preview de texto como ASCII
 */
export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const token = cookies.get('auth_token');

		if (!token) {
			return new Response(JSON.stringify({ error: 'No autorizado' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const body = await request.json();

		const response = await fetch(`${API_URL}/settings/banner/preview`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify(body)
		});

		if (!response.ok) {
			return new Response(JSON.stringify({ error: 'Error al generar preview' }), {
				status: response.status,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const data = await response.json();
		return new Response(JSON.stringify(data), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		console.error('[Settings Banner Preview Error]', error);
		return new Response(JSON.stringify({ error: 'Error interno' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
