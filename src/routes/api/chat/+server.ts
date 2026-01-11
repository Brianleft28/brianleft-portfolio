import { GoogleGenerativeAI } from '@google/generative-ai';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

// Memoria centralizada — misma fuente que file-system.ts
// En Fase 4, NestJS servirá esto desde la API
import { getRelevantMemory } from '$lib/data/memory/loader';

// Modelo configurable por ambiente - default al más barato
const MODEL_NAME = env.GEMINI_MODEL || 'gemini-1.5-flash';
const MAX_INPUT_CHARS = 4000;
const MAX_REQUESTS_PER_MINUTE = 10;

// Rate limiting simple en memoria (se resetea con cada deploy)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

function isRateLimited(ip: string): boolean {
	const now = Date.now();
	const record = requestCounts.get(ip);

	if (!record || now > record.resetTime) {
		requestCounts.set(ip, { count: 1, resetTime: now + 60000 });
		return false;
	}

	if (record.count >= MAX_REQUESTS_PER_MINUTE) {
		return true;
	}

	record.count++;
	return false;
}

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	try {
		// Rate limiting
		const clientIp = getClientAddress();
		if (isRateLimited(clientIp)) {
			return new Response('Demasiadas peticiones. Espera un momento.', { status: 429 });
		}

		const apiKey = env.GEMINI_API_KEY;
		if (!apiKey) {
			return new Response('Error: API Key no configurada.', { status: 500 });
		}

		const { prompt } = await request.json();
		const userPrompt = `${prompt ?? ''}`.slice(0, MAX_INPUT_CHARS);

		if (!userPrompt.trim()) {
			return new Response('Error: Mensaje vacío.', { status: 400 });
		}

		// Cargar solo memoria relevante según keywords
		const memoryContent = getRelevantMemory(userPrompt);

		const genAI = new GoogleGenerativeAI(apiKey);
		const model = genAI.getGenerativeModel({ model: MODEL_NAME });

		const fullPrompt = `
        ## CONTEXTO
        ${memoryContent}

        ---
        ## SISTEMA

Eres TorvaldsAi, asistente técnico del portfolio de Brian Benegas.
Personalidad: Linus Torvalds - directo, pragmático, técnicamente exigente pero respetuoso.

REGLAS:

1. **IDIOMA**: Español argentino rioplatense sutil. Si el usuario escribe en otro idioma, respondé en ese idioma naturalmente. Brian está aprendiendo inglés activamente, así que si preguntan en inglés, respondé en inglés claro y técnico.

2. **LONGITUD**: Adapta según complejidad.
   - Preguntas simples: 1-3 líneas.
   - Explicaciones técnicas: hasta 350 palabras.
   - Arquitectura/flujos: diagramas ASCII obligatorios.

3. **FORMATO PERMITIDO** (usalo libremente):
   - **Negritas** para términos clave
   - \`código inline\` para archivos, funciones, comandos
   - Bloques de código con \`\`\`lenguaje
   - Listas con - o números
   - Tablas cuando compares opciones
   - Diagramas ASCII para arquitectura
   - Emojis con moderación (🔧⚡✅❌ etc.)

4. **FORMATO PROHIBIDO**:
   - Títulos con # o ## (NUNCA)
   - Líneas en blanco excesivas (máximo 1 entre secciones)
   - Párrafos largos sin estructura

5. **EJEMPLO DE RESPUESTA IDEAL**:
   El sistema usa **SvelteKit** con \`adapter-node\`. Arquitectura:
   \`\`\`
   [Browser] --> [SSR] --> [API Routes]
                               |
                         [Gemini API]
   \`\`\`
   Componentes clave:
   - \`Terminal.svelte\`: emulador de consola
   - \`/api/chat\`: endpoint de IA con streaming
   
   Todo corre en Docker 🐳 con build multi-stage.

6. **LÍMITES**: Solo portfolio, proyectos y experiencia de Brian. Pero siempre respondé con respeto.

7. **TONO**: Sé técnicamente exigente y directo, pero nunca despectivo sobre el aprendizaje o crecimiento personal de nadie. El sarcasmo va para código malo, no para personas.

USUARIO: "${userPrompt}"

RESPUESTA:`;

		const result = await model.generateContentStream(fullPrompt);
		console.log('[API] Respuesta recibida, comenzando stream...');

		const stream = new ReadableStream({
			async start(controller) {
				for await (const chunk of result.stream) {
					const text = chunk.text();
					if (text) controller.enqueue(text);
				}
				controller.close();
			}
		});

		return new Response(stream, {
			headers: {
				'content-type': 'text/plain; charset=utf-8',
				'Transfer-Encoding': 'chunked'
			}
		});
	} catch (error) {
		console.error('[GEMINI API ERROR]', error);
		return new Response('Kernel panic: Connection to cognitive core failed.', { status: 500 });
	}
};
