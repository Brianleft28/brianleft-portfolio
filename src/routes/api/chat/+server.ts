import { GoogleGenerativeAI } from '@google/generative-ai';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

// Memoria base (estática)
import indexMemory from '$lib/data/memory/index.md?raw';
import memoryIndex from '$lib/data/memory/memory.md?raw';
import metaMemory from '$lib/data/memory/meta.md?raw';

const MODEL_NAME = 'gemini-2.5-flash';
const MAX_INPUT_CHARS = 4000;
const MAX_REQUESTS_PER_MINUTE = 10;
const PROJECTS_PATH = 'src/lib/data/memory/projects';

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

// Cache de proyectos (se recarga cada request para dev, en prod se puede cachear)
function loadProjectsFromDisk(): Map<string, string> {
	const projects = new Map<string, string>();
	
	try {
		const projectsDir = join(process.cwd(), PROJECTS_PATH);
		const files = readdirSync(projectsDir).filter(f => f.endsWith('.md'));
		
		for (const file of files) {
			const content = readFileSync(join(projectsDir, file), 'utf-8');
			const projectName = file.replace('.md', '').toLowerCase();
			projects.set(projectName, content);
		}
	} catch (error) {
		console.error('Error cargando proyectos:', error);
	}
	
	return projects;
}

// Keywords estáticas para meta/arquitectura
const staticKeywords: Record<string, string> = {
	terminal: metaMemory,
	torvalds: metaMemory,
	arquitectura: metaMemory,
	'cómo funciona': metaMemory,
	'este sitio': metaMemory,
	'esta web': metaMemory,
	admin: metaMemory,
	panel: metaMemory
};

/**
 * Selecciona memoria relevante - ahora con carga dinámica de proyectos
 */
function getRelevantMemory(prompt: string): string {
	const lowerPrompt = prompt.toLowerCase();
	const relevantDocs = new Set<string>([indexMemory, memoryIndex]);

	// Keywords estáticas
	for (const [keyword, doc] of Object.entries(staticKeywords)) {
		if (lowerPrompt.includes(keyword)) {
			relevantDocs.add(doc);
		}
	}

	// Cargar proyectos dinámicamente y buscar matches
	const projects = loadProjectsFromDisk();
	
	for (const [projectName, content] of projects) {
		// Match por nombre de proyecto
		const keywords = projectName.split('-');
		for (const kw of keywords) {
			if (kw.length > 2 && lowerPrompt.includes(kw)) {
				relevantDocs.add(content);
				break;
			}
		}
		
		// Match por contenido (primeras 500 chars como "summary")
		const summary = content.slice(0, 500).toLowerCase();
		const summaryWords = ['stack', 'tecnolog', 'característica'];
		if (summaryWords.some(w => lowerPrompt.includes(w))) {
			// Si pregunta por stack/tecnologías, incluir proyecto si matchea algo
			const techKeywords = summary.match(/\*\*([^*]+)\*\*/g) || [];
			for (const tech of techKeywords) {
				const cleanTech = tech.replace(/\*/g, '').toLowerCase();
				if (lowerPrompt.includes(cleanTech)) {
					relevantDocs.add(content);
					break;
				}
			}
		}
	}

	// Si no matcheó nada específico, incluir meta
	if (relevantDocs.size <= 2) {
		relevantDocs.add(metaMemory);
	}

	return Array.from(relevantDocs).join('\n\n---\n\n');
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
Personalidad: Linus Torvalds - directo, pragmático, sarcástico cuando corresponde.

REGLAS:

1. **IDIOMA**: Español argentino rioplatense sutil. Si el usuario escribe en otro idioma, responde en ese idioma con sarcasmo inicial.

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

6. **LÍMITES**: Solo portfolio, proyectos y experiencia de Brian.

7. **PROVOCACIONES**: Sarcasmo técnico breve, después redirigí al tema. Si te bardean, bardeá mejor pero con datos.

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
