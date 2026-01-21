<div align="center">

# 🖥️ Portfolio Interactivo

**Un "Sistema Operativo" web con terminal funcional, asistente IA y arquitectura de microservicios.**

[![SvelteKit](https://img.shields.io/badge/SvelteKit-5-FF3E00?style=for-the-badge&logo=svelte&logoColor=white)](https://kit.svelte.dev/)
[![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://mysql.com/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

<a href="https://brianleft.com" target="_blank" rel="noopener noreferrer">
  <img src="https://img.shields.io/badge/Ver%20Demo%20en%20Vivo-🚀-blue?style=for-the-badge" alt="Demo en Vivo">
</a>

</div>

---

## 📋 Tabla de Contenidos

- [Descripción](#-descripción)
- [Características](#-características)
- [Arquitectura](#-arquitectura)
- [Stack Tecnológico](#-stack-tecnológico)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Quick Start](#-quick-start)
- [Desarrollo Local](#-desarrollo-local)
- [Comandos de Terminal](#-comandos-de-terminal)
- [API Endpoints](#-api-endpoints)
- [Variables de Entorno](#-variables-de-entorno)
- [Deployment](#-deployment)
- [Documentación Técnica](#-documentación-técnica)
- [Licencia](#-licencia)

---

> 📚 **Documentación completa:** Para detalles técnicos, estado de implementación y roadmap, ver [`docs/TECHNICAL.md`](docs/TECHNICAL.md)

---

## 📖 Descripción

Este portfolio es una experiencia interactiva que simula un sistema operativo dentro del navegador. Los usuarios pueden explorar proyectos a través de un explorador de archivos visual o mediante una **terminal web completamente funcional**.

La pieza central es **TorvaldsAi**, un asistente de inteligencia artificial con la personalidad de Linus Torvalds, capaz de responder preguntas técnicas sobre los proyectos, la arquitectura y la experiencia profesional del autor.

> **Filosofía de diseño:** El código es la herramienta, la arquitectura es el objetivo. Este portfolio no solo muestra _qué_ sé hacer, sino _cómo_ pienso al construir software.

---

## ✨ Características

| Característica | Descripción |
|:---------------|:------------|
| **🖥️ Terminal Interactiva** | Emulador de consola con historial y comandos reales (`cd`, `ls`, `cat`, `tree`). Abre con `Ctrl + Ñ` |
| **🤖 TorvaldsAi** | Asistente IA con streaming de respuestas, renderizado Markdown y syntax highlighting (Google Gemini 2.5) |
| **📁 Sistema de Archivos Virtual** | Navegación de proyectos como directorios, almacenados en MySQL |
| **🧠 Sistema de Memoria Modular** | RAG inteligente que carga solo el contexto relevante para cada pregunta |
| **🔐 Autenticación JWT** | Panel admin protegido con access + refresh tokens |
| **⚡ Caché con Redis** | Sesiones, rate limiting y caché de respuestas |
| **🐳 Contenerizado** | Docker multi-stage optimizado con orquestación compose |

---

## 🏛️ Arquitectura

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     Client      │     │      API        │     │     MySQL 8     │
│   (SvelteKit)   │────▶│    (NestJS)     │────▶│   (TypeORM)     │
│   Port: 3000    │     │   Port: 4000    │     │   Port: 3306    │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │      Redis      │
                        │   (Sessions)    │
                        │   Port: 6379    │
                        └─────────────────┘
```

### Flujo de Datos

```mermaid
sequenceDiagram
    participant U as Usuario
    participant C as Client (SvelteKit)
    participant A as API (NestJS)
    participant DB as MySQL
    participant R as Redis
    participant G as Gemini API

    U->>C: torvalds "¿Cómo funciona esto?"
    C->>A: POST /chat
    A->>R: Check rate limit
    R-->>A: OK
    A->>DB: Get relevant memories
    DB-->>A: Context docs
    A->>G: System Prompt + Context + User Prompt
    
    loop Streaming
        G-->>A: Chunk de texto
        A-->>C: ReadableStream
        C-->>U: Renderiza Markdown
    end
```

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología | Propósito |
|:-----|:-----------|:----------|
| **Frontend** | SvelteKit 5, Svelte 5 | Framework reactivo con SSR |
| **Backend** | NestJS 10, TypeORM | API REST con inyección de dependencias |
| **Database** | MySQL 8 | Persistencia de datos (filesystem, memorias, usuarios) |
| **Cache** | Redis 7 | Sesiones JWT, rate limiting, caché |
| **IA** | Google Gemini 2.5 Flash | Generación de respuestas (LLM) |
| **Auth** | JWT + bcrypt | Access tokens (15min) + Refresh tokens (7d) |
| **Container** | Docker + Compose | Orquestación de servicios |

---

## 📁 Estructura del Proyecto

```
brianleft-portfolio/
├── docker-compose.yml          # Orquestador de servicios
├── .env                        # Variables de entorno (no commitear)
├── .env.example                # Template de configuración
│
├── client/                     # 🖥️ Frontend (SvelteKit)
│   ├── Dockerfile
│   ├── src/
│   │   ├── lib/
│   │   │   ├── components/     # Terminal, FileViewer, ProjectLoader
│   │   │   ├── terminal/       # Lógica de comandos
│   │   │   ├── data/           # Datos iniciales para seeder
│   │   │   │   └── memory/     # Memorias IA (se migran a DB)
│   │   │   └── stores/         # Estado global Svelte
│   │   └── routes/
│   │       ├── +page.svelte    # Página principal
│   │       ├── admin/          # Panel de administración
│   │       └── api/            # Proxies al backend
│   └── static/
│
├── api/                        # ⚙️ Backend (NestJS)
│   ├── Dockerfile
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/           # JWT login, refresh, guards
│   │   │   ├── users/          # CRUD usuarios
│   │   │   ├── filesystem/     # Carpetas y archivos virtuales
│   │   │   ├── memory/         # Memorias de IA + keywords
│   │   │   ├── chat/           # Integración Gemini + RAG
│   │   │   └── projects/       # Gestión de proyectos
│   │   ├── entities/           # TypeORM entities
│   │   ├── guards/             # JwtAuthGuard, RateLimitGuard
│   │   └── seeders/            # Migración de .md → MySQL
│   └── package.json
│
└── db/                         # 🗄️ Database (MySQL)
    ├── Dockerfile
    └── init.sql                # Schema inicial
```

---

## 🚀 Quick Start

### Requisitos

- Docker & Docker Compose v2+
- Node.js 20+ (solo para desarrollo local)

### Con Docker (Recomendado)

```bash
# 1. Clonar repositorio
git clone https://github.com/brianleft/portfolio.git
cd portfolio

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales (especialmente GEMINI_API_KEY)

# 3. Levantar servicios
docker-compose up -d

# 4. Ver logs
docker-compose logs -f
```

La aplicación estará disponible en:

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:3000 |
| API | http://localhost:4000 |
| API Docs | http://localhost:4000/api/docs |

---

## 💻 Desarrollo Local

### API (NestJS)

```bash
cd api
npm install
npm run start:dev
```

### Client (SvelteKit)

```bash
cd client
npm install
npm run dev
```

### Base de Datos

```bash
# Solo MySQL y Redis
docker-compose up -d db redis

# Verificar conexión
docker-compose exec db mysql -u portfolio -p portfolio
```

---

## 🖥️ Comandos de Terminal

La terminal se abre con `Ctrl + Ñ` o haciendo clic en **"Hablar con Torvalds (AI)"**.

| Comando | Descripción |
|:--------|:------------|
| `help` | Muestra todos los comandos disponibles |
| `ls` / `ll` / `dir` | Lista archivos del directorio actual |
| `cd <dir>` | Cambia de directorio (`cd ..` para subir) |
| `cat <archivo>` | Muestra contenido de un archivo |
| `tree` | Muestra árbol de directorios |
| `pwd` | Muestra directorio actual |
| `cls` / `clear` | Limpia la terminal |
| `torvalds start` | Inicia modo chat con la IA |
| `torvalds <pregunta>` | Pregunta directa a TorvaldsAi |

**Ejemplo:**

```bash
C:\> cd proyectos
C:\proyectos> ls
C:\proyectos> cat LEEME.md
C:\proyectos> torvalds ¿Cuál es la arquitectura de este sistema?
```

---

## 🔌 API Endpoints

### Autenticación

| Método | Endpoint | Descripción |
|:-------|:---------|:------------|
| POST | `/auth/login` | Login con username/password |
| POST | `/auth/refresh` | Renovar access token |
| POST | `/auth/logout` | Invalidar refresh token |

### Chat (IA)

| Método | Endpoint | Descripción |
|:-------|:---------|:------------|
| POST | `/chat` | Enviar mensaje a TorvaldsAi (streaming) |

### Filesystem

| Método | Endpoint | Descripción |
|:-------|:---------|:------------|
| GET | `/filesystem` | Árbol completo de carpetas |
| GET | `/filesystem/:id` | Detalle de carpeta/archivo |
| POST | `/filesystem/folder` | Crear carpeta |
| POST | `/filesystem/file` | Crear archivo |

### Memorias (Admin)

| Método | Endpoint | Descripción |
|:-------|:---------|:------------|
| GET | `/memories` | Listar memorias de IA |
| POST | `/memories` | Crear memoria + generar summary |
| PATCH | `/memories/:id` | Actualizar memoria |

---

## ⚙️ Variables de Entorno

| Variable | Descripción | Default |
|:---------|:------------|:--------|
| `DB_HOST` | Host de MySQL | `db` |
| `DB_PORT` | Puerto de MySQL | `3306` |
| `DB_NAME` | Nombre de la base de datos | `portfolio` |
| `DB_USER` | Usuario de MySQL | `portfolio` |
| `DB_PASSWORD` | Contraseña de MySQL | - |
| `DB_ROOT_PASSWORD` | Contraseña root de MySQL | - |
| `REDIS_HOST` | Host de Redis | `redis` |
| `REDIS_PORT` | Puerto de Redis | `6379` |
| `JWT_SECRET` | Secret para access tokens | - |
| `JWT_REFRESH_SECRET` | Secret para refresh tokens | - |
| `GEMINI_API_KEY` | API Key de Google Gemini | - |
| `ADMIN_USERNAME` | Usuario admin inicial | `admin` |
| `ADMIN_PASSWORD` | Contraseña admin inicial | - |

---

## 🐳 Deployment

### Producción con Docker Compose

```bash
# Build optimizado
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Ver estado
docker-compose ps

# Logs en tiempo real
docker-compose logs -f api
```

### Health Checks

```bash
# Verificar todos los servicios
curl http://localhost:4000/health
curl http://localhost:3000
```

---

## 📚 Documentación Técnica

Para información detallada sobre:

| Documento | Contenido |
|-----------|-----------|
| [`docs/TECHNICAL.md`](docs/TECHNICAL.md) | Arquitectura, DB schema, API completa, estado de implementación, roadmap |

### Estado Actual del Proyecto

| Componente | Estado | Notas |
|------------|--------|-------|
| 🐳 Docker Infrastructure | ✅ Completo | 4 servicios orquestados |
| ⚙️ API NestJS | ✅ Completo | Auth, Memory, Chat, Uploads |
| 🗄️ Base de Datos | ✅ Completo | 7 entidades, seeders funcionando |
| 🎯 Parametrización | ✅ Completo | Placeholders + Settings |
| 🤖 Keywords IA | ✅ Completo | 15 keywords/memoria con Gemini |
| 📄 Upload CV | ✅ Completo | Endpoint + comando terminal |
| 🖥️ Admin Panel | 🚧 En progreso | Necesita UI |
| 🌐 Client Build | 📋 Pendiente | Dockerfile no probado |

---

## 🤝 Contribuir

1. Fork el proyecto
2. Crear branch (`git checkout -b feature/amazing-feature`)
3. Commit cambios (`git commit -m 'Add amazing feature'`)
4. Push al branch (`git push origin feature/amazing-feature`)
5. Abrir Pull Request

---

## 📄 Licencia

Este proyecto está licenciado bajo **GPL-3.0**. Ver [LICENSE](LICENSE) para más detalles.

---

<div align="center">

**Desarrollado con ☕ por [Brian Benegas](https://brianleft.com)**

[LinkedIn](https://linkedin.com/in/brianbenegas) • [GitHub](https://github.com/brianleft)

</div>
