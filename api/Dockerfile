# ═══════════════════════════════════════════════════════════════════════════
# Build Stage
# ═══════════════════════════════════════════════════════════════════════════
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar código fuente
COPY . .

# Build
RUN npm run build

# ═══════════════════════════════════════════════════════════════════════════
# Production Stage
# ═══════════════════════════════════════════════════════════════════════════
FROM node:20-alpine AS production

WORKDIR /app

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Crear directorio de uploads con permisos correctos ANTES de montar el volumen
RUN mkdir -p /app/uploads && chown -R nestjs:nodejs /app/uploads && chmod 755 /app/uploads

# Crear directorio para memorias
RUN mkdir -p /app/data/memory && chown -R nestjs:nodejs /app/data

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar solo dependencias de producción + ts-node para seeders
RUN npm ci --only=production && \
    npm install ts-node typescript && \
    npm cache clean --force

# Copiar build desde builder
COPY --from=builder /app/dist ./dist

# Copiar fuentes de seeders para poder ejecutarlos con ts-node
COPY --from=builder /app/src/seeders ./src/seeders
COPY --from=builder /app/src/entities ./src/entities
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Cambiar ownership de todo
RUN chown -R nestjs:nodejs /app

# Usar usuario no-root
USER nestjs

# Exponer puerto
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:4000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Iniciar aplicación
CMD ["node", "dist/main"]
