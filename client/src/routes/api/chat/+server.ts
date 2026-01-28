import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

const API_URL = env.PUBLIC_API_URL || 'http://api:4000';
const MAX_INPUT_CHARS = 4000;

/**
 * Proxy al endpoint de chat de NestJS
 * Esto permite que el cliente use la API centralizada que tiene acceso a:
 * - Memorias dinámicas de la DB
 * - Keywords generados por AI
 * - Sistema de búsqueda semántica
 * - Personalidad configurable desde settings
 * 
 * El usuario puede proporcionar su propia API key de Gemini via header
 * Esta key se pasa al backend para usar en lugar de la key del servidor
 * 
 * FREE TIER: Sin key propia, 5 intentos por IP usando la key del servidor
 */
export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	try {
		const { prompt, apiKey } = await request.json();
		const userPrompt = `${prompt ?? ''}`.slice(0, MAX_INPUT_CHARS);

		if (!userPrompt.trim()) {
			return new Response('Error: Mensaje vacío.', { status: 400 });
		}

		// Headers para el backend
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		};

		// Si el usuario proporciona su API key, enviarla al backend
		if (apiKey && typeof apiKey === 'string' && apiKey.length > 20) {
			headers['X-Gemini-Api-Key'] = apiKey;
		}

		// Pasar la IP del cliente para el rate limiting
		try {
			const clientIp = getClientAddress();
			headers['X-Forwarded-For'] = clientIp;
		} catch {
			// Si no se puede obtener la IP, continuar sin ella
		}

		// Llamar a la API de NestJS
		const response = await fetch(`${API_URL}/chat`, {
			method: 'POST',
			headers,
			body: JSON.stringify({ prompt: userPrompt }),
		});

		// Manejar errores específicos
		if (!response.ok) {
			// Si es 403 (free tier agotado), pasar el mensaje directamente
			if (response.status === 403) {
				const errorText = await response.text();
				return new Response(errorText, { 
					status: 200, // Devolver como 200 para que se muestre en la terminal
					headers: { 'Content-Type': 'text/plain; charset=utf-8' }
				});
			}
			
			const errorText = await response.text();
			console.error('[Chat API Error]', response.status, errorText);
			
			if (response.status === 429) {
				return new Response('Demasiadas peticiones. Espera un momento.', { status: 429 });
			}
			
			return new Response('Error al conectar con el núcleo cognitivo.', { status: 500 });
		}

		// Pasar el stream directamente
		if (!response.body) {
			return new Response('Sin respuesta del servidor.', { status: 500 });
		}

		// Crear un nuevo stream para reenviar
		const reader = response.body.getReader();
		const stream = new ReadableStream({
			async start(controller) {
				try {
					while (true) {
						const { done, value } = await reader.read();
						if (done) break;
						controller.enqueue(value);
					}
					controller.close();
				} catch (error) {
					controller.error(error);
				}
			},
		});

		return new Response(stream, {
			headers: {
				'Content-Type': 'text/plain; charset=utf-8',
				'Transfer-Encoding': 'chunked',
				'Cache-Control': 'no-cache',
			},
		});
	} catch (error) {
		console.error('[Chat Proxy Error]', error);
		return new Response('Kernel Panic: No se pudo conectar con el núcleo cognitivo.', { status: 500 });
	}
};
