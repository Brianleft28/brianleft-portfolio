# 📚 Technical Documentation - Interactive Portfolio

> **Last updated:** January 21, 2026  
> **Version:** 2.0.0 (Multi-Container Migration)  
> **Branch:** `feat/scaffolding`

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Implementation Status](#implementation-status)
5. [Database](#database)
6. [REST API (NestJS)](#rest-api-nestjs)
7. [Parameterization System](#parameterization-system)
8. [Terminal and Commands](#terminal-and-commands)
9. [Roadmap](#roadmap)
10. [Development Guide](#development-guide)

---

## Project Overview

Interactive portfolio simulating a web "Operating System" with:
- **Functional terminal** with Unix-like commands
- **AI Assistant** integrated with Google Gemini
- **Navigable virtual file system**
- **100% parameterizable** for resale/customization

### Objectives of the v2.0 Migration

| Before (Monolith) | After (Multi-Container) |
|------------------|---------------------------|
| All-in-one SvelteKit | SvelteKit (Client) + NestJS (API) |
| No persistent DB | MySQL 8 + Redis |
| Memory in .md files | Memory in DB with RAG |
| Hardcoded owner info | Parameterizable via Settings |
| No robust authentication | JWT + Refresh Tokens |

---

## Architecture

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

### Data Flow

```
User → Terminal → Command → NestJS API → MySQL/Redis → Response
                         │
                         └── torvalds → Gemini API (with Memory context)
```

---

## Tech Stack

### Frontend (Client)
| Technology | Version | Purpose |
|------------|---------|-----------|
| SvelteKit | 2.x | SSR Framework |
| Svelte | 5.x | Reactive UI |
| TypeScript | 5.x | Static typing |
| Bootstrap | 5.x | Base styles |
| marked | latest | Markdown rendering |
| highlight.js | latest | Syntax highlighting |

### Backend (API)
| Technology | Version | Purpose |
|------------|---------|-----------|
| NestJS | 10.x | API Framework |
| TypeORM | 0.3.x | ORM for MySQL |
| Passport | latest | Authentication |
| JWT | latest | Session tokens |
| @nestjs/throttler | latest | Rate limiting |
| Multer | latest | File uploads |

### Infrastructure
| Technology | Version | Purpose |
|------------|---------|-----------|
| Docker | latest | Containerization |
| MySQL | 8.0 | Main database |
| Redis | 7.x | Cache and sessions |
| Nginx | (prod) | Reverse proxy |

---

## Implementation Status

### ✅ Completed

| Component | Description | Key Files |
|------------|-------------|----------------|
| **Docker Infrastructure** | Compose with 4 services | `docker-compose.yml` |
| **NestJS API Base** | Configuration, TypeORM, JWT | `api/src/app.module.ts` |
| **Authentication** | Login, Refresh, Guards | `api/src/modules/auth/` |
| **DB Entities** | User, Memory, Setting, etc. | `api/src/entities/` |
| **Memory Module** | CRUD + RAG with keywords | `api/src/modules/memory/` |
| **Parameterization** | Placeholders `{{variable}}` | `api/src/modules/memory/memory.service.ts` |
| **AI Keywords** | Automatic Gemini generation | `api/src/scripts/generate-keywords.ts` |
| **Uploads Module** | CV upload (PDF) | `api/src/modules/uploads/` |
| **CV Command** | Download from terminal | `client/src/lib/terminal/commands/cv.ts` |
| **Seeders** | Settings, Memories, Personalities | `api/src/seeders/` |

### 🚧 In Progress

| Component | Status | Notes |
|------------|--------|-------|
| **Admin Panel** | Pending | Needs UI for settings/uploads |
| **Client Build** | Pending | Client Dockerfile not tested |

### 📋 Pending

| Component | Priority | Description |
|------------|-----------|-------------|
| `/admin/settings` | High | UI to edit settings |
| `/admin/uploads` | High | UI to upload CV |
| `/admin/memories` | Medium | Memories CRUD |
| Chat Streaming | Medium | Integrate streaming in client |
| Tests | Low | API unit tests |

---

## Database

### ER Diagram

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

### Memory Types

| Type | Purpose | Example |
|------|-----------|---------|
| `index` | Base professional profile | Always loaded |
| `meta` | Portfolio self-awareness | Info about the project |
| `docs` | Knowledge base | Instructions for AI |
| `project` | Individual projects | Electoral, Migrador, etc. |
| `custom` | Customized memories | Future use |

### Available Settings

| Key | Category | Description |
|-----|----------|-------------|
| `owner_name` | owner | Full name |
| `owner_first_name` | owner | First name |
| `owner_last_name` | owner | Last name |
| `owner_role` | owner | Full professional role |
| `owner_role_short` | owner | Short role |
| `owner_location` | owner | Location |
| `owner_email` | contact | Main email |
| `owner_email_alt` | contact | Alternative email |
| `github_url` | social | GitHub URL (without https) |
| `github_username` | social | GitHub username |
| `linkedin_url` | social | LinkedIn URL (without https) |
| `cv_filename` | files | CV filename |
| `cv_display_name` | files | Display name for download |

---

## REST API (NestJS)

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/memories` | Lists all memories |
| GET | `/memories/:slug` | Memory by slug |
| GET | `/memories/relevant?prompt=` | Relevant memories (RAG) |
| GET | `/projects` | Lists projects |
| GET | `/projects/:slug` | Project by slug |
| POST | `/chat` | Chat with AI |
| GET | `/uploads/cv` | Download CV |
| GET | `/uploads/cv/info` | CV info |

### Protected Endpoints (JWT)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Login (returns tokens) |
| POST | `/auth/refresh` | Refresh token |
| POST | `/auth/logout` | Logout |
| POST | `/memories` | Create memory |
| PATCH | `/memories/:id` | Update memory |
| DELETE | `/memories/:id` | Delete memory |
| POST | `/projects` | Create project |
| POST | `/uploads/cv` | Upload CV |

### Authentication

```bash
# Login
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"bbenegas","password":"admin123"}'

# Response
{
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG...",
  "user": { "id": 1, "username": "bbenegas", "role": "admin" }
}

# Use token
curl http://localhost:4000/memories \
  -H "Authorization: Bearer eyJhbG..."
```

---

## Parameterization System

### How It Works

1. **Storage**: Content in `memories` uses placeholders:
   ```markdown
   # Profile of {{owner_name}}
   I am a {{owner_role}} located in {{owner_location}}.
   ```

2. **Runtime**: `MemoryService` replaces placeholders with values from `settings`:
   ```typescript
   // memory.service.ts
   private replacePlaceholders(content: string): string {
     return content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
       return this.settingsCache.get(key) || match;
     });
   }
   ```

3. **Response**: The client receives hydrated content:
   ```markdown
   # Profile of Brian Benegas
   I am a Full Stack Developer & DevOps located in Argentina.
   ```

### Parameterization Scripts

```bash
# Generate keywords with Gemini (15 per memory)
cd api && npx ts-node src/scripts/generate-keywords.ts

# Convert hardcoded content to placeholders
cd api && npx ts-node src/scripts/parametrize-content.ts
```

### For Customization (Resale)

1. Change values in the `settings` table
2. Upload new CV via `/uploads/cv`
3. (Optional) Adjust specific memories
4. Content updates automatically

---

## Terminal and Commands

### Available Commands

| Command | Aliases | Description |
|---------|---------|-------------|
| `help` | `-h`, `--help` | Shows help |
| `ls` | `dir` | Lists files |
| `ll` | - | Detailed list |
| `cd` | - | Change directory |
| `cat` | - | View file content |
| `tree` | - | Directory tree |
| `pwd` | - | Current directory |
| `cls` | `clear` | Clear terminal |
| `cv` | `curriculum`, `resume` | Download CV |
| `torvalds` | - | Chat with AI |

### Command Structure

```typescript
// client/src/lib/terminal/commands/[command].ts
export const miComando: Command = {
  name: 'micomando',
  description: 'Command description',
  usage: 'micomando [options]',
  aliases: ['alias1', 'alias2'],
  
  async execute(args: string[], context?: CommandContext): Promise<string> {
    // Implementation
    return 'Command output';
  },
};
```

---

## Roadmap

### Phase 1: Admin Panel (Current) 🚧

- [ ] `/admin/settings` - UI to edit configuration
- [ ] `/admin/uploads` - UI to upload CV and other files
- [ ] `/admin/memories` - Memories CRUD with Markdown editor

### Phase 2: UX Improvements

- [ ] Streaming of AI responses in terminal
- [ ] Command autocomplete
- [ ] Persistent history in localStorage
- [ ] Light/dark theme

### Phase 3: Advanced Features

- [ ] Multi-language (i18n)
- [ ] Usage analytics
- [ ] Export portfolio as PDF
- [ ] Integration with more LLMs (local Ollama)

### Phase 4: Production

- [ ] CI/CD with GitHub Actions
- [ ] Automated deployment
- [ ] Monitoring and alerts
- [ ] Automatic DB backup

---

## Development Guide

### Requirements

- Node.js 20+
- Docker Desktop
- Git

### Initial Setup

```bash
# Clone repository
git clone https://github.com/brianleft28/portfolio.git
cd portfolio

# Copy environment variables
cp .env.example .env
# Edit .env with your values

# Start infrastructure
docker compose up -d

# Run seeders (first time)
cd api && npm install
npx ts-node src/seeders/run-seeders.ts

# Generate keywords with AI
npx ts-node src/scripts/generate-keywords.ts
```

### Useful Commands

```bash
# View API logs
docker logs -f brianleft-portfolio-api-1

# Access MySQL
docker exec -it brianleft-portfolio-db-1 mysql -uportfolio -p portfolio

# Rebuild API only
docker compose build api && docker compose up -d api

# Run tests
cd api && npm test
```

### Directory Structure

```
brianleft-portfolio/
├── .github/                 # GitHub Actions
├── api/                     # NestJS Backend
│   ├── src/
│   │   ├── entities/        # TypeORM entities
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
│   │   ├── scripts/         # Utility scripts
│   │   └── seeders/         # Data seeders
│   ├── uploads/             # Uploaded files (CV, etc.)
│   └── Dockerfile
├── client/                  # SvelteKit Frontend
│   ├── src/
│   │   ├── lib/
│   │   │   ├── components/  # Svelte components
│   │   │   ├── data/        # Static data
│   │   │   ├── terminal/    # Terminal system
│   │   │   │   └── commands/
│   │   │   └── stores/      # Svelte stores
│   │   └── routes/          # SvelteKit routes
│   │       └── admin/       # Admin panel
│   └── Dockerfile
├── db/                      # MySQL config
│   ├── Dockerfile
│   └── init.sql
├── docs/                    # Documentation
│   └── TECHNICAL.md         # This file
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Release Notes

### v2.0.0 (21/01/2026) - Multi-Container Migration

**Breaking Changes:**
- Completely new architecture
- Requires Docker for development

**New Features:**
- Separate NestJS API
- MySQL 8 for persistence
- Redis for cache/sessions
- Complete parameterization system
- AI-generated keywords
- CV upload
- `cv` command in terminal

**Migrations:**
- `.md` content migrated to `memories` table
- Owner info extracted to `settings` table

---

## Contact and Support

- **Author:** Brian Benegas
- **Email:** contacto@brianleft.com
- **GitHub:** [brianleft28](https://github.com/brianleft28)

---

*Document automatically generated. Last updated: 21/01/2026*
