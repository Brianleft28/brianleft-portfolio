# Guía de Deployment - pidgeonsolutions.com

Este documento describe los cambios realizados para preparar el proyecto para producción y las tareas pendientes.

---

## Cambios Realizados

### 1. Documentación RAG

**Archivo:** `docs/RAG-CONTEXT.MD`

Se documentó completamente el sistema RAG (Retrieval Augmented Generation):

- Arquitectura y flujo de datos
- Entidades de base de datos (Memory, MemoryKeyword)
- Sistema de placeholders `{{variable}}`
- Personalidades de IA
- Formato de respuestas para terminal
- Troubleshooting

### 2. Consolidación de Rutas Admin

**Archivos eliminados:**

- `client/src/routes/admin/ai/` (carpeta completa)
- `client/src/routes/admin/projects/` (carpeta completa)
- `client/src/routes/admin/uploads/` (carpeta completa)

**Archivos modificados:**

- `client/src/routes/admin/+layout.svelte` - Eliminados tabs de navegación
- `client/src/routes/admin/login/+page.server.ts` - Redirect a `/admin/settings`
- `client/src/lib/terminal/commands/admin.ts` - Referencias actualizadas

**Resultado:** Todo se gestiona desde `/admin/settings`

### 3. CORS para Subdominios Wildcard

**Archivo:** `api/src/main.ts`

Implementado soporte para subdominios dinámicos:

```typescript
app.enableCors({
  origin: (origin, callback) => {
    // Permite *.pidgeonsolutions.com en producción
    const domainPattern = new RegExp(
      `^https?://([a-z0-9-]+\\.)?${allowedDomain.replace(".", "\\.")}$`,
      "i",
    );
    if (domainPattern.test(origin)) {
      callback(null, true);
    }
  },
  credentials: true,
});
```

**Nueva variable de entorno:** `PORTFOLIO_DOMAIN`

### 4. Sistema de Internacionalización (i18n)

**Archivos creados:**

```
client/src/lib/i18n/
├── index.ts           # Configuración de svelte-i18n
├── helpers.ts         # Helper t() para archivos .ts
└── locales/
    ├── es.json        # Traducciones español (completo)
    └── en.json        # Traducciones inglés (completo)
```

**Componente creado:**

- `client/src/lib/components/LocaleToggle.svelte`

**Archivos actualizados con i18n:**

- `client/src/routes/+layout.svelte` - Inicialización
- `client/src/lib/terminal/commands/help.ts`
- `client/src/lib/terminal/commands/login.ts`
- `client/src/lib/terminal/commands/admin.ts`

### 5. Variables de Entorno

**Archivo:** `.env.example`

Agregadas variables para producción:

- `NODE_ENV` - Entorno de ejecución
- `PORTFOLIO_DOMAIN` - Dominio para CORS wildcard

---

## Tareas Pendientes

### i18n - Archivos por Actualizar

Los archivos JSON de traducciones están completos. Falta migrar estos archivos para usar `t()`:

**Comandos de terminal:**
| Archivo | Namespace de traducción |
|---------|------------------------|
| `register.ts` | `terminal.register.*` |
| `logout.ts` | `terminal.logout.*` |
| `whoami.ts` | `terminal.whoami.*` |
| `cv.ts` | `terminal.cv.*` |
| `ls.ts` | `terminal.ls.*` |
| `theme.ts` | `terminal.theme.*` |
| `verify.ts` | `terminal.verify.*` |

**Páginas Svelte:**
| Archivo | Namespace de traducción |
|---------|------------------------|
| `routes/+page.svelte` | `page.home.*` |
| `routes/admin/login/+page.svelte` | `admin.login.*` |
| `routes/admin/settings/+page.svelte` | `admin.settings.*` |

**Componentes:**
| Archivo | Namespace de traducción |
|---------|------------------------|
| `ContactForm.svelte` | `components.contact.*` |

**Patrón para archivos .ts:**

```typescript
import { t } from "$lib/i18n/helpers";
// Usar: t('terminal.register.description')
```

**Patrón para archivos .svelte:**

```svelte
<script>
  import { t } from 'svelte-i18n';
</script>
{$t('admin.settings.title')}
```

---

## Configuración de Producción

### Variables de Entorno Requeridas

Crear archivo `.env` en el servidor con estos valores:

```env
# Entorno
NODE_ENV=production

# Base de Datos
DB_HOST=db
DB_PORT=3306
DB_NAME=portfolio
DB_USER=portfolio
DB_PASSWORD=<generar-con-openssl>
DB_ROOT_PASSWORD=<generar-con-openssl>

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# JWT (generar con: openssl rand -base64 32)
JWT_SECRET=<generar>
JWT_REFRESH_SECRET=<generar>

# API
GEMINI_API_KEY=<tu-api-key>
API_PORT=4000

# Dominio (CRÍTICO para CORS)
PORTFOLIO_DOMAIN=pidgeonsolutions.com

