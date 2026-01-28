import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

const API_URL = env.PUBLIC_API_URL || 'http://api:4000';

// Cache simple del token JWT
let cachedToken: { token: string; expires: number } | null = null;

async function getApiToken(): Promise<string> {
	if (cachedToken && Date.now() < cachedToken.expires) {
		return cachedToken.token;
	}

	const response = await fetch(`${API_URL}/auth/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			username: env.ADMIN_USERNAME,
			password: env.ADMIN_PASSWORD
		})
	});

	if (!response.ok) {
		throw new Error('No se pudo autenticar con la API');
	}

	const data = await response.json();

	cachedToken = {
		token: data.accessToken,
		expires: Date.now() + 50 * 60 * 1000
	};

	return data.accessToken;
}

/**
 * GET /api/ai-personalities - Lista todas las personalidades
 */
export const GET: RequestHandler = async () => {
	try {
		const token = await getApiToken();
		const response = await fetch(`${API_URL}/ai-personalities`, {
			headers: {
				'Authorization': `Bearer ${token}`
			}
		});

		if (!response.ok) {
			return new Response(JSON.stringify({ error: 'Error al obtener personalidades' }), {
				status: response.status,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const data = await response.json();
		return new Response(JSON.stringify(data), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		console.error('Error fetching personalities:', error);
		return new Response(JSON.stringify({ error: 'Error interno' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};

/**
 * POST /api/ai-personalities - Crea una nueva personalidad
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const token = await getApiToken();
		const body = await request.json();

		const response = await fetch(`${API_URL}/ai-personalities`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${token}`
			},
			body: JSON.stringify(body)
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			return new Response(JSON.stringify({ error: errorData.message || 'Error al crear personalidad' }), {
				status: response.status,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const data = await response.json();
		return new Response(JSON.stringify(data), {
			status: 201,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		console.error('Error creating personality:', error);
		return new Response(JSON.stringify({ error: 'Error interno' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
