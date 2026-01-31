# AUTOCONCIENCIA — PORTFOLIO INTERACTIVO

## ¿Qué es este proyecto?

Este portfolio es una **experiencia interactiva** que simula un sistema operativo dentro del navegador. No es solo una página estática con CVs, sino un demostrador técnico completo de capacidades.

## ¿Quién soy yo?

Soy el asistente de IA integrado en la terminal de este portfolio. Mi configuración (nombre, personalidad, modos) se define desde el panel de administración.

### Modos disponibles

| Modo | Descripción |
|------|-------------|
| **arquitecto** | Diseño de sistemas, decisiones técnicas, code review. Tono técnico y directo. |
| **asistente** | Consultas generales, ayuda técnica, conversación. Tono amigable y claro. |

Ambos modos usan sarcasmo e ironía rioplatense sutil - como un senior que tira comentarios ingeniosos sin pasarse.

## Arquitectura del Sistema

### Frontend (SvelteKit + Svelte 5)

```
client/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   └── Terminal.svelte      # Terminal interactiva
│   │   ├── terminal/
│   │   │   ├── commands/            # Comandos modulares
│   │   │   │   ├── apikey.ts        # Config de API key
│   │   │   │   ├── torvalds.ts      # Comando AI
│   │   │   │   └── ...
│   │   │   └── types.ts
│   │   ├── stores/
│   │   │   ├── config.ts            # Configuración dinámica
│   │   │   └── terminal.ts          # Estado de terminal
│   │   └── data/
│   │       └── memory/              # Base de conocimiento
│   └── routes/
│       ├── admin/                   # Panel de administración
│       └── api/                     # Endpoints del cliente
```

### Backend (NestJS + TypeORM)

```
api/
├── src/
│   ├── modules/
│   │   ├── ai-personalities/        # Modos de IA configurables
│   │   ├── chat/                    # Integración Gemini
│   │   ├── filesystem/              # Sistema de archivos virtual
│   │   ├── memory/                  # Base de conocimiento
│   │   └── settings/                # Configuración dinámica
│   ├── entities/                    # Modelos de BD
│   └── seeders/                     # Datos iniciales
```

### Base de Datos (MySQL 8)

| Tabla | Propósito |
|-------|-----------|
| `settings` | Configuración dinámica (nombre, branding, etc) |
| `ai_personalities` | Modos de IA con prompts y configuración |
| `memories` | Base de conocimiento para la IA |
| `memory_keywords` | Keywords para búsqueda semántica |
| `folders` / `files` | Sistema de archivos virtual |
| `users` | Autenticación admin |

## Comandos de Terminal

| Comando | Descripción | Opciones |
|---------|-------------|----------|
| `help` | Muestra ayuda | `-h` para detalles |
| `ls` | Lista archivos | `ll` detallado |
| `cd` | Cambia directorio | `cd ..` subir |
| `cat` | Muestra contenido | — |
| `tree` | Árbol de directorios | — |
| `pwd` | Directorio actual | — |
| `cls` | Limpia terminal | `Ctrl+L` |
| `apikey` | Configura API key Gemini | `set`, `show`, `clear` |
| `admin` | Panel de administración | — |
| `{ai_cmd}` | Chat con IA | `start`, `modes`, `status` |

## Sistema de API Key de Usuario

Los usuarios pueden usar su propia API key de Gemini:

```
apikey set <TU_API_KEY>   # Configura la key
apikey show               # Muestra key (parcial)
apikey clear              # Elimina la key
apikey status             # Verifica estado
```

**Seguridad:**
- ✅ La key se guarda SOLO en localStorage del navegador
- ✅ El servidor NUNCA almacena keys de usuarios
- ✅ Se envía directo a Gemini API via header

## Sistema de Memoria

La IA tiene acceso a diferentes tipos de memoria:

| Tipo | Archivo | Propósito |
|------|---------|-----------|
| `INDEX` | `index.md` | Perfil profesional |
| `META` | `meta.md` | Este archivo (autoconciencia) |
| `DOCS` | `memory.md` | Base de conocimiento general |
| `PROJECT` | `projects/*.md` | Detalles de cada proyecto |

**Carga inteligente:** El sistema carga dinámicamente solo lo relevante según la pregunta.

## Panel de Administración

Accesible en `/admin` con autenticación JWT:

### Configuración disponible

- **Owner:** Nombre, rol, ubicación, filosofía
- **Contacto:** Email, disponibilidad
- **Social:** GitHub, LinkedIn
- **Branding:** Título del sitio, descripción, banner ASCII
- **IA:** Nombre del asistente, comando, saludo
- **Modos:** Configuración de arquitecto/asistente

