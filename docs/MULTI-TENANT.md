# 🏢 Arquitectura Multi-Tenant

Este documento describe la arquitectura multi-tenant del portfolio, permitiendo que múltiples usuarios tengan sus propias instancias personalizables bajo subdominios únicos.

## 📋 Índice

- [Visión General](#visión-general)
- [Modelo de Datos](#modelo-de-datos)
- [Flujo de Resolución](#flujo-de-resolución)
- [Rate Limiting](#rate-limiting)
- [Configuración VPS](#configuración-vps)
- [Registro de Usuarios](#registro-de-usuarios)
- [Escalabilidad](#escalabilidad)

---

## Visión General

El portfolio funciona como una plataforma **SaaS white-label**:

```
┌──────────────────────────────────────────────────────────────┐
│                    brianleft.com (Principal)                  │
├──────────────────────────────────────────────────────────────┤
│  brian.brianleft.com     → Portfolio de Brian                │
│  juan.brianleft.com      → Portfolio de Juan                 │
│  maria.brianleft.com     → Portfolio de María                │
│  ...                                                          │
└──────────────────────────────────────────────────────────────┘
```

### Características

| Característica | Implementación |
|:---------------|:---------------|
| Aislamiento de datos | `userId` en cada entidad |
| Subdominios únicos | Columna `subdomain` en User |
| Configuración personalizable | Tabla Settings por usuario |
| IA contextualizada | Memorias + personalidad por usuario |
| Rate limiting | Redis con 15 req/día gratis |

---

## Modelo de Datos

### Entidades con `userId`

```typescript
// Todas las entidades principales tienen userId
@Entity('settings')
export class Setting {
  @Column()
  userId: number;  // FK a User

  @ManyToOne(() => User, user => user.settings)
  @JoinColumn({ name: 'userId' })
  user: User;
  
  @Column()
  key: string;  // e.g., "owner_name"
  
  @Column('text')
  value: string;
}
```

### Diagrama ER Simplificado

```
                    ┌─────────────────┐
                    │      User       │
                    ├─────────────────┤
                    │ id              │
                    │ username        │
                    │ email           │
                    │ subdomain    ◄──┼─── Único por usuario
                    │ displayName     │
                    │ role            │
                    └────────┬────────┘
                             │ 1:N
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   Settings    │    │   Memories    │    │    Folders    │
├───────────────┤    ├───────────────┤    ├───────────────┤
│ userId (FK)   │    │ userId (FK)   │    │ userId (FK)   │
│ key           │    │ title         │    │ name          │
│ value         │    │ content       │    │ parentId      │
│ category      │    │ keywords[]    │    │               │
└───────────────┘    └───────────────┘    └───────┬───────┘
                                                  │ 1:N
                                                  ▼
                                          ┌───────────────┐
                                          │     Files     │
                                          ├───────────────┤
                                          │ userId (FK)   │
                                          │ name          │
                                          │ content       │
                                          │ folderId      │
                                          └───────────────┘
```

---

## Flujo de Resolución

### 1. Request desde Subdomain

```
Usuario visita: https://brian.brianleft.com
```

### 2. Nginx extrae subdomain

```nginx
# Nginx config
set $subdomain "";
if ($host ~* ^([^.]+)\.brianleft\.com$) {
    set $subdomain $1;
}
proxy_set_header X-Subdomain $subdomain;
```

### 3. SvelteKit hooks.server.ts

```typescript
// client/src/hooks.server.ts
export const handle: Handle = async ({ event, resolve }) => {
  // Obtener subdomain del header (Nginx) o del host
  const subdomain = event.request.headers.get('x-subdomain') 
    || extractSubdomain(event.request.headers.get('host'));
  
  if (subdomain && subdomain !== 'www') {
    // Buscar usuario por subdomain
    const user = await fetchUserBySubdomain(subdomain);
    if (user) {
      event.locals.tenantUser = user;
      event.locals.tenantId = user.id;
    }
  }
  
  return resolve(event);
};
```

### 4. API filtra por userId

```typescript
// api/src/modules/settings/settings.service.ts
async findAll(userId: number): Promise<Setting[]> {
  return this.settingsRepository.find({
    where: { userId },
    order: { category: 'ASC', key: 'ASC' }
  });
}
```

---

## Rate Limiting

### Implementación con Redis

```typescript
// api/src/modules/chat/rate-limit.service.ts
@Injectable()
export class RateLimitService {
  private readonly FREE_TIER_LIMIT = 15;  // 15 peticiones/día
  private readonly WINDOW_MS = 24 * 60 * 60 * 1000;  // 24 horas
  private redis: Redis;
  private memoryStore: Map<string, RateLimitInfo>;

  async checkLimit(identifier: string): Promise<RateLimitResult> {
    const key = `ratelimit:${identifier}`;
    
    try {
      // Intentar Redis primero
      const data = await this.redis.get(key);
      // ... lógica de rate limiting
    } catch {
      // Fallback a memoria si Redis falla
      return this.checkMemoryLimit(identifier);
    }
  }
}
```

### Límites por Tier

| Tier | Límite | Ventana | Almacenamiento |
|:-----|:-------|:--------|:---------------|
| Free | 15 req | 24 horas | Redis + memoria |
| Premium | Ilimitado | - | - |

### Respuesta de Error

```json
{
  "error": "rate_limit",
  "message": "Has alcanzado el límite de 15 consultas diarias.",
  "remaining": 0,
  "reset": "2024-01-16T00:00:00.000Z"
}
```

---

## Configuración VPS

### Requisitos

- VPS con 2GB+ RAM
- Ubuntu 22.04 LTS
- Docker & Docker Compose
- Dominio con acceso a DNS (Cloudflare recomendado)

### 1. Certificado SSL Wildcard

```bash
# Opción A: Cloudflare DNS Challenge
sudo apt install python3-certbot-dns-cloudflare

# Credenciales
mkdir -p ~/.secrets/certbot
cat > ~/.secrets/certbot/cloudflare.ini << 'EOF'
dns_cloudflare_api_token = TU_TOKEN_API
EOF
chmod 600 ~/.secrets/certbot/cloudflare.ini

# Obtener certificado
sudo certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials ~/.secrets/certbot/cloudflare.ini \
  -d "brianleft.com" \
  -d "*.brianleft.com"
```

```bash
# Opción B: DigitalOcean DNS Challenge
sudo apt install python3-certbot-dns-digitalocean

cat > ~/.secrets/certbot/digitalocean.ini << 'EOF'
dns_digitalocean_token = TU_TOKEN_DO
EOF
chmod 600 ~/.secrets/certbot/digitalocean.ini

sudo certbot certonly \
  --dns-digitalocean \
  --dns-digitalocean-credentials ~/.secrets/certbot/digitalocean.ini \
  -d "brianleft.com" \
  -d "*.brianleft.com"
```

### 2. Configuración Nginx Completa

```nginx
# /etc/nginx/sites-available/portfolio

# Rate limiting zone
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

upstream portfolio_client {
    server 127.0.0.1:3000;
    keepalive 32;
}

upstream portfolio_api {
    server 127.0.0.1:4000;
    keepalive 32;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name brianleft.com *.brianleft.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/brianleft.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/brianleft.com/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    # Modern SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;

    # Extract subdomain
    set $subdomain "";
    if ($host ~* ^([^.]+)\.brianleft\.com$) {
        set $subdomain $1;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

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
        proxy_connect_timeout 75s;
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

    # Static files caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff2?)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}

# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name brianleft.com *.brianleft.com;
    return 301 https://$host$request_uri;
}
```

### 3. DNS Configuration (Cloudflare)

| Tipo | Nombre | Contenido | Proxy | TTL |
|:-----|:-------|:----------|:------|:----|
| A | @ | `TU_IP_VPS` | ✓ | Auto |
| CNAME | * | brianleft.com | ✓ | Auto |
| CNAME | www | brianleft.com | ✓ | Auto |

> **Nota:** El registro CNAME `*` captura todos los subdominios.

### 4. Docker Compose para Producción

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  api:
    environment:
      - NODE_ENV=production
    restart: always
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M

  client:
    environment:
      - NODE_ENV=production
    restart: always
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M

  redis:
    restart: always
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

  db:
    restart: always
    volumes:
      - mysql_data:/var/lib/mysql

volumes:
  redis_data:
  mysql_data:
```

---

## Registro de Usuarios

### Endpoint de Registro

```bash
POST /auth/register
Content-Type: application/json

{
  "username": "nuevouser",
  "password": "securePassword123!",
  "email": "nuevo@email.com"
}
```

### Proceso Automático

1. **Crear usuario** con subdomain = username
2. **Copiar settings** del usuario 1 (template)
3. **Crear personalidad IA** por defecto
4. **Inicializar memorias** básicas

```typescript
// api/src/modules/auth/auth.service.ts
async register(dto: RegisterDto): Promise<User> {
  // 1. Crear usuario
  const user = await this.usersService.create({
    username: dto.username,
    password: await bcrypt.hash(dto.password, 10),
    email: dto.email,
    subdomain: dto.username,  // Auto-asignado
  });

  // 2. Inicializar settings desde template
  await this.settingsService.initializeForUser(user.id);
  
  // 3. Crear personalidad IA por defecto
  await this.aiPersonalitiesService.createDefault(user.id);
  
  return user;
}
```

### Validaciones

- Username único (también será el subdomain)
- Email único (opcional)
- Password mínimo 8 caracteres
- Subdomain válido (alfanumérico, sin espacios)

---

## Escalabilidad

### Estrategias de Crecimiento

#### Fase 1: Single VPS (0-1000 usuarios)

```
┌─────────────────────────────────────────┐
│               VPS 4GB                   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │  Nginx  │ │ Docker  │ │ MySQL   │   │
│  │  Proxy  │ │ Client  │ │ + Redis │   │
│  └─────────┘ │   API   │ └─────────┘   │
│              └─────────┘                │
└─────────────────────────────────────────┘
```

#### Fase 2: Separación de DB (1000-10000 usuarios)

```
┌─────────────────┐     ┌─────────────────┐
│   VPS App       │     │  VPS Database   │
│  ┌───────────┐  │     │  ┌───────────┐  │
│  │  Nginx    │  │     │  │   MySQL   │  │
│  │  Client   │◄─┼─────┼─▶│   Redis   │  │
│  │  API      │  │     │  └───────────┘  │
│  └───────────┘  │     └─────────────────┘
└─────────────────┘
```

#### Fase 3: Load Balancing (10000+ usuarios)

```
                    ┌─────────────────┐
                    │  Load Balancer  │
                    │   (Cloudflare)  │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   App Node 1  │    │   App Node 2  │    │   App Node 3  │
└───────────────┘    └───────────────┘    └───────────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                    ┌────────┴────────┐
                    │  Managed DB     │
                    │  (PlanetScale)  │
                    │  Redis Cloud    │
                    └─────────────────┘
```

### Métricas a Monitorear

| Métrica | Herramienta | Alerta |
|:--------|:------------|:-------|
| CPU/Memory | htop, Prometheus | >80% |
| Requests/s | Nginx logs, Grafana | >100/s |
| DB Connections | MySQL status | >80 |
| Redis Memory | redis-cli info | >500MB |
| Error Rate | Application logs | >1% |

---

## Troubleshooting

### Subdomain no resuelve

```bash
# Verificar DNS
dig usuario.brianleft.com

# Verificar Nginx
sudo nginx -t
sudo systemctl reload nginx

# Verificar header
curl -I -H "Host: usuario.brianleft.com" http://localhost
```

### Rate limit no funciona

```bash
# Verificar Redis
docker-compose exec redis redis-cli ping

# Ver keys de rate limit
docker-compose exec redis redis-cli keys "ratelimit:*"
```

### Usuario no encuentra sus datos

```bash
# Verificar userId en queries
docker-compose exec db mysql -u portfolio -p -e \
  "SELECT * FROM settings WHERE userId = X LIMIT 5;" portfolio
```

---

## Referencias

- [NestJS Multi-tenancy](https://docs.nestjs.com/techniques/multi-tenancy)
- [Certbot DNS Challenge](https://eff-certbot.readthedocs.io/en/stable/using.html#dns-plugins)
- [Nginx Proxy Configuration](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
- [Redis Rate Limiting Patterns](https://redis.io/commands/incr/#pattern-rate-limiter)
