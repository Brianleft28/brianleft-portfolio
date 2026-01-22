import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

const API_URL = env.PUBLIC_API_URL || 'http://api:4000';

/**
 * GET /api/uploads/cv - Proxy para descargar CV
 * Público - no requiere autenticación
 */
export const GET: RequestHandler = async ({ request }) => {
	try {
		const response = await fetch(`${API_URL}/uploads/cv`, {
			headers: {
				'Accept': 'application/pdf'
			}
		});

		if (!response.ok) {
			return new Response(JSON.stringify({ error: 'CV no disponible' }), {
				status: response.status,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Obtener headers del response original
		const contentType = response.headers.get('Content-Type') || 'application/pdf';
		const contentDisposition = response.headers.get('Content-Disposition') || 'attachment; filename="curriculum-vitae.pdf"';
		
		// Streamear el PDF
		const pdfBuffer = await response.arrayBuffer();

		return new Response(pdfBuffer, {
			status: 200,
			headers: {
				'Content-Type': contentType,
				'Content-Disposition': contentDisposition,
				'Cache-Control': 'public, max-age=3600'
			}
		});
	} catch (error) {
		console.error('[CV Download Error]', error);
		return new Response(JSON.stringify({ error: 'Error descargando CV' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
