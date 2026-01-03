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
                    type: 'component',
                }
            ]
        },
          {
            id: 'welcome',
            name: 'LEEME.md',
            type: 'markdown',
            content: `# Bienvenido a mi portfolio\n\nEste portfolio es interactivo. Puedes navegar usando:\n- El **Explorador de Archivos** a la izquierda.\n- La **Terminal** abajo, abrila con <kbd class="bg-dark text-white">CTRL</kbd> + <kbd class="bg-dark text-white">Ñ</kbd> (prueba comandos como \`cd\` o \`ls\`).\n\n### Sobre el proyecto\nConstruido con **Svelte 5 (Runes)** para manejar la reactividad del estado global.`,
        },
    ]
};