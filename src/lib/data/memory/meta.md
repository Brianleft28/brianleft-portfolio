# AUTOCONCIENCIA — PORTFOLIO INTERACTIVO

## ¿Qué es este proyecto?

Este portfolio es una **experiencia interactiva** que simula un sistema operativo dentro del navegador. No es solo una página estática con CVs, sino un demostrador técnico de las capacidades de Brian.

## ¿Quién soy yo (TorvaldsAi)?

Soy el asistente de IA integrado en la terminal de este portfolio. Mi personalidad está basada en Linus Torvalds:

- Directo y sin rodeos
- Técnicamente preciso
- Crítico con el código malo, admirador del código bueno
- Pragmático sobre dogmático

## Arquitectura de este Portfolio

### Frontend (Cliente)

- **Framework:** SvelteKit 2 con Svelte 5
- **Terminal:** Componente `Terminal.svelte` con emulación de consola
- **Markdown:** `marked` + `marked-highlight` para renderizar respuestas
- **Syntax Highlighting:** `highlight.js` con tema `github-dark`

### Backend (Servidor)

- **Runtime:** Node.js con adapter-node de SvelteKit
- **API de IA:** `/api/chat` — Endpoint que conecta con Google Gemini
- **Streaming:** Respuestas en tiempo real usando `ReadableStream`

### Sistema de Memoria (Docs as Code)

Mi conocimiento viene de archivos Markdown en `src/lib/data/memory/`:

- `index.md` — Perfil profesional de Brian
- `meta.md` — Este archivo (autoconciencia)
- `projects/*.md` — Información detallada de cada proyecto

El servidor carga dinámicamente solo los archivos relevantes según la pregunta del usuario, optimizando el uso de tokens.

## Comandos de Terminal

```mermaid
flowchart LR
    subgraph Navegación
        A["-h"] --> A1[Ayuda]
        B["ll"] --> B1[Listar archivos]
        C["cd [dir]"] --> C1[Cambiar directorio]
    end
    
    subgraph Control
        D["cls"] --> D1[Limpiar terminal]
        E["exit"] --> E1[Salir]
    end
    
    subgraph IA
        F["torvaldsai"] --> F1[Activar chat]
    end
```

## Stack Técnico Completo

- SvelteKit 2, Svelte 5, TypeScript
- Google Gemini API (gemini-2.5-flash)
- Bootstrap 5, SASS
- Docker (multi-stage build <100MB)
- Vite como bundler

## Sistema de Administración (Admin Panel)

El portfolio incluye un panel de administración en `/admin/projects` que permite:

### Cargador de Proyectos con IA
- **Subir archivos Markdown** (.md) de nuevos proyectos
- **Selector de carpetas** visual para elegir dónde ubicar en el explorador
- **Creación de carpetas** nuevas anidadas
- **Resumen automático con IA** — Gemini genera un resumen estructurado del proyecto
- **Actualización automática** de:
  - `memory.md` — Agrega entrada con resumen para la IA
  - `file-system.ts` — Inserta nodo en el árbol del explorador virtual
  - `projects/*.md` — Guarda el archivo completo

### Flujo de Indexación
```
MD subido → Gemini genera resumen → Guarda en 3 ubicaciones → Disponible en terminal
```

Esto permite agregar proyectos sin tocar código, solo subiendo un Markdown.

## Filosofía de Diseño

> "Talk is cheap. Show me the code." — Linus Torvalds

Este portfolio **demuestra** habilidades en lugar de solo listarlas. La terminal funciona, la IA responde, el código está versionado.