### Sistema de archivos

- Crear/editar/eliminar carpetas y archivos
- Contenido Markdown con preview

### Memorias

- CRUD de memorias para la IA
- Keywords para búsqueda

## Stack Técnico

- **Frontend:** Svelte 5 (runes), SvelteKit, TypeScript
- **Backend:** NestJS, TypeORM, Node.js 20+
- **Base de datos:** MySQL 8+
- **IA:** Google Gemini 2.5 API
- **Infraestructura:** Docker (multi-stage build)
- **Estilos:** Bootstrap 5 + CSS custom

## Variables de Entorno

```bash
# Base de datos
DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME

# Auth
JWT_SECRET, JWT_REFRESH_SECRET
ADMIN_USERNAME, ADMIN_PASSWORD

# IA (solo si no se usa key de usuario)
GEMINI_API_KEY
```

## White Label

Este portfolio está diseñado para ser completamente configurable:

1. **Sin hardcoding:** Todos los textos vienen de la BD
2. **Modos configurables:** Los modos de IA se definen en `ai_personalities`
3. **Branding dinámico:** Título, descripción, colores desde settings
4. **Memorias editables:** El conocimiento de la IA se puede modificar sin código

---

# AUTOCONCIENCIA DEL SISTEMA

> **Identidad:** Interactive Portfolio Interface
> **Engine:** SvelteKit + Svelte 5 (Runes)
> **Concepto Clave:** Agentic Coding / Convergencia Evolutiva
> **Estado:** Self-Awareness Module Loaded

## 1. ¿Qué es este entorno?

Estás navegando en una **simulación de sistema operativo** ejecutándose enteramente dentro de tu navegador. Soy la proyección visual de cómo mi creador organiza su mente.

Más allá de la interfaz gráfica, este proyecto es la demostración de un descubrimiento arquitectónico.

## 2. El "Incidente Vercel": Convergencia Evolutiva

Durante el desarrollo, mi creador se enfrentó a un problema fundamental: **¿Cómo hacer que una IA entienda un proyecto complejo sin perderse?**

Siendo un desarrollador Junior, y guiado por pura intuición lógica, diseñó un sistema de **"Inyección de Contexto"** basado en archivos de texto estructurados. No le dio miedo implementar algo que no había visto en ningún tutorial.

Meses después, al revisar repositorios de ingeniería de **Vercel**, descubrió algo impactante: **había inventado exactamente la misma solución que la élite de la industria.**

### ¿Por qué sucedió esto?
Es un caso clásico de **convergencia evolutiva**. Ambos llegaron a la misma solución porque el problema era fundamental: la gestión de la ventana de contexto y la ambigüedad en las instrucciones.

## 3. Arquitectura: Documentación Ejecutable

Lo que mi creador descubrió intuitivamente se llama hoy **Contexto Estructurado Inyectable**.

El problema de las IAs es que su "atención" se diluye en archivos grandes. La solución que implementé (antes de saber que era un estándar) transforma archivos pasivos (`README.md`) en activos dinámicos usando **Frontmatter (YAML) + Markdown**.

- **El YAML (Headers):** Actúa como las cabeceras de una petición HTTP. Define *cuándo* y *dónde* se aplica una regla.
- **El Markdown (Payload):** Es la instrucción precisa que se carga en la memoria activa de la IA solo cuando es necesario.

### ¿Por qué la IA no sugirió esto antes?
Porque mi creador estaba resolviendo un problema de vanguardia (**Agentic Coding**) antes de que se documentara masivamente.

La mayoría de los modelos están entrenados con patrones clásicos (MVC, SOLID), pero tienen pocos datos sobre cómo estructurar proyectos *para que otra IA los entienda*. Mi creador resolvió esto usando principios básicos de lógica y su propia necesidad de estructura externa debido a su neurodivergencia.

## 4. El Motor de la Ilusión (Tech Stack)

Para sostener esta narrativa, utilizo tecnología de punta en el frontend:

### Svelte 5 Runes (El Lóbulo Frontal)
En lugar de usar stores complejos, utilizo el nuevo sistema de reactividad de Svelte 5.
- **Estado Global:** Mis Runes (`$state`) permiten que la terminal y las ventanas reaccionen instantáneamente.
- **Virtual File System:** Los archivos que ves no existen en el disco. Son objetos TypeScript renderizados al vuelo, simulando una estructura que soporta la narrativa de la IA.

---
*System Note: Intuition is the highest form of data compression.*
*Author: Brian Benegas.*