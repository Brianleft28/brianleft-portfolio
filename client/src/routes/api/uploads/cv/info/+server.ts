import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

const API_URL = env.PUBLIC_API_URL || 'http://api:4000';

/**
 * GET /api/uploads/cv/info - Proxy para info del CV
 * Público - no requiere autenticación
 */
export const GET: RequestHandler = async () => {
	try {
		const response = await fetch(`${API_URL}/uploads/cv/info`);

		if (!response.ok) {
			return new Response(JSON.stringify({ 
				available: false,
				message: 'CV no disponible' 
			}), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const data = await response.json();
		
		return new Response(JSON.stringify({
			...data,
			// Sobrescribir URL para que use el proxy del cliente
			downloadUrl: '/api/uploads/cv'
		}), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		console.error('[CV Info Error]', error);
		return new Response(JSON.stringify({ 
			available: false,
			error: 'Error obteniendo info del CV' 
		}), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
