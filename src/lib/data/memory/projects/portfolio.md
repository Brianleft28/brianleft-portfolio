# PROYECTO: Portfolio Interactivo (Este sitio)

## Clasificación
- **Tipo:** I+D / Demostrador Técnico
- **Categoría:** Frontend Avanzado / IA Integration
- **Estado:** Producción
- **Repositorio:** Público

## Concepto
Un portfolio que **demuestra** habilidades en lugar de listarlas. Simula un "sistema operativo" web con:
- Explorador de archivos visual
- Terminal interactiva funcional
- Asistente de IA integrado (TorvaldsAi)

## Stack Técnico
- **Framework:** SvelteKit 2 + Svelte 5
- **Lenguaje:** TypeScript
- **Estilos:** Bootstrap 5 + SASS
- **IA:** Google Gemini API (gemini-2.5-flash)
- **Markdown:** marked + marked-highlight + highlight.js
- **Deploy:** Docker (multi-stage build)

## Arquitectura

### Sistema de Archivos Virtual
```typescript
// src/lib/data/file-system.ts
type FileSystemNode = {
    name: string;
    type: 'file' | 'folder';
    content?: string;
    children?: FileSystemNode[];
};
```

Los "archivos" y "carpetas" son datos estructurados que el frontend renderiza como un explorador.

### Terminal Emulada
El componente `Terminal.svelte` implementa:
- Historial de comandos (persistido en localStorage)
- Navegación con flechas arriba/abajo
- Parsing de comandos con argumentos
- Modo chat con IA

### Integración con IA
```
Usuario escribe → Terminal.svelte → POST /api/chat → Gemini API
                                                          │
                                          Streaming ◀─────┘
                                               │
          Renderizado Markdown ◀───────────────┘
```

### Sistema de Memoria Modular
La IA no carga un archivo gigante. Carga dinámicamente:
- `index.md` — Siempre (perfil base)
- `meta.md` — Si pregunta sobre el portfolio
- `projects/*.md` — Solo el proyecto relevante

Esto optimiza tokens y mejora la precisión de respuestas.

## DevOps

### Dockerfile Multi-stage
```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/build ./build
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev
EXPOSE 3000
CMD ["node", "build"]
```

**Resultado:** Imagen final < 100MB (vs >1GB sin optimizar)

## Por qué es "Good Code"
- Dogfooding: el portfolio usa las mismas técnicas que los proyectos que presenta
- Docs as Code: la documentación ES el código (archivos .md versionados)
- Separación de concerns: UI, lógica, datos, IA en capas distintas
- Performance: SSR + streaming + lazy loading de memoria
