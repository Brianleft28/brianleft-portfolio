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
 */
export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	try {
		const { prompt } = await request.json();
		const userPrompt = `${prompt ?? ''}`.slice(0, MAX_INPUT_CHARS);

		if (!userPrompt.trim()) {
			return new Response('Error: Mensaje vacío.', { status: 400 });
		}

		// Llamar a la API de NestJS
		const response = await fetch(`${API_URL}/chat`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ prompt: userPrompt }),
		});

		if (!response.ok) {
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
