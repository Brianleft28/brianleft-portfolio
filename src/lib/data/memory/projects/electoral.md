# PROYECTO: Sistema de Gestión Electoral

## Clasificación
- **Tipo:** Gobierno / Misión Crítica
- **Categoría:** Alta Concurrencia / Real-time
- **Estado:** Producción (múltiples elecciones)
- **Confidencialidad:** Parcial — Arquitectura pública, implementación privada

## El Desafío
Cómputo y fiscalización de votos en **tiempo real** donde:
- La caída del sistema **no es una opción** (tolerancia cero a fallos)
- Miles de fiscales cargando datos simultáneamente
- Dashboards públicos actualizándose en vivo
- Auditoría completa de cada operación

## Stack Técnico
- **Frontend:** SvelteKit (SSR + hidratación)
- **Backend:** Node.js con Express
- **Base de Datos:** MySQL con mysql2 (Connection Pooling)
- **Real-time:** Socket.io para broadcasting

## Arquitectura

### Manejo de Concurrencia
```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Fiscal 1   │     │   Fiscal 2   │     │   Fiscal N   │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       └────────────────────┼────────────────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │   Load Balancer │
                   └────────┬────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ Node.js  │  │ Node.js  │  │ Node.js  │
        │ Instance │  │ Instance │  │ Instance │
        └────┬─────┘  └────┬─────┘  └────┬─────┘
             │             │             │
             └─────────────┼─────────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │  MySQL Cluster  │
                  │ (Connection Pool)│
                  └─────────────────┘
```

### Connection Pooling
- Pool de conexiones preestablecidas para evitar overhead de handshake
- Límites configurables por carga esperada
- Retry automático con backoff exponencial

### Broadcasting con WebSockets
- Rooms por nivel de acceso (público, fiscal, admin)
- Compresión de payloads para ancho de banda limitado
- Heartbeat para detectar conexiones zombies

## Seguridad
- **Auth Guards** por rol (fiscal, admin, auditor)
- Tokens JWT con expiración corta
- Rate limiting por IP y por usuario
- Logging exhaustivo para auditoría

## Métricas de Éxito
- **99.99% uptime** durante jornadas electorales
- **< 500ms** latencia promedio en carga de actas
- **0 inconsistencias** en conteo final vs actas físicas

## Por qué es "Good Code"
- Diseñado para el peor escenario (picos de 10x carga normal)
- Prioriza consistencia sobre velocidad cuando es necesario
- Cada decisión arquitectónica tiene justificación documentada
