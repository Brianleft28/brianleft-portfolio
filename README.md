# Portfolio White-Label

Sistema de portafolio profesional con terminal interactiva, IA conversacional y soporte multi-tenant.

## 🚀 Características

- **Terminal interactiva** estilo hacker con comandos personalizados
- **IA conversacional** (Gemini) con contexto RAG
- **Multi-tenant** con subdominios personalizados
- **Sistema de archivos virtual** para proyectos
- **100% White-Label** - sin datos hardcodeados

## 📚 Documentación

- [Guía Técnica (Stack y Arquitectura)](docs/TECHNICAL.md)
- [Guía Multi-Tenant (Subdominios)](docs/MULTI-TENANT.md)
- [Sistema de Memorias (IA & Contexto)](docs/MEMORIES.md)

## 🛠️ Instalación

### Requisitos
- Node.js 18+
- Docker y Docker Compose
- MySQL 8 (o usar el contenedor)

### Desarrollo Local

```bash
# Clonar repositorio
git clone <repo-url>
cd portfolio

# Levantar servicios con Docker
docker-compose up -d

# Instalar dependencias
cd api && npm install
cd ../client && npm install

# Ejecutar seeders (solo datos base, sin contenido personal)
cd api && npm run seed

# Iniciar desarrollo
cd api && npm run start:dev
cd ../client && npm run dev
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

# Email del dueño (obtiene permisos admin al registrarse)
OWNER_EMAIL=tu@email.com

# IA
GEMINI_API_KEY=tu-api-key

# Dominio base para subdominios
PORTFOLIO_DOMAIN=tudominio.com
```

## 📁 Estructura del Proyecto

```
├── api/                 # Backend NestJS
│   ├── src/
│   │   ├── modules/     # Módulos de la aplicación
│   │   ├── entities/    # Entidades TypeORM
│   │   ├── seeders/     # Datos iniciales (white-label)
│   │   └── guards/      # Autenticación y autorización
│   └── uploads/         # Archivos subidos por usuarios
│
├── client/              # Frontend SvelteKit
│   ├── src/
│   │   ├── lib/         # Componentes y utilidades
│   │   ├── routes/      # Páginas de la aplicación
│   │   └── terminal/    # Lógica de la terminal
│   └── static/          # Archivos estáticos
│
├── db/                  # Configuración de base de datos
│   ├── init.sql         # Schema inicial
│   └── migrations/      # Migraciones
│
└── docs/                # Documentación
    ├── TECHNICAL.md
    ├── MULTI-TENANT.md
    └── MEMORIES.md
```

## 🔄 Flujo White-Label

1. **Instalación**: Clonar y configurar `.env`
2. **Seeders**: Solo cargan estructura base (memoria `meta`)
3. **Registro**: Primer usuario con `OWNER_EMAIL` obtiene rol admin
4. **Configuración**: Admin completa perfil en `/admin/settings`
5. **Sincronización**: Sistema genera memoria `index` automáticamente
6. **Proyectos**: Al subir proyectos, se genera memoria `projects`
7. **IA Lista**: El chat puede responder sobre el perfil y proyectos

## 📝 Licencia

MIT