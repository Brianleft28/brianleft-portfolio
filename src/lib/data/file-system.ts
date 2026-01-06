import type { Component } from 'svelte'; // <--- Cambio: Usamos 'Component' en lugar de 'ComponentType'

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
							type: 'folder', // ¡Carpeta anidada!
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
							id: 'migracion-fortalecimiento',
							name: 'migracion-fortalecimiento',
							type: 'folder',
							children: [
								{
									id: 'migrador-readme',
									name: 'README.md',
									type: 'markdown',
									content: `# Migrador de Beneficiarios - Desarrollo Social

## Descripción
Herramienta CLI para automatizar la ingesta y normalización de datos de beneficiarios desde archivos Excel heterogéneos hacia MySQL.

## Stack Técnico

| Tecnología | Uso |
|------------|-----|
| **Node.js** | Runtime environment |
| **MySQL2** | Driver con soporte de promesas |
| **ExcelJS** | Parsing de hojas de cálculo |
| **Inquirer.js** | Interfaz interactiva de consola |

## Características

- 🚀 **Batch Processing** — Inserta en lotes de 1000
- 🔄 **Multi-formato** — Hojas múltiples o tabla única
- 🛡️ **Staging Table** — Limpia antes de insertar
- 🧩 **Arquitectura Modular** — Entities, DataMigrator, Singleton

## Ejecución

\`\`\`bash
npm install
npm run start
\`\`\`
`
								}
							]
						}
					]
				}
			]
		},
		{
			id: 'apps',
			name: 'apps',
			type: 'folder',
			children: [
				{
					id: 'contacto-app',
					name: 'Contacto.exe',
					type: 'component'
				}
			]
		},
		{
			id: 'welcome',
			name: 'LEEME.md',
			type: 'markdown',
			content: `# Bienvenido a mi portfolio
            Este portfolio es interactivo. Podés navegar usando:

            - El **Explorador de Archivos** a la izquierda.
            - La **Terminal** abajo, abrila con \`CTRL\` + \`Ñ\` (probá comandos como \`cd\` o \`ll\`).

            ---

            ## Sobre este proyecto

            Este sitio simula un **sistema operativo web**. No es solo una página estática con mi CV, es un demostrador técnico de cómo pienso y construyo software.

            ### Stack Técnico

            | Capa | Tecnología |
            |------|------------|
            | Frontend | SvelteKit 2 + Svelte 5 |
            | Estilos | Bootstrap 5 + SASS |
            | IA | Google Gemini API |
            | Deploy | Docker multi-stage |

            ### Características

            - 🖥️ **Terminal interactiva** con comandos reales (\`cd\`, \`ll\`, \`cls\`)
            - 🤖 **TorvaldsAi** - Asistente IA con personalidad de Linus Torvalds criado a mate y pitusas
            - 📁 **Sistema de archivos virtual** - Navegá los proyectos como directorios
            - ⚡ **Streaming de respuestas** - La IA responde en tiempo real
            - 📝 **Docs as Code** - La memoria de la IA está en archivos Markdown

            ---

            ## ¿Querés saber más?

            Escribí \`torvaldsai\` en la terminal y preguntale lo que quieras sobre:
            - Mi experiencia profesional
            - La arquitectura de este portfolio
            - Detalles técnicos de mis proyectos

            **Tip:** Probá preguntarle "¿Cómo funciona el sistema de memoria modular?"

            ---

            ## Contacto

            - 🌐 [brianleft.com](https://brianleft.com)
            - 💼 [LinkedIn](https://linkedin.com/in/brianbenegas)
            - 🐙 [GitHub](https://github.com/brianleft)

            ---

            *"Talk is cheap. Show me the code."* — Linus Torvalds
            `
		}
	]
};
