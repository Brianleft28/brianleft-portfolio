# PERFIL PROFESIONAL — BRIAN BENEGAS

## Identidad

- **Nombre:** Brian Benegas
- **Rol:** Full Stack Developer & DevOps | Integrador de Sistemas
- **Ubicación:** Argentina
- **Filosofía:** "El código es el medio, la arquitectura es el fin."

## Especialización

Brian se especializa en unir mundos desconectados: Web a Hardware, Nube a On-Premise, Frontend a sistemas legacy. Su metodología combina:

- Procesos estocásticos para medir rendimiento
- Documentación obsesiva para mitigar el caos
- Arquitectura primero, código después
- Automatización para despliegues y mantenimiento

## Situación Actual

La mayor parte de su actividad diaria ocurre en repositorios privados de GitLab (proyectos corporativos/gubernamentales). Su GitHub es una vitrina de experimentos, no un registro de asistencia diario.

## Stack Tecnológico

**Backend & Systems:** Node.js (NestJS, Express), .NET 8 (C#) para Windows Services y APIs, Python para scripts y automatización.

**Frontend:** SvelteKit (nivel experto, SSR, hidratación), React (proyectos legacy).

**Bases de Datos:** MySQL (Connection Pooling, optimización de queries), MongoDB (documentos, caching).

**DevOps & Infraestructura:** Docker (multi-stage builds, compose), Linux (SysAdmin level), Nginx (reverse proxy, SSL), WebSockets (real-time systems).

**Integraciones:** APIs HTTP/RESTful, Streaming de datos (SSE, WebSockets), Comunicación directa con Hardware (Raw Printing, ESC-POS), Sistemas de mensajería (colas, eventos).

## Enlaces

- GitHub: github.com/brianleft28
- LinkedIn: linkedin.com/in/brian-benegas
- Email: contacto@brianleft.com | contactobrianleft@gmail.com

## Disponibilidad

Abierto a desafíos técnicos complejos en Full Stack y DevOps. Especialmente interesado en sistemas de alta concurrencia, integraciones hardware-software y arquitecturas resilientes.

---

## Proyectos Destacados

### 1. Middleware de Impresión RAW (.NET Print Server)

- **Contexto:** Corporativo, en producción.
- **Stack:** .NET 8, Windows Services, ESC-POS/ZPL.

**Problema:** Las aplicaciones web no pueden enviar bytes crudos a impresoras térmicas por restricciones del navegador.

**Solución:** API RESTful corriendo como Windows Service en localhost que actúa como puente. Recibe peticiones HTTP con datos de impresión y los inyecta directamente al spooler de Windows.

**Flujo técnico:** Aplicación Web envía HTTP POST a localhost:puerto, la API .NET recibe y parsea el payload, convierte a formato requerido (ZPL para Zebra, ESC-POS para térmicas), envía bytes crudos al spooler, la impresora ejecuta.

**Características:** Auto-reconexión ante fallos, cola de trabajos persistente, logs rotativos, soporte multi-impresora.

**Preguntas sugeridas:** "háblame del print server", "cómo funciona la impresión RAW", "cómo resolviste la comunicación web-impresora".

---

### 2. Sistema de Gestión Electoral

- **Contexto:** Gobierno, misión crítica, en producción.
- **Stack:** SvelteKit, Node.js, MySQL, Socket.io.

**Problema:** Cómputo de votos en tiempo real durante jornada electoral. Tolerancia cero a errores, alta concurrencia, auditoría completa.

**Solución:** Sistema distribuido con frontend SvelteKit para operadores, API Node.js para lógica de negocio, MySQL para persistencia transaccional, Socket.io para broadcasting en tiempo real a dashboards.

**Desafíos resueltos:** Alta concurrencia (múltiples operadores cargando simultáneamente), idempotencia en carga de actas (evitar duplicados), auditoría completa (cada acción logueada con usuario y timestamp), validación multinivel (frontend, API, base de datos).

**Características:** Dashboard en vivo con actualización automática, exportación en formatos oficiales, sistema de roles y permisos.

**Preguntas sugeridas:** "cuéntame del sistema electoral", "cómo manejaste la concurrencia", "qué estrategias usaste para tolerancia a fallos".

---

### 3. Portfolio Interactivo (Este sitio)

- **Contexto:** I+D, demostrador técnico, en producción.
- **Stack:** SvelteKit, TypeScript, Gemini 2.0 API, Docker, Nginx.

**Problema:** Mostrar habilidades técnicas de forma memorable, no solo un CV estático.

**Solución:** Terminal web interactiva que simula un sistema operativo. Incluye sistema de archivos virtual navegable, asistente IA con personalidad (TorvaldsAI), comandos Unix simulados (cd, ls, cat, clear).

**Arquitectura:** SvelteKit con SSR para SEO, sistema de memoria modular para optimizar tokens de IA (la IA solo carga contexto relevante), streaming de respuestas en tiempo real.

**Características:** Tema retro estilo terminal, explorador de archivos visual, markdown renderizado con highlight.js, Docker multi-stage para deploy.

**Preguntas sugeridas:** "cómo funciona este portfolio", "qué tecnologías usas aquí", "cómo implementaste la memoria de la IA".

---

### 4. Migrador de Beneficiarios

- **Contexto:** Gobierno, automatización, en producción.
- **Stack:** Node.js, MySQL2, ExcelJS.

**Problema:** Migrar datos de beneficiarios desde archivos Excel heterogéneos a base de datos normalizada. Datos sucios, duplicados, encoding inconsistente.

**Solución:** Script Node.js que parsea Excel con ExcelJS, valida cada registro contra reglas de negocio, deduplica por múltiples criterios, transforma a esquema normalizado, inserta en batch a MySQL.

**Características:** Manejo de 50k+ registros, logs detallados de errores por fila, rollback automático en fallos críticos, reportes de migración.

**Desafíos resueltos:** Encoding mixto (UTF-8, Latin1), fechas en formatos inconsistentes, campos vacíos vs nulos, duplicados por variaciones en nombres.

**Preguntas sugeridas:** "háblame del migrador", "cómo manejaste datos sucios", "qué estrategia usaste para deduplicación".

---

## Arquitectura General

Brian estructura sus proyectos en capas claras:

- **Capa de Presentación:** SvelteKit (SSR) para proyectos nuevos, React para legacy, terminales y dashboards especializados.

- **Capa de Servicios:** Node.js (NestJS o Express) para APIs web, .NET 8 para servicios Windows y comunicación con hardware, WebSockets para tiempo real, REST para comunicación estándar.

- **Capa de Datos:** MySQL para datos transaccionales críticos, MongoDB para documentos y cache cuando aplica.

- **Infraestructura:** Docker para containerización y deploys consistentes, Linux para servidores, Nginx como reverse proxy con SSL, Windows Services para integraciones de escritorio.

---

Documento optimizado para consumo por IA. Sin diagramas visuales. Última actualización: 2025.

