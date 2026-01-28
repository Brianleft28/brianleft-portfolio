import { json, type RequestHandler } from '@sveltejs/kit';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '$env/dynamic/private';

const PROJECTS_PATH = 'src/lib/data/memory/projects';
const MEMORY_PATH = 'src/lib/data/memory/memory.md';
const FS_PATH = 'src/lib/data/file-system.ts';

export interface ProjectPayload {
	id: string;
	title: string;
	filename: string;
	content: string;
	targetPath: string[];
	createFolder: boolean;
	newFolderName?: string | null;
	fsEntry: {
		folderName?: string | null;
		readmeName: string;
		readmeContent: string;
	};
}

// Generar resumen con Gemini - formato estructurado
async function generateSummaryWithAI(title: string, content: string): Promise<string> {
	try {
		const apiKey = env.GEMINI_API_KEY;
		if (!apiKey) {
			console.warn('GEMINI_API_KEY no configurada, usando resumen básico');
			return `- **Tipo:** Proyecto Personal.\n- **Descripción:** ${content.split('\n').filter(l => l.trim() && !l.startsWith('!')).slice(0, 2).join(' ').slice(0, 200)}`;
		}

		const genAI = new GoogleGenerativeAI(apiKey);
		const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

		const prompt = `Sos un asistente técnico que documenta proyectos de software para un portfolio profesional.

Dado el proyecto "${title}", generá un resumen ESTRUCTURADO en Markdown siguiendo EXACTAMENTE este formato:

- **Tipo:** [Clasificación: Personal/Corporativo/Open Source/I+D/etc]
- **Descripción:** [Qué hace el proyecto en 1-2 oraciones]
- **Tech Stack:** [Tecnologías principales separadas por coma]
- **Características:** [2-3 puntos clave del proyecto, uno por línea con guión]

REGLAS:
- Usa negritas (**) para los labels
- Sé técnico y profesional
- Extrae las tecnologías del contenido (badges, código, etc)
- Si hay instalación/setup, menciona que es self-hosted o CLI
- NO incluyas el título del proyecto, solo los campos
- NO uses headers (#), solo bullets con guiones

Contenido del proyecto:
${content.slice(0, 4000)}`;

		const result = await model.generateContent(prompt);
		const summary = result.response.text().trim();
		
		return summary;
	} catch (error) {
		console.error('Error generando resumen con IA:', error);
		return `- **Tipo:** Proyecto.\n- **Descripción:** ${content.split('\n').filter(l => l.trim() && !l.startsWith('!')).slice(0, 2).join(' ').slice(0, 300)}`;
	}
}

export const POST: RequestHandler = async ({ request, locals }) => {
	// Verificar autenticación
	if (!locals.user?.authenticated) {
		return json({ error: 'No autorizado. Debe iniciar sesión.' }, { status: 401 });
	}

	try {
		const project: ProjectPayload = await request.json();

		if (!project.id || !project.title || !project.content) {
			return json({ error: 'Faltan campos requeridos: id, title, content' }, { status: 400 });
		}

		const safeFilename = project.filename
			? project.filename.replace(/[^a-zA-Z0-9-_.]/g, '')
			: `${project.id}.md`;

		// 1. Guardar archivo MD
		const projectFilePath = join(process.cwd(), PROJECTS_PATH, safeFilename);
		const dirPath = join(process.cwd(), PROJECTS_PATH);
		if (!existsSync(dirPath)) {
			mkdirSync(dirPath, { recursive: true });
		}
		writeFileSync(projectFilePath, project.content, 'utf-8');

		// 2. Generar resumen con IA
		const aiSummary = await generateSummaryWithAI(project.title, project.content);

		// 3. Actualizar memory.md con resumen IA
		const memoryUpdated = updateMemoryMd(project, safeFilename, aiSummary);

		// 4. Modificar file-system.ts
		const fileSystemUpdated = updateFileSystem(project);

		return json({
			success: true,
			message: `Proyecto "${project.title}" guardado correctamente`,
			details: {
				projectFile: `${PROJECTS_PATH}/${safeFilename}`,
				memoryUpdated,
				fileSystemUpdated,
				aiSummary
			}
		});
	} catch (error) {
		console.error('Error guardando proyecto:', error);
		return json({ error: `Error interno: ${error}` }, { status: 500 });
	}
};

