# Portfolio Interactivo

Portfolio profesional que se navega como una terminal, con un asistente conversacional
sobre un pipeline RAG propio. Un solo dueño, sin registro público.

## 🚀 Características

- **Terminal interactiva** estilo hacker con comandos personalizados
- **IA conversacional** (Gemini) con contexto RAG y personalidades configurables
- **Sistema de archivos virtual** para proyectos, sincronizado desde las memorias
- **Parametría en base de datos** — identidad, contacto, branding y IA editables desde el panel
- **Free tier** de consultas por IP con Redis; al agotarse, se muestran los datos de contacto
- **i18n** — Soporte multiidioma (Español/Inglés)

## 📚 Documentación

| Documento | Descripción |
|-----------|-------------|
| [Guía Técnica](docs/TECHNICAL.md) | Stack, arquitectura y endpoints |
| [Sistema RAG](docs/RAG-CONTEXT.MD) | IA, memorias y contexto |
| [Deployment](docs/DEPLOYMENT.md) | Guía de producción y checklist |

## 🛠️ Instalación

### Requisitos
- Node.js 18+
- Docker y Docker Compose
- MySQL 8 y Redis (o usar los contenedores)

### Puesta en marcha

```bash
# Clonar repositorio
git clone <repo-url>
cd brianleft-portfolio

# Configurar entorno
cp .env.example .env   # y completar los valores

# Levantar servicios
docker compose up -d --build

# Crear el usuario dueño y cargar el contenido
docker compose exec api npm run seed
```

Para desarrollo local sin Docker:

```bash
cd api && npm install && npm run start:dev
cd ../client && npm install && npm run dev
```

### Variables de Entorno

Copiar `.env.example` a `.env` y configurar:

```env
# Base de datos
DB_HOST=localhost
DB_PORT=3306
DB_NAME=portfolio

# JWT (cambiar en producción)
JWT_SECRET=tu-secret-seguro
JWT_REFRESH_SECRET=otro-secret-seguro

# Credenciales del dueño: el seeder crea el usuario y, si ya existe,
# reconcilia username y contraseña contra estos valores.
ADMIN_USERNAME=tuusuario
ADMIN_PASSWORD=tu-password
OWNER_EMAIL=tu@email.com

# IA
GEMINI_API_KEY=tu-api-key
CHAT_FREE_TIER_LIMIT=10   # consultas por IP cada 24h; el dueño no tiene límite

# Dominio del sitio (CORS)
PORTFOLIO_DOMAIN=tudominio.com
```

## 📁 Estructura del Proyecto

```bash
├── api/                 # Backend NestJS
│   ├── src/
│   │   ├── modules/     # Módulos de la aplicación
│   │   ├── entities/    # Entidades TypeORM
│   │   ├── seeders/     # Carga del dueño, memorias y proyectos
│   │   └── guards/      # Autenticación y autorización
│   └── uploads/         # Archivos subidos
│
├── client/              # Frontend SvelteKit
│   ├── src/
│   │   ├── lib/
│   │   │   ├── data/memory/   # Contenido versionado: perfil y proyectos
│   │   │   └── terminal/      # Comandos de la terminal
│   │   └── routes/      # Páginas de la aplicación
│   └── static/          # Archivos estáticos
│
├── db/                  # Configuración de base de datos
│   ├── init.sql         # Schema inicial
│   └── migrations/      # Migraciones
│
└── docs/                # Documentación
```

## 🔄 Flujo de contenido

1. **Entorno**: configurar `.env` con credenciales, API key y dominio.
2. **Seed**: `npm run seed` crea (o reconcilia) al dueño con su filesystem,
   settings, personalidades de IA y memorias base.
3. **Perfil**: `client/src/lib/data/memory/index.md` es el README principal —
   la memoria `index` que la IA lee primero. Se edita en el repo y se reseedea.
4. **Proyectos**: cada `.md` en `client/src/lib/data/memory/projects/` con
   frontmatter (`slug`, `title`, `summary`, `priority`, `techStack`, `keywords`)
   se convierte en una memoria consultable **y** en `C:/proyectos/<slug>/README.md`
   dentro de la terminal. Sin `keywords`, las genera Gemini en la ingesta.
5. **Parametría**: identidad, contacto, redes, branding y configuración de IA se
   editan en `/admin/settings`. Los placeholders `{{owner_name}}`, `{{social_github}}`,
   etc. se resuelven contra esos valores en cada consulta.

El seeder es idempotente: se puede correr en cada deploy sin duplicar nada.

## 🔐 Acceso de administración

El acceso del dueño es un comando de la terminal deliberadamente **ausente del `help`**.
Pide usuario y contraseña por prompt enmascarado, así la contraseña nunca queda en el
historial que la terminal persiste en `localStorage`. Como alternativa queda el
formulario en `/admin/login`.

## 📝 Licencia

MIT
