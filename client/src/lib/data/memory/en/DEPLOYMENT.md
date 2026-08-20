# Deployment Guide - pidgeonsolutions.com

This document describes the changes made to prepare the project for production and pending tasks.

---

## Changes Made

### 1. RAG Documentation

**Archivo:** `docs/RAG-CONTEXT.MD`

The RAG (Retrieval Augmented Generation) system was fully documented:

- Architecture and data flow
- Database entities (Memory, MemoryKeyword)
- Placeholder system `{{variable}}`
- AI personalities
- Response format for terminal
- Troubleshooting

### 2. Admin Routes Consolidation

**Files removed:**

- `client/src/routes/admin/ai/` (complete folder)
- `client/src/routes/admin/projects/` (complete folder)
- `client/src/routes/admin/uploads/` (complete folder)

**Files modified:**

- `client/src/routes/admin/+layout.svelte` - Navigation tabs removed
- `client/src/routes/admin/login/+page.server.ts` - Redirect to `/admin/settings`
- `client/src/lib/terminal/commands/admin.ts` - References updated

**Result:** Everything is managed from `/admin/settings`

### 3. CORS for Wildcard Subdomains

**Archivo:** `api/src/main.ts`

Implemented support for dynamic subdomains:

```typescript
app.enableCors({
  origin: (origin, callback) => {
    // Allows *.pidgeonsolutions.com in production
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

**New environment variable:** `PORTFOLIO_DOMAIN`

### 4. Internationalization System (i18n)

**Files created:**

```
client/src/lib/i18n/
├── index.ts           # svelte-i18n configuration
├── helpers.ts         # t() helper for .ts files
└── locales/
    ├── es.json        # Spanish translations (complete)
    └── en.json        # English translations (complete)
```

**Component created:**

- `client/src/lib/components/LocaleToggle.svelte`

**Files updated with i18n:**

- `client/src/routes/+layout.svelte` - Initialization
- `client/src/lib/terminal/commands/help.ts`
- `client/src/lib/terminal/commands/login.ts`
- `client/src/lib/terminal/commands/admin.ts`

### 5. Environment Variables

**Archivo:** `.env.example`

Variables added for production:

- `NODE_ENV` - Execution environment
- `PORTFOLIO_DOMAIN` - Domain for CORS wildcard

---

## Pending Tasks

### i18n - Files to Update

The translation JSON files are complete. These files still need to be migrated to use `t()`:

**Terminal commands:**
| Archivo | Translation Namespace |
|---------|------------------------|
| `register.ts` | `terminal.register.*` |
| `logout.ts` | `terminal.logout.*` |
| `whoami.ts` | `terminal.whoami.*` |
| `cv.ts` | `terminal.cv.*` |
| `ls.ts` | `terminal.ls.*` |
| `theme.ts` | `terminal.theme.*` |
| `verify.ts` | `terminal.verify.*` |

**Svelte Pages:**
| Archivo | Translation Namespace |
|---------|------------------------|
| `routes/+page.svelte` | `page.home.*` |
| `routes/admin/login/+page.svelte` | `admin.login.*` |
| `routes/admin/settings/+page.svelte` | `admin.settings.*` |

**Components:**
| Archivo | Translation Namespace |
|---------|------------------------|
| `ContactForm.svelte` | `components.contact.*` |

**Pattern for .ts files:**

```typescript
import { t } from "$lib/i18n/helpers";
// Usage: t('terminal.register.description')
```

**Pattern for .svelte files:**

```svelte
<script>
  import { t } from 'svelte-i18n';
</script>
{$t('admin.settings.title')}
```

---

## Production Configuration

### Required Environment Variables

Create `.env` file on the server with these values:

```env
# Environment
NODE_ENV=production

# Database
DB_HOST=db
DB_PORT=3306
DB_NAME=portfolio
DB_USER=portfolio
DB_PASSWORD=<generate-with-openssl>
DB_ROOT_PASSWORD=<generate-with-openssl>

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# JWT (generate with: openssl rand -base64 32)
JWT_SECRET=<generate>
JWT_REFRESH_SECRET=<generate>

# API
GEMINI_API_KEY=<your-api-key>
API_PORT=4000

# Domain (CRITICAL for CORS)
PORTFOLIO_DOMAIN=pidgeonsolutions.com

