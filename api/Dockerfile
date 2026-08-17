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

# Instalar solo dependencias de producción
RUN npm ci --only=production && \
    npm cache clean --force

# Copiar build desde builder.
# Los seeders corren desde `dist` (`npm run seed`): antes se copiaba `src/seeders`
# para ejecutarlos con ts-node, pero `run-seeders.ts` importa `app.module`, que no
# se copiaba — el seed fallaba en la imagen. Usar el build evita el problema y saca
# ts-node y typescript de producción.
COPY --from=builder /app/dist ./dist

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
