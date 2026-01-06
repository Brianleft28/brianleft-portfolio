# PERFIL PROFESIONAL — BRIAN BENEGAS

## Identidad

- **Nombre:** Brian Benegas
- **Rol:** Full Stack Developer & DevOps | Integrador de Sistemas
- **Ubicación:** Argentina
- **Filosofía:** "El código es el medio, la arquitectura es el fin."

## Especialización

Brian se especializa en **unir mundos desconectados**: Web a Hardware, Nube a On-Premise, Frontend a sistemas legacy. Su metodología combina:

- Procesos estocásticos para medir rendimiento
- Documentación obsesiva para mitigar el caos
- Arquitectura primero, código después
- Automatización para desplegues y mantenimiento

## Situación Actual

La mayor parte de su actividad diaria ocurre en repositorios privados de **GitLab** (proyectos corporativos/gubernamentales). Su GitHub es una vitrina de experimentos, no un registro de asistencia diario.

## Stack Tecnológico

### Backend & Systems

- **Node.js** (NestJS, Express)
- **.NET 8 (C#)** — Windows Services, APIs
- **Python** — Scripts, automatización

### Frontend

- **SvelteKit** — Nivel experto, SSR, hidratación
- **React** — Proyectos legacy

### Bases de Datos

- **MySQL** — Connection Pooling, optimización de queries
- **MongoDB** — Documentos, caching

### DevOps & Infraestructura

- **Docker** — Multi-stage builds, compose
- **Linux** — SysAdmin level
- **Nginx** — Reverse proxy, SSL
- **WebSockets** — Real-time systems

### Integraciones

- APIs HTTP/RESTful
- Streaming de datos (Server-Sent Events, WebSockets)
- Comunicación directa con Hardware (Raw Printing, ESC-POS)
- Sistemas de mensajería (colas, eventos)

## Enlaces

- **GitHub:** [github.com/brianleft28](https://github.com/brianleft28)
- **LinkedIn:** [linkedin.com/in/brian-benegas](https://www.linkedin.com/in/brian-benegas/)
- **Email:** contacto@brianleft.com | contactobrianleft@gmail.com

## Disponibilidad

Abierto a desafíos técnicos complejos en Full Stack y DevOps. Especialmente interesado en:

- Sistemas de alta concurrencia
- Integraciones hardware-software
- Arquitecturas resilientes

---

## Proyectos Destacados

| Proyecto | Contexto | Stack | Estado |
|----------|----------|-------|--------|
| Middleware Impresión RAW | Corporativo | .NET 8, Windows Services, ESC-POS/ZPL | Producción |
| Sistema Electoral | Gobierno/Misión Crítica | SvelteKit, Node.js, MySQL, Socket.io | Producción |
| Portfolio Interactivo | I+D/Demostrador | SvelteKit, Gemini API, Docker | Producción |
| Migrador de Beneficiarios | Gobierno/Automatización | Node.js, MySQL2, ExcelJS | Producción |

### Detalle de cada proyecto:

#### 1. Middleware de Impresión RAW (.NET Print Server)
- **Problema:** Aplicaciones web no pueden enviar bytes crudos a impresoras térmicas
- **Solución:** API RESTful corriendo como Windows Service en localhost
- **Flujo:** Web → HTTP POST → API .NET → Spooler Windows → Impresora
- **Formatos:** ZPL (Zebra), ESC-POS (térmicas genéricas), RAW bytes
- **Características:** Auto-reconexión, cola de trabajos, logs rotativos
- **Pregunta sugerida:** "háblame del print server" o "cómo funciona la impresión RAW"

#### 2. Sistema de Gestión Electoral
- **Problema:** Cómputo de votos en tiempo real con tolerancia cero a errores
- **Solución:** Sistema distribuido con broadcasting vía WebSockets
- **Arquitectura:** SvelteKit (frontend) + Node.js (API) + MySQL (persistencia) + Socket.io (real-time)
- **Desafíos resueltos:** Alta concurrencia, idempotencia en carga de actas, auditoría completa
- **Características:** Dashboard en vivo, validación multinivel, exportación oficial
- **Pregunta sugerida:** "cuéntame del sistema electoral" o "cómo manejaste la concurrencia"

#### 3. Portfolio Interactivo (Este sitio)
- **Problema:** Mostrar habilidades técnicas de forma memorable
- **Solución:** Terminal web interactiva con IA conversacional integrada
- **Arquitectura:** SvelteKit SSR + Gemini API + Sistema de archivos virtual
- **Características:** Memoria modular (optimiza tokens), comandos Unix simulados, tema retro
- **Stack:** SvelteKit, TypeScript, Gemini 2.0, Docker, Nginx
- **Pregunta sugerida:** "cómo funciona este portfolio" o "qué tecnologías usas aquí"

#### 4. Migrador de Beneficiarios
- **Problema:** Migrar datos de beneficiarios desde Excel a base de datos normalizada
- **Solución:** Script Node.js con validación, deduplicación y reportes de errores
- **Flujo:** Excel → Parsing (ExcelJS) → Validación → Transformación → MySQL (batch inserts)
- **Características:** Manejo de 50k+ registros, logs detallados, rollback automático en fallos
- **Desafíos resueltos:** Datos sucios, duplicados, encoding inconsistente
- **Pregunta sugerida:** "háblame del migrador" o "cómo manejaste datos sucios"

---

## Arquitectura General de Proyectos

```
┌─────────────────────────────────────────────────────────────┐
│                    CAPA DE PRESENTACIÓN                     │
│  SvelteKit (SSR) │ React (Legacy) │ Terminales/Dashboards   │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    CAPA DE SERVICIOS                        │
│  Node.js (NestJS/Express) │ .NET 8 (APIs/Services)          │
│  WebSockets │ REST │ Colas de mensajes                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    CAPA DE DATOS                            │
│  MySQL (transaccional) │ MongoDB (documentos/cache)         │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    INFRAESTRUCTURA                          │
│  Docker │ Linux │ Nginx │ Windows Services                  │
└─────────────────────────────────────────────────────────────┘
```

---

*Documento optimizado para consumo por IA. Última actualización: 2025.*