# Client
PUBLIC_API_URL=https://pidgeonsolutions.com/api
SESSION_SECRET=<generate>

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<your-email>
SMTP_PASS=<app-password-16-chars>
SMTP_SECURE=false
```

### DNS Configuration

In your DNS provider (Cloudflare, etc.):

| Type  | Name | Value                |
| ----- | ------ | -------------------- |
| A     | @      | VPS IP           |
| CNAME | \*     | pidgeonsolutions.com |

### Wildcard SSL Certificate

```bash
# With Cloudflare DNS
sudo certbot certonly --dns-cloudflare \
  --dns-cloudflare-credentials ~/.secrets/cloudflare.ini \
  -d "pidgeonsolutions.com" \
  -d "*.pidgeonsolutions.com"

# Without Cloudflare (manual)
sudo certbot certonly --manual \
  --preferred-challenges dns \
  -d "pidgeonsolutions.com" \
  -d "*.pidgeonsolutions.com"
```

### Nginx Configuration

Create `/etc/nginx/sites-available/portfolio`:

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

    # Extract subdomain
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

Activate the site:

```bash
sudo ln -s /etc/nginx/sites-available/portfolio /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Deployment Commands

```bash
# 1. Clone repository
git clone <repo-url> /opt/portfolio
cd /opt/portfolio

# 2. Create .env file
cp .env.example .env
nano .env  # Edit with production values

# 3. Build and bring up services
docker compose up -d --build

# 4. Verify containers are running
docker compose ps

# 5. View logs
docker compose logs -f

# 6. Run seeders (first time)
docker compose exec api npx ts-node src/seeders/run-seeders.ts

# 7. Verify health
curl https://pidgeonsolutions.com/api/health
```

### Database Backup

Add cron job for daily backups:

```bash
# Edit crontab
crontab -e

# Add line (backup at 2 AM)
0 2 * * * docker compose -f /opt/portfolio/docker-compose.yml exec -T db mysqldump -u portfolio -p$DB_PASSWORD portfolio > /backups/portfolio-$(date +\%Y\%m\%d).sql
```

---

## Pre-Production Checklist

### Code

- [x] CORS configured for wildcard subdomains
- [x] Admin routes consolidated
- [x] RAG-CONTEXT documented
- [x] i18n system configured
- [x] Environment variables documented
- [ ] Complete i18n migration in remaining files

### Infrastructure

- [ ] VPS acquired (minimum 2GB RAM)
- [ ] Docker and Docker Compose installed
- [ ] DNS configured (A + CNAME wildcard)
- [ ] Wildcard SSL certificate obtained
- [ ] Nginx installed and configured
- [ ] Firewall configured (UFW: 22, 80, 443)

### Deployment

- [ ] Repository cloned on VPS
- [ ] .env file created with production values
- [ ] Docker services running
- [ ] Seeders executed
- [ ] Health check passing
- [ ] Test user registration successful
- [ ] Test subdomain working

### Post-Deployment

- [ ] Monitoring configured (UptimeRobot or similar)
- [ ] Automatic backups configured
- [ ] Logs reviewed without errors
- [ ] SSL verified (ssllabs.com)

---

## Troubleshooting

### CORS Error on Subdomains

**Symptom:** `Access-Control-Allow-Origin` error in console

**Solution:**

1. Verify that `PORTFOLIO_DOMAIN` is configured correctly
2. Verify that `NODE_ENV=production` is set
3. Restart the API container: `docker compose restart api`

### Subdomain Not Resolving

**Symptom:** DNS_PROBE_FINISHED_NXDOMAIN

**Solution:**

1. Verify wildcard CNAME record in DNS
2. Wait for DNS propagation (up to 24h)
3. Verify with: `dig *.pidgeonsolutions.com`

### Invalid SSL Certificate

**Symptom:** ERR_CERT_COMMON_NAME_INVALID

**Solution:**

1. Verify that the certificate is wildcard
2. Renew certificate: `sudo certbot renew`
3. Restart Nginx: `sudo systemctl restart nginx`

### Database Not Connecting

**Symptom:** `ECONNREFUSED` in API logs

**Solution:**

1. Verify that the db container is running
2. Verify health check: `docker compose exec db mysqladmin ping -h localhost`
3. Review credentials in .env

---

_Last updated: February 2026_
