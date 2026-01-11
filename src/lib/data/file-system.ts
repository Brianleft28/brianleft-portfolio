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
                    id: 'print-server',
                    name: 'print-server',
                    type: 'folder',
                    children: [
                        {
                            id: 'print-readme',
                            name: 'README.md',
                            type: 'markdown',
                            content: printServerMemory
                        }
                    ]
                },
                {
                    id: 'sistema-electoral',
                    name: 'sistema-electoral',
                    type: 'folder',
                    children: [
                        {
                            id: 'electoral-readme',
                            name: 'README.md',
                            type: 'markdown',
                            content: electoralMemory
                        }
                    ]
                },
                {
                    id: 'portfolio',
                    name: 'portfolio',
                    type: 'folder',
                    children: [
                        {
                            id: 'portfolio-readme',
                            name: 'README.md',
                            type: 'markdown',
                            content: portfolioMemory
                        }
                    ]
                },
                {
                    id: 'migrador',
                    name: 'migrador-beneficiarios',
                    type: 'folder',
                    children: [
                        {
                            id: 'migrador-readme',
                            name: 'README.md',
                            type: 'markdown',
                            content: migradorMemory
                        }
                    ]
                },
                {
                    id: 'soren-mirror',
                    name: 'soren-mirror',
                    type: 'folder',
                    children: [
                        {
                            id: 'soren-readme',
                            name: 'README.md',
                            type: 'markdown',
                            content: sorenMirrorMemory
                        }
                    ]
                }
            ]
        },
        {
            id: 'docs',
            name: 'docs',
            type: 'folder',
            children: [
                {
                    id: 'doc-arquitectura',
                    name: 'arquitectura.md',
                    type: 'markdown',
                    content: arquitecturaDoc
                },
                {
                    id: 'doc-roadmap',
                    name: 'roadmap.md',
                    type: 'markdown',
                    content: roadmapDoc
                },
                {
                    id: 'doc-database',
                    name: 'database-schema.md',
                    type: 'markdown',
                    content: databaseSchemaDoc
                },
                {
                    id: 'doc-monorepo',
                    name: 'monorepo-setup.md',
                    type: 'markdown',
                    content: monorepoSetupDoc
                }
            ]
        },
        {
            id: 'perfil',
            name: 'perfil',
            type: 'folder',
            children: [
                {
                    id: 'perfil-index',
                    name: 'sobre-mi.md',
                    type: 'markdown',
                    content: indexMemory
                },
                {
                    id: 'perfil-meta',
                    name: 'como-funciona-esto.md',
                    type: 'markdown',
                    content: metaMemory
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
            content: `# Bienvenido al Portfolio de Brian Benegas

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