import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { SESSION_COOKIE_NAME } from '$lib/server/auth';

const API_URL = env.PUBLIC_API_URL || 'http://api:4000';

/**
 * GET /api/ai-personalities/active - Obtiene la personalidad activa
 */
export const GET: RequestHandler = async ({ cookies }) => {
	try {
		const token = cookies.get(SESSION_COOKIE_NAME);

		const response = await fetch(`${API_URL}/ai-personalities/active`, {
			headers: token ? { Authorization: `Bearer ${token}` } : {}
		});

		if (!response.ok) {
			return new Response(JSON.stringify({ error: 'Error al obtener personalidad' }), {
				status: response.status,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const data = await response.json();
		return new Response(JSON.stringify(data), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		console.error('[AI Personalities Error]', error);
		return new Response(JSON.stringify({ error: 'Error interno' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};

/**
 * PUT /api/ai-personalities/active - Actualiza la personalidad activa
 */
export const PUT: RequestHandler = async ({ request, cookies }) => {
	try {
		const token = cookies.get(SESSION_COOKIE_NAME);

		if (!token) {
			return new Response(JSON.stringify({ error: 'No autorizado' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const body = await request.json();

		const response = await fetch(`${API_URL}/ai-personalities/active`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify(body)
		});

		if (!response.ok) {
			const errorText = await response.text();
			return new Response(JSON.stringify({ error: errorText || 'Error al guardar' }), {
				status: response.status,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const data = await response.json();
		return new Response(JSON.stringify(data), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		console.error('[AI Personalities PUT Error]', error);
		return new Response(JSON.stringify({ error: 'Error interno' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