# Cliente
PUBLIC_API_URL=https://pidgeonsolutions.com/api
SESSION_SECRET=<generar>

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<tu-email>
SMTP_PASS=<app-password-16-chars>
SMTP_SECURE=false
```

### Configuración DNS

En tu proveedor de DNS (Cloudflare, etc.):

| Tipo  | Nombre | Valor                |
| ----- | ------ | -------------------- |
| A     | @      | IP del VPS           |
| CNAME | \*     | pidgeonsolutions.com |

### Certificado SSL Wildcard

```bash
# Con Cloudflare DNS
sudo certbot certonly --dns-cloudflare \
  --dns-cloudflare-credentials ~/.secrets/cloudflare.ini \
  -d "pidgeonsolutions.com" \
  -d "*.pidgeonsolutions.com"

# Sin Cloudflare (manual)
sudo certbot certonly --manual \
  --preferred-challenges dns \
  -d "pidgeonsolutions.com" \
  -d "*.pidgeonsolutions.com"
```

### Configuración Nginx

Crear `/etc/nginx/sites-available/portfolio`:

```nginx
# Rate limiting
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

# Upstream services
upstream portfolio_api {
    server 127.0.0.1:4000;
}

upstream portfolio_client {
    server 127.0.0.1:3000;
}

# HTTP -> HTTPS redirect
server {
    listen 80;
    server_name pidgeonsolutions.com *.pidgeonsolutions.com;
    return 301 https://$host$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name pidgeonsolutions.com *.pidgeonsolutions.com;

    # SSL
    ssl_certificate /etc/letsencrypt/live/pidgeonsolutions.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pidgeonsolutions.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Extraer subdomain
    set $subdomain "";
    if ($host ~* ^([a-z0-9-]+)\.pidgeonsolutions\.com$) {
        set $subdomain $1;
    }

    # API proxy
    location /api {
        limit_req zone=api_limit burst=20 nodelay;

        proxy_pass http://portfolio_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Subdomain $subdomain;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
    }

    # Client proxy
    location / {
        proxy_pass http://portfolio_client;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Subdomain $subdomain;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Activar el sitio:

```bash
sudo ln -s /etc/nginx/sites-available/portfolio /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Comandos de Deployment

```bash
# 1. Clonar repositorio
git clone <repo-url> /opt/portfolio
cd /opt/portfolio

# 2. Crear archivo .env
cp .env.example .env
nano .env  # Editar con valores de producción

# 3. Construir y levantar servicios
docker compose up -d --build

# 4. Verificar que los contenedores estén corriendo
docker compose ps

# 5. Ver logs
docker compose logs -f

# 6. Ejecutar seeders (primera vez)
docker compose exec api npx ts-node src/seeders/run-seeders.ts

# 7. Verificar health
curl https://pidgeonsolutions.com/api/health
```

### Backup de Base de Datos

Agregar cron job para backups diarios:

```bash
# Editar crontab
crontab -e

# Agregar línea (backup a las 2 AM)
0 2 * * * docker compose -f /opt/portfolio/docker-compose.yml exec -T db mysqldump -u portfolio -p$DB_PASSWORD portfolio > /backups/portfolio-$(date +\%Y\%m\%d).sql
```

---

## Checklist Pre-Producción

### Código

- [x] CORS configurado para subdominios wildcard
- [x] Rutas admin consolidadas
- [x] RAG-CONTEXT documentado
- [x] Sistema i18n configurado
- [x] Variables de entorno documentadas
- [ ] Completar migración i18n en archivos restantes

### Infraestructura

- [ ] VPS contratado (mínimo 2GB RAM)
- [ ] Docker y Docker Compose instalados
- [ ] DNS configurado (A + CNAME wildcard)
- [ ] Certificado SSL wildcard obtenido
- [ ] Nginx instalado y configurado
- [ ] Firewall configurado (UFW: 22, 80, 443)

### Deployment

- [ ] Repositorio clonado en VPS
- [ ] Archivo .env creado con valores de producción
- [ ] Servicios Docker corriendo
- [ ] Seeders ejecutados
- [ ] Health check pasando
- [ ] Registro de usuario de prueba exitoso
- [ ] Subdominio de prueba funcionando

### Post-Deployment

- [ ] Monitoreo configurado (UptimeRobot o similar)
- [ ] Backups automáticos configurados
- [ ] Logs revisados sin errores
- [ ] SSL verificado (ssllabs.com)

---

## Troubleshooting

### CORS Error en Subdominios

**Síntoma:** `Access-Control-Allow-Origin` error en consola

**Solución:**

1. Verificar que `PORTFOLIO_DOMAIN` está configurado correctamente
2. Verificar que `NODE_ENV=production` está seteado
3. Reiniciar el contenedor API: `docker compose restart api`

### Subdominio No Resuelve

**Síntoma:** DNS_PROBE_FINISHED_NXDOMAIN

**Solución:**

1. Verificar registro CNAME wildcard en DNS
2. Esperar propagación DNS (hasta 24h)
3. Verificar con: `dig *.pidgeonsolutions.com`

### Certificado SSL Inválido

**Síntoma:** ERR_CERT_COMMON_NAME_INVALID

**Solución:**

1. Verificar que el certificado es wildcard
2. Renovar certificado: `sudo certbot renew`
3. Reiniciar Nginx: `sudo systemctl restart nginx`

### Base de Datos No Conecta

**Síntoma:** `ECONNREFUSED` en logs de API

**Solución:**

1. Verificar que el contenedor db está corriendo
2. Verificar health check: `docker compose exec db mysqladmin ping -h localhost`
3. Revisar credenciales en .env

---

_Última actualización: Febrero 2026_