function updateMemoryMd(project: ProjectPayload, filename: string, aiSummary: string): boolean {
	try {
		const memoryPath = join(process.cwd(), MEMORY_PATH);
		let memoryContent = readFileSync(memoryPath, 'utf-8');

		// Formato completo con resumen estructurado de IA
		const newEntry = `
### ${project.title}

${aiSummary}
- **Archivo fuente:** \`projects/${filename}\`
`;

		const contactSection = '## [DATOS DE CONTACTO]';
		if (memoryContent.includes(contactSection)) {
			memoryContent = memoryContent.replace(contactSection, newEntry + '\n' + contactSection);
			writeFileSync(memoryPath, memoryContent, 'utf-8');
			return true;
		}
		return false;
	} catch (error) {
		console.error('Error actualizando memory.md:', error);
		return false;
	}
}

function updateFileSystem(project: ProjectPayload): boolean {
	try {
		const fsPath = join(process.cwd(), FS_PATH);
		let fsContent = readFileSync(fsPath, 'utf-8');

		// Usar contenido completo, no recortado
		const fullContent = project.fsEntry?.readmeContent || project.content;
		const escapedContent = fullContent
			.replace(/\\/g, '\\\\')
			.replace(/`/g, '\\`')
			.replace(/\$/g, '\\$')
			.replace(/\n/g, '\\n');

		const targetFolderId = project.targetPath[project.targetPath.length - 1];
		let newEntry: string;

		if (project.createFolder && project.newFolderName) {
			const folderId = project.newFolderName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
			newEntry = `
				{
					id: '${folderId}',
					name: '${folderId}',
					type: 'folder',
					children: [
						{
							id: '${folderId}-readme',
							name: 'README.md',
							type: 'markdown',
							content: \`${escapedContent}\`
						}
					]
				},`;
		} else {
			newEntry = `
				{
					id: '${project.id}',
					name: '${project.filename || project.id + '.md'}',
					type: 'markdown',
					content: \`${escapedContent}\`
				},`;
		}

		// Buscar el folder específico por ID - regex más preciso
		// Busca: id: 'targetId' ... type: 'folder' ... children: [
		// Y captura hasta el primer [ del children
		const folderPattern = new RegExp(
			`(id:\\s*['"]${targetFolderId}['"],\\s*name:\\s*['"][^'"]+['"],\\s*type:\\s*['"]folder['"],\\s*children:\\s*\\[)`,
			's'
		);

		if (folderPattern.test(fsContent)) {
			fsContent = fsContent.replace(folderPattern, `$1${newEntry}`);
			writeFileSync(fsPath, fsContent, 'utf-8');
			return true;
		}

		// Fallback: insertar en 'proyectos'
		const proyectosPattern = /(id:\s*['"]proyectos['"],\s*name:\s*['"][^'"]+['"],\s*type:\s*['"]folder['"],\s*children:\s*\[)/s;
		if (proyectosPattern.test(fsContent)) {
			fsContent = fsContent.replace(proyectosPattern, `$1${newEntry}`);
			writeFileSync(fsPath, fsContent, 'utf-8');
			return true;
		}

		return false;
	} catch (error) {
		console.error('Error actualizando file-system.ts:', error);
		return false;
	}
}

export const GET: RequestHandler = async () => {
	return json({
		endpoint: '/api/projects',
		methods: ['POST'],
		description: 'API para agregar proyectos al portfolio (modifica archivos automáticamente)'
	});
};
