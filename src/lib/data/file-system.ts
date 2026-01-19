import type { Component } from 'svelte';

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
							content: `# Rutina Auth - CLI Testing Tool

## Descripción
Rutina en Node.js para automatizar la verificación masiva de credenciales contra una API externa.

## Stack
- Node.js 16+
- Axios (HTTP)
- Inquirer (CLI interactiva)
- Chalk (colores)
- cli-table3 (output)
- dotenv (config)

## Instalación
\`\`\`sh
git clone <repo>
cd auth_test
npm install
\`\`\`

## Configuración
Crear \`.env\`:
\`\`\`
API_URL=<url>
TIMEOUT=5000
\`\`\`

## Uso
\`\`\`sh
npm run check
\`\`\`

## Estructura de datos
Los JSON en \`src/data/\` deben tener formato:
\`\`\`json
[
  { "legajo": "7683", "password": "123456" }
]
\`\`\``
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
							content: `# Sistema de Gestión Electoral (Full-Stack)

Sistema de misión crítica diseñado para el cómputo, fiscalización y visualización de elecciones en tiempo real.

### 🚀 Stack Tecnológico
- **Frontend:** SvelteKit, TypeScript, Bootstrap, Socket.io-client
- **Backend:** NestJS, TypeORM, MySQL, WebSockets (Gateway)
- **Infraestructura:** Docker, Nginx, PM2

### ⚡ Características Clave
1. **Tiempo Real:** Actualización instantánea de resultados mediante WebSockets.
2. **Seguridad:** Autenticación JWT y Guards por roles (Admin/Fiscal).
3. **Resiliencia:** Manejo de desconexiones y validación de datos robusta con DTOs.`
						},
						{
							id: 'elec-backend',
							name: 'arquitectura-backend.md',
							type: 'markdown',
							content: `## Arquitectura Backend (NestJS)

El backend está construido siguiendo una arquitectura modular y escalable.

### Módulos Principales
- **AuthModule:** Gestión de usuarios y estrategias JWT (Passport).
- **VotosModule:** Lógica de negocio para el conteo y validación de sufragios.
- **EventsGateway:** Servidor de WebSockets para emitir eventos.

### Ejemplo de Código (WebSocket Gateway)
\`\`\`typescript
@WebSocketGateway({ cors: { origin: '*' } })
export class EventsGateway {
  @WebSocketServer() server: Server;

  notificarActualizacion() {
    this.server.emit('server:actualizar_dashboard');
  }
}
\`\`\``
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
									content: `# Lógica de Carga de Formularios

El sistema permite la carga rápida de mesas mediante un formulario optimizado para teclado.

### Validaciones
- Se verifica que la suma de votos coincida con el total de sobres.
- Se bloquean mesas ya cargadas para evitar duplicados.
- Feedback visual inmediato (Toasts) al confirmar la carga.`
								},
								{
									id: 'doc-export',
									name: 'exportacion-datos.md',
									type: 'markdown',
									content: `# Exportación a Excel

Utilizamos la librería \`exceljs\` en el frontend para generar reportes sin sobrecargar el servidor.

\`\`\`typescript
import ExcelJS from 'exceljs';

export const exportarResultados = async (data) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Resultados');
  // ... lógica de filas y columnas
};
\`\`\``
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
									content: `# Fork: Sistema de Elecciones Internas

## Descripción
Adaptación del sistema electoral principal para elecciones internas de partidos políticos.

## Diferencias Clave
- **Cargos:** Presidente PJ, secretarios, delegados partidarios
- **Estructura:** Listas internas compitiendo dentro del mismo partido
- **Circuitos:** Adaptados a la organización territorial del partido

## Reutilización
- ~80% del código base se mantiene intacto
- Módulos de auth, WebSockets y exportación sin cambios
- Solo se adaptan módulos de dominio

## Stack (heredado)
- Frontend: SvelteKit + Socket.io
- Backend: NestJS + MySQL
- Infraestructura: Docker + PM2`
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
\`\`\``
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
| Frontend | Svelte 5 |
| Estilos | Bootstrap 5  |
| IA | Google Gemini API |
| Deploy | Docker multi-stage |

### Características

- 🖥️ **Terminal interactiva** con comandos reales (\`cd\`, \`ll\`, \`cls\`)
- 🤖 **TorvaldsAi** - Asistente IA con personalidad de Linus Torvalds
- 📁 **Sistema de archivos virtual** - Navegá los proyectos como directorios
- ⚡ **Streaming de respuestas** - La IA responde en tiempo real

---

## ¿Querés saber más?

Escribí \`torvalds start\` en la terminal y preguntale lo que quieras.

---

*"Talk is cheap. Show me the code."* — Linus Torvalds`
		}
	]
};
