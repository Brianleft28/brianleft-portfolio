/**
 * MEMORIA CENTRALIZADA (Single Source of Truth)
 * 
 * Este módulo carga TODO el contenido de memoria del portfolio.
 * Tanto file-system.ts (UI) como api/chat (agente) consumen de acá.
 * 
 * Cuando migres a NestJS (Fase 4), este loader será reemplazado 
 * por llamadas a la API del servicio de proyectos.
 */

// Perfil / Meta
import indexMemory from './index.md?raw';
import metaMemory from './meta.md?raw';

// Proyectos
import printServerMemory from './projects/print-server.md?raw';
import electoralMemory from './projects/electoral.md?raw';
import portfolioMemory from './projects/portfolio.md?raw';
import migradorMemory from './projects/migrador.md?raw';
import sorenMirrorMemory from './projects/soren-mirror.md?raw';

// Docs técnicos
import arquitecturaDoc from '$lib/docs/arquitectura.md?raw';
import roadmapDoc from '$lib/docs/roadmap.MD?raw';
import databaseSchemaDoc from '$lib/docs/database-schema.MD?raw';
import monorepoSetupDoc from '$lib/docs/monorepo-setup.md?raw';

// === EXPORTS INDIVIDUALES (para imports selectivos) ===
export {
    // Perfil
    indexMemory,
    metaMemory,
    // Proyectos
    printServerMemory,
    electoralMemory,
    portfolioMemory,
    migradorMemory,
    sorenMirrorMemory,
    // Docs
    arquitecturaDoc,
    roadmapDoc,
    databaseSchemaDoc,
    monorepoSetupDoc
};

// === COLLECTIONS (para el agente/RAG) ===
export const projectMemories = {
    printServer: printServerMemory,
    electoral: electoralMemory,
    portfolio: portfolioMemory,
    migrador: migradorMemory,
    sorenMirror: sorenMirrorMemory
} as const;

export const profileMemories = {
    index: indexMemory,
    meta: metaMemory
} as const;

export const docsMemories = {
    arquitectura: arquitecturaDoc,
    roadmap: roadmapDoc,
    databaseSchema: databaseSchemaDoc,
    monorepoSetup: monorepoSetupDoc
} as const;

// === KEYWORD MATCHER (para el agente actual) ===
export const projectKeywords: Record<string, string> = {
    // Print Server
    print: printServerMemory,
    impresora: printServerMemory,
    imprimir: printServerMemory,
    zpl: printServerMemory,
    'esc-pos': printServerMemory,
    térmica: printServerMemory,
    spooler: printServerMemory,
    '.net': printServerMemory,
    // Electoral
    electoral: electoralMemory,
    voto: electoralMemory,
    elección: electoralMemory,
    elecciones: electoralMemory,
    fiscal: electoralMemory,
    gobierno: electoralMemory,
    concurrencia: electoralMemory,
    // Portfolio / Meta
    portfolio: portfolioMemory,
    terminal: metaMemory,
    torvalds: metaMemory,
    arquitectura: metaMemory,
    'cómo funciona': metaMemory,
    'este sitio': metaMemory,
    'esta web': metaMemory,
    // Migrador
    migrador: migradorMemory,
    migracion: migradorMemory,
    beneficiarios: migradorMemory,
    excel: migradorMemory,
    'datos sucios': migradorMemory,
    // Soren Mirror
    soren: sorenMirrorMemory,
    mirror: sorenMirrorMemory,
    exocorteza: sorenMirrorMemory,
    'segundo cerebro': sorenMirrorMemory,
    rag: sorenMirrorMemory,
    cerebro: sorenMirrorMemory,
    tdah: sorenMirrorMemory,
    neurodivergente: sorenMirrorMemory,
    cognitivo: sorenMirrorMemory
};

/**
 * Selecciona solo los módulos de memoria relevantes según el prompt.
 * Siempre incluye el perfil base (index.md) para contexto mínimo.
 */
export function getRelevantMemory(prompt: string): string {
    const lowerPrompt = prompt.toLowerCase();
    const relevantDocs = new Set<string>([indexMemory]);

    for (const [keyword, doc] of Object.entries(projectKeywords)) {
        if (lowerPrompt.includes(keyword)) {
            relevantDocs.add(doc);
        }
    }

    // Si no matcheó nada específico, incluir meta para contexto general
    if (relevantDocs.size === 1) {
        relevantDocs.add(metaMemory);
    }

    return Array.from(relevantDocs).join('\n\n---\n\n');
}
