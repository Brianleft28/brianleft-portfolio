# 📚 Documentación Técnica - Portfolio Interactivo

> **Última actualización:** 21 de Enero 2026  
> **Versión:** 2.0.0 (Migración a Multi-Container)  
> **Branch:** `feat/scaffolding`

---

## 📋 Índice

1. [Resumen del Proyecto](#resumen-del-proyecto)
2. [Arquitectura](#arquitectura)
3. [Stack Tecnológico](#stack-tecnológico)
4. [Estado de Implementación](#estado-de-implementación)
5. [Base de Datos](#base-de-datos)
6. [API REST (NestJS)](#api-rest-nestjs)
7. [Sistema de Parametrización](#sistema-de-parametrización)
8. [Terminal y Comandos](#terminal-y-comandos)
9. [Roadmap](#roadmap)
10. [Guía de Desarrollo](#guía-de-desarrollo)

---

## Resumen del Proyecto

Portfolio interactivo que simula un "Sistema Operativo" web con:
- **Terminal funcional** con comandos Unix-like
- **Asistente IA** integrado con Google Gemini
- **Sistema de archivos virtual** navegable
- **100% parametrizable** para reventa/personalización

### Objetivos de la Migración v2.0

| Antes (Monolito) | Después (Multi-Container) |
|------------------|---------------------------|
| SvelteKit todo-en-uno | SvelteKit (Client) + NestJS (API) |
| Sin DB persistente | MySQL 8 + Redis |
| Memoria en archivos .md | Memoria en DB con RAG |
| Hardcoded owner info | Parametrizable via Settings |
| Sin autenticación robusta | JWT + Refresh Tokens |

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Docker Compose                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐               │
│  │   Client     │    │     API      │    │      DB      │               │
│  │  (SvelteKit) │───▶│   (NestJS)   │───▶│   (MySQL 8)  │               │
│  │   :3000      │    │    :4000     │    │    :3306     │               │
│  └──────────────┘    └──────┬───────┘    └──────────────┘               │
│                             │                                            │
│                             ▼                                            │
│                      ┌──────────────┐                                   │
│                      │    Redis     │                                   │
│                      │    :6379     │                                   │
│                      └──────────────┘                                   │
│                                                                          │
│  Volumes: mysql_data, redis_data, uploads-data                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Flujo de Datos

```
Usuario → Terminal → Comando → API NestJS → MySQL/Redis → Respuesta
                         │
                         └── torvalds → Gemini API (con contexto de Memory)
```

---

## Stack Tecnológico

### Frontend (Client)
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| SvelteKit | 2.x | Framework SSR |
| Svelte | 5.x | UI reactiva |
| TypeScript | 5.x | Tipado |
| Bootstrap | 5.x | Estilos base |
| marked | latest | Renderizado Markdown |
| highlight.js | latest | Syntax highlighting |

### Backend (API)
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| NestJS | 10.x | Framework API |
| TypeORM | 0.3.x | ORM para MySQL |
| Passport | latest | Autenticación |
| JWT | latest | Tokens de sesión |
| @nestjs/throttler | latest | Rate limiting |
| Multer | latest | Upload de archivos |

### Infraestructura
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Docker | latest | Containerización |
| MySQL | 8.0 | Base de datos principal |
| Redis | 7.x | Cache y sesiones |
| Nginx | (prod) | Reverse proxy |

---

## Estado de Implementación

### ✅ Completado

| Componente | Descripción | Archivos Clave |
|------------|-------------|----------------|
| **Docker Infrastructure** | Compose con 4 servicios | `docker-compose.yml` |
| **NestJS API Base** | Configuración, TypeORM, JWT | `api/src/app.module.ts` |
| **Autenticación** | Login, Refresh, Guards | `api/src/modules/auth/` |
| **Entidades DB** | User, Memory, Setting, etc. | `api/src/entities/` |
| **Memory Module** | CRUD + RAG con keywords | `api/src/modules/memory/` |
| **Parametrización** | Placeholders `{{variable}}` | `api/src/modules/memory/memory.service.ts` |
| **Keywords con IA** | Generación automática Gemini | `api/src/scripts/generate-keywords.ts` |
| **Uploads Module** | Subida de CV (PDF) | `api/src/modules/uploads/` |
| **Comando CV** | Descarga desde terminal | `client/src/lib/terminal/commands/cv.ts` |
| **Seeders** | Settings, Memories, Personalities | `api/src/seeders/` |

### 🚧 En Progreso

| Componente | Estado | Notas |
|------------|--------|-------|
| **Admin Panel** | Pendiente | Necesita UI para settings/uploads |
| **Client Build** | Pendiente | Dockerfile cliente no probado |

### 📋 Pendiente

| Componente | Prioridad | Descripción |
|------------|-----------|-------------|
| `/admin/settings` | Alta | UI para editar settings |
| `/admin/uploads` | Alta | UI para subir CV |
| `/admin/memories` | Media | CRUD de memorias |
| Chat Streaming | Media | Integrar streaming en cliente |
| Tests | Baja | Unit tests API |

---

## Base de Datos

### Diagrama ER

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   users     │     │     memories     │     │ memory_keywords │
├─────────────┤     ├──────────────────┤     ├─────────────────┤
│ id (PK)     │     │ id (PK)          │◄────│ id (PK)         │
│ username    │     │ type             │     │ memory_id (FK)  │
│ password    │     │ slug             │     │ keyword         │
│ role        │     │ title            │     └─────────────────┘
│ refresh_tkn │     │ content          │
└─────────────┘     │ summary          │
                    │ priority         │
┌─────────────┐     │ active           │
│  settings   │     └──────────────────┘
├─────────────┤
│ id (PK)     │     ┌──────────────────┐
│ key (UQ)    │     │ ai_personalities │
│ value       │     ├──────────────────┤
│ type        │     │ id (PK)          │
│ category    │     │ name             │
│ description │     │ slug             │
└─────────────┘     │ system_prompt    │
                    │ temperature      │
┌─────────────┐     │ active           │
│   folders   │     └──────────────────┘
├─────────────┤
│ id (PK)     │     ┌──────────────────┐
│ name        │     │      files       │
│ path        │     ├──────────────────┤
│ parent_id   │     │ id (PK)          │
└─────────────┘     │ name             │
                    │ content          │
                    │ folder_id (FK)   │
                    └──────────────────┘
```

### Tipos de Memory

| Type | Propósito | Ejemplo |
|------|-----------|---------|
| `index` | Perfil profesional base | Siempre cargado |
| `meta` | Autoconciencia del portfolio | Info sobre el proyecto |
| `docs` | Base de conocimiento | Instrucciones para IA |
| `project` | Proyectos individuales | Electoral, Migrador, etc. |
| `custom` | Memorias personalizadas | Futuro uso |

### Settings Disponibles

| Key | Category | Descripción |
|-----|----------|-------------|
| `owner_name` | owner | Nombre completo |
| `owner_first_name` | owner | Nombre |
| `owner_last_name` | owner | Apellido |
| `owner_role` | owner | Rol profesional completo |
| `owner_role_short` | owner | Rol corto |
| `owner_location` | owner | Ubicación |
| `owner_email` | contact | Email principal |
| `owner_email_alt` | contact | Email alternativo |
| `github_url` | social | URL GitHub (sin https) |
| `github_username` | social | Username GitHub |
| `linkedin_url` | social | URL LinkedIn (sin https) |
| `cv_filename` | files | Nombre archivo CV |
| `cv_display_name` | files | Nombre mostrado descarga |

---

## API REST (NestJS)

### Endpoints Públicos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/memories` | Lista todas las memorias |
| GET | `/memories/:slug` | Memoria por slug |
| GET | `/memories/relevant?prompt=` | Memorias relevantes (RAG) |
| GET | `/projects` | Lista proyectos |
| GET | `/projects/:slug` | Proyecto por slug |
| POST | `/chat` | Chat con IA |
| GET | `/uploads/cv` | Descargar CV |
| GET | `/uploads/cv/info` | Info del CV |

### Endpoints Protegidos (JWT)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/auth/login` | Login (devuelve tokens) |
| POST | `/auth/refresh` | Refresh token |
| POST | `/auth/logout` | Logout |
| POST | `/memories` | Crear memoria |
| PATCH | `/memories/:id` | Actualizar memoria |
| DELETE | `/memories/:id` | Eliminar memoria |
| POST | `/projects` | Crear proyecto |
| POST | `/uploads/cv` | Subir CV |

### Autenticación

```bash
# Login
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"bbenegas","password":"admin123"}'

# Respuesta
{
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG...",
  "user": { "id": 1, "username": "bbenegas", "role": "admin" }
}

# Usar token
curl http://localhost:4000/memories \
  -H "Authorization: Bearer eyJhbG..."
```

---

## Sistema de Parametrización

### Cómo Funciona

1. **Almacenamiento**: El contenido en `memories` usa placeholders:
   ```markdown
   # Perfil de {{owner_name}}
   Soy {{owner_role}} ubicado en {{owner_location}}.
   ```

2. **Runtime**: `MemoryService` reemplaza placeholders con valores de `settings`:
   ```typescript
   // memory.service.ts
   private replacePlaceholders(content: string): string {
     return content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
       return this.settingsCache.get(key) || match;
     });
   }
   ```

3. **Respuesta**: El cliente recibe contenido hidratado:
   ```markdown
   # Perfil de Brian Benegas
   Soy Full Stack Developer & DevOps ubicado en Argentina.
   ```

### Scripts de Parametrización

```bash
# Generar keywords con Gemini (15 por memoria)
cd api && npx ts-node src/scripts/generate-keywords.ts

# Convertir contenido hardcodeado a placeholders
cd api && npx ts-node src/scripts/parametrize-content.ts
```

### Para Personalizar (Venta)

1. Cambiar valores en tabla `settings`
2. Subir nuevo CV via `/uploads/cv`
3. (Opcional) Ajustar memorias específicas
4. El contenido se actualiza automáticamente

---

## Terminal y Comandos

### Comandos Disponibles

| Comando | Aliases | Descripción |
|---------|---------|-------------|
| `help` | `-h`, `--help` | Muestra ayuda |
| `ls` | `dir` | Lista archivos |
| `ll` | - | Lista detallada |
| `cd` | - | Cambiar directorio |
| `cat` | - | Ver contenido archivo |
| `tree` | - | Árbol de directorios |
| `pwd` | - | Directorio actual |
| `cls` | `clear` | Limpiar terminal |
| `cv` | `curriculum`, `resume` | Descargar CV |
| `torvalds` | - | Chat con IA |

### Estructura de Comandos

```typescript
// client/src/lib/terminal/commands/[comando].ts
export const miComando: Command = {
  name: 'micomando',
  description: 'Descripción del comando',
  usage: 'micomando [opciones]',
  aliases: ['alias1', 'alias2'],
  
  async execute(args: string[], context?: CommandContext): Promise<string> {
    // Implementación
    return 'Output del comando';
  },
};
```

---

## Roadmap

### Fase 1: Admin Panel (Actual) 🚧

- [ ] `/admin/settings` - UI para editar configuración
- [ ] `/admin/uploads` - UI para subir CV y otros archivos
- [ ] `/admin/memories` - CRUD de memorias con editor Markdown

### Fase 2: Mejoras UX

- [ ] Streaming de respuestas IA en terminal
- [ ] Autocompletado de comandos
- [ ] Historial persistente en localStorage
- [ ] Tema claro/oscuro

### Fase 3: Features Avanzados

- [ ] Multi-idioma (i18n)
- [ ] Analytics de uso
- [ ] Exportar portfolio como PDF
- [ ] Integración con más LLMs (Ollama local)

### Fase 4: Producción

- [ ] CI/CD con GitHub Actions
- [ ] Deploy automatizado
- [ ] Monitoreo y alertas
- [ ] Backup automático DB

---

## Guía de Desarrollo

### Requisitos

- Node.js 20+
- Docker Desktop
- Git

### Setup Inicial

```bash
# Clonar repositorio
git clone https://github.com/brianleft28/portfolio.git
cd portfolio

# Copiar variables de entorno
cp .env.example .env
# Editar .env con tus valores

# Levantar infraestructura
docker compose up -d

# Ejecutar seeders (primera vez)
cd api && npm install
npx ts-node src/seeders/run-seeders.ts

# Generar keywords con IA
npx ts-node src/scripts/generate-keywords.ts
```

### Comandos Útiles

```bash
# Ver logs de la API
docker logs -f brianleft-portfolio-api-1

# Acceder a MySQL
docker exec -it brianleft-portfolio-db-1 mysql -uportfolio -p portfolio

# Rebuild solo API
docker compose build api && docker compose up -d api

# Ejecutar tests
cd api && npm test
```

### Estructura de Directorios

```
brianleft-portfolio/
├── .github/                 # GitHub Actions
├── api/                     # Backend NestJS
│   ├── src/
│   │   ├── entities/        # Entidades TypeORM
│   │   ├── guards/          # Auth guards
│   │   ├── modules/         # Feature modules
│   │   │   ├── auth/
│   │   │   ├── chat/
│   │   │   ├── filesystem/
│   │   │   ├── health/
│   │   │   ├── memory/
│   │   │   ├── projects/
│   │   │   ├── uploads/
│   │   │   └── users/
│   │   ├── scripts/         # Scripts de utilidad
│   │   └── seeders/         # Seeders de datos
│   ├── uploads/             # Archivos subidos (CV, etc)
│   └── Dockerfile
├── client/                  # Frontend SvelteKit
│   ├── src/
│   │   ├── lib/
│   │   │   ├── components/  # Componentes Svelte
│   │   │   ├── data/        # Datos estáticos
│   │   │   ├── terminal/    # Sistema de terminal
│   │   │   │   └── commands/
│   │   │   └── stores/      # Svelte stores
│   │   └── routes/          # Páginas SvelteKit
│   │       └── admin/       # Panel de administración
│   └── Dockerfile
├── db/                      # MySQL config
│   ├── Dockerfile
│   └── init.sql
├── docs/                    # Documentación
│   └── TECHNICAL.md         # Este archivo
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Notas de Versión

### v2.0.0 (21/01/2026) - Migración Multi-Container

**Breaking Changes:**
- Arquitectura completamente nueva
- Requiere Docker para desarrollo

**Nuevas Features:**
- API NestJS separada
- MySQL 8 para persistencia
- Redis para cache/sesiones
- Sistema de parametrización completo
- Keywords generadas por IA
- Upload de CV
- Comando `cv` en terminal

**Migraciones:**
- Contenido de `.md` migrado a tabla `memories`
- Owner info extraído a tabla `settings`

---

## Contacto y Soporte

- **Autor:** Brian Benegas
- **Email:** contacto@brianleft.com
- **GitHub:** [brianleft28](https://github.com/brianleft28)

---

*Documento generado automáticamente. Última actualización: 21/01/2026*
