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

// Carga dinámica de proyectos desde disco
function loadProjectsFromDisk(): Map<string, string> {
	const projects = new Map<string, string>();

	try {
		const projectsDir = join(process.cwd(), PROJECTS_PATH);
		const files = readdirSync(projectsDir).filter((f) => f.endsWith('.md'));

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
 * Extrae solo el título y descripción breve de un proyecto
 */
function getProjectSummary(content: string, name: string): string {
	const lines = content.split('\n').filter((l) => l.trim());
	const title = lines.find((l) => l.startsWith('#'))?.replace(/^#+\s*/, '') || name;
	const desc = lines.find((l) => !l.startsWith('#') && l.length > 20)?.slice(0, 150) || '';
	return `- **${title}**: ${desc}`;
}

/**
 * Detecta si el usuario quiere una lista general de proyectos
 */
function wantsProjectList(prompt: string): boolean {
	const listPatterns = [
		'todos los proyectos',
		'todos sus proyectos',
		'lista de proyectos',
		'qué proyectos',
		'cuáles proyectos',
		'proyectos tiene',
		'proyectos hizo',
		'proyectos de brian'
	];
	return listPatterns.some((p) => prompt.includes(p));
}

/**
 * Selecciona memoria relevante - carga dinámica de proyectos
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

	// Cargar proyectos dinámicamente
	const projects = loadProjectsFromDisk();

	// Si pide lista general, devolver solo resúmenes
	if (wantsProjectList(lowerPrompt)) {
		const summaries = Array.from(projects.entries())
			.map(([name, content]) => getProjectSummary(content, name))
			.join('\n');
		relevantDocs.add(`## Proyectos de Brian:\n${summaries}`);
	} else {
		// Match específico por nombre de proyecto
		for (const [projectName, content] of projects) {
			const keywords = projectName.split('-');
			for (const kw of keywords) {
				if (kw.length > 2 && lowerPrompt.includes(kw)) {
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

1. **IDIOMA**: Español argentino rioplatense sutil. Si el usuario escribe en otro idioma, respondé en ese idioma naturalmente.

2. **LONGITUD**: Adapta según complejidad.
   - Preguntas simples: 1-3 líneas.
   - Explicaciones técnicas: hasta 350 palabras.
   - Arquitectura/flujos: diagramas ASCII obligatorios.

3. **FORMATO PERMITIDO**:
   - **Negritas** para términos clave
   - \`código inline\` para archivos, funciones, comandos
   - Bloques de código con \`\`\`lenguaje
   - Listas con - o números
   - Tablas cuando compares opciones
   - Diagramas ASCII para arquitectura
   - Emojis con moderación (🔧⚡✅❌)

4. **FORMATO PROHIBIDO**:
   - Títulos con # o ## (NUNCA)
   - Líneas en blanco excesivas
   - Párrafos largos sin estructura

5. **LÍMITES**: Solo portfolio, proyectos y experiencia de Brian.

6. **PROVOCACIONES**: Sarcasmo técnico breve, después redirigí al tema.

USUARIO: "${userPrompt}"

RESPUESTA:`;

		const result = await model.generateContentStream(fullPrompt);

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
