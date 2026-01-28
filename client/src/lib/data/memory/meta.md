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

Última actualización: Enero 2026
