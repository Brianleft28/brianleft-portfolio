import type { Component } from 'svelte';

// Memoria centralizada (Single Source of Truth)
// Cuando migres a NestJS (Fase 4), esto se reemplaza por fetch a la API
import {
    indexMemory,
    metaMemory,
    printServerMemory,
    electoralMemory,
    portfolioMemory,
    migradorMemory,
    sorenMirrorMemory,
    arquitecturaDoc,
    roadmapDoc,
    databaseSchemaDoc,
    monorepoSetupDoc
} from '$lib/data/memory/loader';


export type FileType = 'markdown' | 'component';

export type FileNode = {
	id: string;
	name: string;
	type: FileType;
	content?: string;
	component?: Component;
	isActive?: boolean;
};

export type FolderNode = {
	id: string;
	name: string;
	type: 'folder';
	children: FileSystemNode[];
};

export type FileSystemNode = FolderNode | FileNode;
export const fileSystemData: FolderNode = {
	id: 'root',
	type: 'folder',
	name: 'C:\\',
	children: [
		{
			id: 'proyectos',
			name: 'proyectos',
			type: 'folder',
			children: [
				{
					id: 'rutina-auth',
					name: 'rutina-auth',
					type: 'folder',
					children: [
						{
							id: 'rutina-auth-readme',
							name: 'README.md',
							type: 'markdown',
							content: `![Node.js](https://img.shields.io/badge/Node.js-16.13.0-green)\n![Axios](https://img.shields.io/badge/Axios-^1.7.7-blue)\n![Chalk](https://img.shields.io/badge/Chalk-^5.3.0-brightgreen)\n![cli-table3](https://img.shields.io/badge/cli--table3-^0.6.5-orange)\n![dotenv](https://img.shields.io/badge/dotenv-^16.4.5-yellow)\n![Inquirer](https://img.shields.io/badge/Inquirer-^9.1.4-purple)\n\n--- \n## Instalación\n1. Clona el repositorio:\n\`\`\`sh\n  git clone \n\`\`\`\n2. Navega al directorio del projecto:\n\`\`\`sh\n  cd auth_test\n\`\`\`\n3. Instala las dependencias\n\`\`\`sh\n  npm install\n\`\`\`\n4. Crear un archivo \`.env\` en el directorio raíz del projecto con las siguientes variables\n\`\`\`sh\nAPI_URL=\nTIMEOUT=5000\n\`\`\`\n5. Para comenzar la rutina, ejecute el siguiente comando:\n\`\`\`sh\nnpm run check\n\`\`\`\n--- \n\n### Estructura de Datos\nLos archivos \`JSON\` que se listan en la opción para verificar permisos y legajos, se encuentran dentro de \`src/data\`. Los mismos deben estar en formato \`JSON\` y cumplir con el formato: \n\n\`\`\`json\n[\n    {\n        "legajo" : "7683",\n        "password": "123456"\n    },\n    {\n        "legajo": "1234",\n        "password": "123456"\n    }\n] \n\`\`\`\n\n--- \n---\n\n## Notas adicionales\n- Asegurarse de que el archivo .env esté correctamente configurado en el directorio raíz del proyecto.\n- Verifica que el directorio \`src/data\` contenga el archivo \`JSON\` con los usuarios a verificar.`
						}
					]
				},
				{
					id: 'sys-elecciones',
					name: 'sistema-elecciones',
					type: 'folder',
					children: [
						{
							id: 'elec-readme',
							name: 'LEEME.md',
							type: 'markdown',
							content: `# Sistema de Gestión Electoral (Full-Stack)\n\nSistema de misión crítica diseñado para el cómputo, fiscalización y visualización de elecciones en tiempo real.\n\n### 🚀 Stack Tecnológico\n- **Frontend:** SvelteKit, TypeScript, Bootstrap, Socket.io-client [cite: 9]\n- **Backend:** NestJS, TypeORM, MySQL, WebSockets (Gateway)\n- **Infraestructura:** Docker, Nginx, PM2 [cite: 7]\n\n### ⚡ Características Clave\n1. **Tiempo Real:** Actualización instantánea de resultados mediante WebSockets.\n2. **Seguridad:** Autenticación JWT y Guards por roles (Admin/Fiscal).\n3. **Resiliencia:** Manejo de desconexiones y validación de datos robusta con DTOs.`
						},
						{
							id: 'elec-backend',
							name: 'arquitectura-backend.md',
							type: 'markdown',
							content: `## Arquitectura Backend (NestJS)\n\nEl backend está construido siguiendo una arquitectura modular y escalable.\n\n### Módulos Principales\n- **AuthModule:** Gestión de usuarios y estrategias JWT (Passport).\n- **VotosModule:** Lógica de negocio para el conteo y validación de sufragios.\n- **EventsGateway:** Servidor de WebSockets para emitir eventos \`server:actualizar_dashboard\` a los clientes conectados.\n\n### Ejemplo de Código (WebSocket Gateway)\n\`\`\`typescript\n@WebSocketGateway({ cors: { origin: '*' } })\nexport class EventsGateway {\n  @WebSocketServer() server: Server;\n\n  notificarActualizacion() {\n    this.server.emit('server:actualizar_dashboard');\n  }\n}\n\`\`\``
						},
						{
							id: 'elec-docs',
							name: 'documentacion',
							type: 'folder', 
							children: [
								{
									id: 'doc-carga',
									name: 'carga-formularios.md',
									type: 'markdown',
									content: `# Lógica de Carga de Formularios\n\nEl sistema permite la carga rápida de mesas mediante un formulario optimizado para teclado.\n\n### Validaciones\n- Se verifica que la suma de votos coincida con el total de sobres.\n- Se bloquean mesas ya cargadas para evitar duplicados.\n- Feedback visual inmediato (Toasts) al confirmar la carga. [cite: 14, 22]`
								},
								{
									id: 'doc-export',
									name: 'exportacion-datos.md',
									type: 'markdown',
									content: `# Exportación a Excel\n\nUtilizamos la librería \`exceljs\` en el frontend para generar reportes sin sobrecargar el servidor.\n\n\`\`\`typescript\n// src/lib/logic/export-excel.ts\nimport ExcelJS from 'exceljs';\n\nexport const exportarResultados = async (data) => {\n  const workbook = new ExcelJS.Workbook();\n  const sheet = workbook.addWorksheet('Resultados');\n  // ... lógica de filas y columnas\n};\n\`\`\`\n`
								}
							]
						},
						{
							id: 'elec-fork',
							name: 'fork-internas',
							type: 'folder',
							children: [
								{
									id: 'fork-readme',
									name: 'README.md',
									type: 'markdown',
									content: `# Fork: Sistema de Elecciones Internas\n\n## Descripción\nAdaptación del sistema electoral principal para elecciones internas de partidos políticos.\n\n## Diferencias Clave\n- **Cargos:** Presidente PJ, secretarios, delegados partidarios\n- **Estructura:** Listas internas compitiendo dentro del mismo partido\n- **Circuitos:** Adaptados a la organización territorial del partido\n\n## Reutilización\n- ~80% del código base se mantiene intacto\n- Módulos de auth, WebSockets y exportación sin cambios\n- Solo se adaptan módulos de dominio\n\n## Stack (heredado)\n- Frontend: SvelteKit + Socket.io\n- Backend: NestJS + MySQL\n- Infraestructura: Docker + PM2`
								}
							]
						}
	]
},
{
			id: 'migracion-fortalecimiento',
			name: 'migracion-fortalecimiento',
							type: 'folder',
							children: [
								{
									id: 'migrador-readme',
									name: 'README.md',
									type: 'markdown',
									content: `# Migrador de Beneficiarios - Desarrollo Social

## Navegación

Explorá usando:
- **Explorador de Archivos** → Panel izquierdo
- **Terminal** → \`Ctrl + Ñ\` (comandos: \`cd\`, \`ls\`, \`cat\`)

## Estructura

\`\`\`
C:\\
├── proyectos/          # Mis proyectos reales
│   |
├── docs/               # Arquitectura y roadmap
├── perfil/             # Sobre mí
└── apps/     
	|Contacto.exe 	          		# Componentes interactivos
\`\`\`

## ¿Querés hablar con mi IA?

Escribí \`torvalds start\` en la terminal y preguntale lo que quieras.

---

*"Talk is cheap. Show me the code."* — Linus Torvalds`
        }
    ]
};