# Roadmap del Proyecto: Portfolio (Evolución a Microservicios)

**Objetivo General:** Transformar el portfolio en una aplicación _full-stack_ con una arquitectura de microservicios dockerizados y un flujo de despliegue continuo (CI/CD).

---

## Arquitectura y Estrategia

El proyecto sigue un patrón de **arquitectura de microservicios dockerizados**.

- **Frontend (Cliente):** Servicio SvelteKit.
- **Backend (API):** Servicio NestJS ("Servicio de Proyectos").
- **Base de Datos:** Servicio MySQL.
- **Orquestación:** Todos los servicios son dockerizados y gestionados a través de `docker-compose.yml`.

---

## Fase 0: Limpieza y Consistencia (Completada)

_Objetivo: Eliminar "ruido" y deudas técnicas antes de construir._

- [x] **Tarea 1: Actualizar `README.md` (GitHub)**
- [x] **Tarea 2: Corregir SEO en `src/routes/+layout.svelte`**

---

## Fase 1: Migración a Monorepo (PENDIENTE - Próximo Paso)

_Objetivo: Reestructurar el repositorio a una estructura de monorepo para soportar múltiples microservicios._

- [ ] **Tarea 1: Ejecutar la Migración Estructural**
    - **Razón:** Esta es la base sobre la que se construirá toda la arquitectura. Separa físicamente los servicios, permitiendo un desarrollo y despliegue independientes.
    - **Guía Técnica:** Sigue los pasos detallados en el documento: [`monorepo-setup.md`](./monorepo-setup.md).

---

## Fase 2: Refactor del Frontend (Completada)

_Objetivo: Mover el contenido hardcodeado a archivos `.md` para mejorar la mantenibilidad._

- [x] **Tarea 1: Crear Estructura de Contenido en `src/lib/data/memory`**
- [x] **Tarea 2: Extraer Contenido a Archivos `.md`**
- [x] **Tarea 3: Actualizar `file-system.ts` para reflejar la nueva estructura**
- [x] **Tarea 4: Cargar Contenido Dinámicamente en `api/chat`**

---

## Fase 3: El Backend y la Orquestación Local (PENDIENTE)

_Objetivo: Crear los servicios de backend y base de datos, y orquestarlos para que funcionen en el entorno de desarrollo local._

- [ ] **Tarea 1: Crear el Proyecto NestJS y su `Dockerfile`**
- [ ] **Tarea 2: Crear el `docker-compose.yml` para Desarrollo Local**
- [ ] **Tarea 3: Implementar y Probar la API Localmente**

---

## Fase 4: Conectar el Frontend al Backend (PENDIENTE)

_Objetivo: Reemplazar los datos estáticos del `file-system.ts` con llamadas a la API de NestJS._

- [ ] **Tarea 1: Cargar Datos en la Página Principal desde la API**
- [ ] **Tarea 2: Renderizar el Explorador de Archivos Dinámicamente desde la API**

---

## Fase 4.5: RAG Vectorial y Optimización de Tokens (NUEVO - PENDIENTE)

_Objetivo: Implementar "ese formato que gasta menos" (Embeddings) para dejar de inyectar texto crudo._

- [ ] **Tarea 1: Base de Datos Vectorial (ChromaDB o PGVector)**
    - Implementar un store para vectores.
- [ ] **Tarea 2: Pipeline de Ingesta (Embeddings)**
    - Script para convertir los `.md` a vectores usando `text-embedding-004`.
- [ ] **Tarea 3: Búsqueda Semántica en NestJS**
    - Reemplazar el `keyword-matcher` hardcodeado por búsqueda vectorial real.

---

## Fase 4.8: La Consola Interactiva (Completada)

_Objetivo: Implementar una terminal web funcional que permita a los visitantes "chatear" con el asistente._

- [x] **Tarea 1: Definir la Personalidad de la IA en el Endpoint**
- [x] **Tarea 2: Crear Componente `Terminal.svelte`**
- [x] **Tarea 3: Crear Endpoint Público en `api/chat` con Streaming**

---

## Fase 5: Preparación para el Despliegue (CI/CD) (PENDIENTE)

_Objetivo: Configurar las herramientas y la infraestructura necesarias para la automatización._

- [ ] **Tarea 1: Configurar el Registro de Contenedores (Docker Hub)**
- [ ] **Tarea 2: Configurar Secrets en GitHub (Docker, SSH)**
- [ ] **Tarea 3: Crear el Workflow de CI (`.github/workflows/ci.yml`)**

---

## Fase 6: Despliegue Continuo (CD) (PENDIENTE)

_Objetivo: Automatizar el despliegue en el VPS._

- [ ] **Tarea 1: Preparar el VPS con Docker y Docker Compose**
- [ ] **Tarea 2: Añadir el Job de Despliegue al `ci.yml`**

---

## Fase 7: Integración del Agente `@torvalds` en vs-codde (NUEVO - PENDIENTE)

_Objetivo: Conectar la terminal con el agente MCP para permitir comandos de arquitectura y análisis de código._

- [ ] **Tarea 1: Modificar `Terminal.svelte` para Parsear Comandos `@agent`**
    - Implementar lógica para detectar el patrón `@torvalds /comando`.

- [ ] **Tarea 2: Crear un Nuevo Endpoint de API (`/api/agent`)**
    - Esta ruta recibirá los comandos del agente y actuará como puente hacia el servidor MCP.
    - Deberá invocar el proceso del `gemini-server.js` y comunicarse con él.

- [ ] **Tarea 3: Mejorar el Renderizado de la Terminal (Decoradores)**
    - Añadir estilos específicos en `Terminal.svelte` para diferenciar la salida del chat (`TorvaldsAi:`) de la salida del agente (`@torvalds:`).
    - Implementar renderizado para formatos de salida complejos como diffs de código o tablas de análisis.


---
## Fase 7.5: Integración Nativa del Agente en VS Code (NUEVO - PENDIENTE)

_Objetivo: Habilitar el uso del agente `@torvalds` directamente desde el chat de GitHub Copilot en el editor de VS Code._

- [ ] **Tarea 1: Validar la Configuración del Agente**
    - Asegurarse de que el archivo `.github/agents/torvalds.agent.md` sea correctamente parseado por VS Code.
    - El `name` debe ser simple (`torvalds`) y no contener espacios.

- [ ] **Tarea 2: Configurar el Servidor MCP para VS Code**
    - Verificar que el archivo `.vscode/mcp.json` esté correctamente configurado para lanzar el `gemini-server.js`.
    - Asegurarse de que la herramienta `torvalds-gemini/ask_torvalds` esté disponible y sea reconocida por el editor.

- [ ] **Tarea 3: Debugging y Recarga de Ventana**
    - Forzar la recarga de la ventana de VS Code (`Developer: Reload Window`) para que el editor tome los cambios en la configuración de agentes y servidores MCP.
    - Revisar los logs de salida de "GitHub Copilot Chat" en busca de errores relacionados con la carga del agente.


## Fase 8: Dashboard de Administración (NUEVO - PENDIENTE)

_Objetivo: Crear una interfaz web para gestionar los proyectos, desacoplando el contenido del código y eliminando la necesidad de editar archivos manualmente._

- [ ] **Tarea 1: Diseño de la API (CRUD de Proyectos en NestJS)**
    - Definir endpoints `POST`, `GET`, `PUT`, `DELETE` en el backend para gestionar los nodos del sistema de archivos (proyectos, carpetas, archivos `.md`).
    - La API debe interactuar con la base de datos MySQL, siguiendo el esquema de árbol definido en [`database-schema.MD`](./database-schema.MD).

- [ ] **Tarea 2: Crear la Interfaz del Dashboard (SvelteKit)**
    - Crear una nueva ruta protegida (ej: `/admin`).
    - Desarrollar componentes Svelte para listar, crear, editar y eliminar nodos del proyecto.
    - La UI debe permitir editar tanto la estructura del `file-system` como el contenido Markdown para la memoria de la IA.

- [ ] **Tarea 3: Refactorizar las Fuentes de Datos**
    - **CRÍTICO:** Modificar el frontend (`+page.svelte`) para que en lugar de importar `fileSystemData`, haga un `fetch` a la API de NestJS para obtener la estructura de archivos.
    - **CRÍTICO:** Modificar el backend de la IA (`/api/chat/+server.ts`) para que en lugar de leer archivos locales `.md`, consulte la base de datos a través de la API para construir la memoria relevante.

---

## Fase 8: Headless API for CLI Integration (Termius) (NUEVO - PENDIENTE)

_Objetivo: Exponer las capacidades de la IA a través de un endpoint de API seguro y sin estado para permitir la integración con terminales externas como Termius. Esto desacopla la IA del frontend de SvelteKit._

- [ ] **Tarea 1: Crear un Nuevo Endpoint de API Autenticado (`/api/cli-chat`)**
    - **Razón:** Un endpoint dedicado para la interacción CLI previene interferencias con la terminal web pública y permite diferentes requisitos de seguridad y formato de datos.
    - **Implementación:**
        - Usar API Keys para autenticación (pasadas vía headers, ej. `Authorization: Bearer <TOKEN>`).
        - El endpoint aceptará un payload JSON `{ "prompt": "user command" }` y devolverá una respuesta JSON con el output de la IA. No usará streaming como el chat web.

- [ ] **Tarea 2: Implementar Generación y Gestión de API Key**
    - **Razón:** Se necesita un método seguro para otorgar y revocar el acceso al endpoint CLI.
    - **Implementación:** Probablemente será un proceso manual por ahora (ej. añadir una key a las variables de entorno), pero la arquitectura debería permitir una UI de admin futura para gestionar keys.

- [ ] **Tarea 3: Crear un Script/Alias de Cliente para Termius**
    - **Razón:** Para simplificar el uso dentro de Termius, se puede crear un pequeño script wrapper o un alias de shell para manejar la llamada `curl` o `fetch` al nuevo endpoint de la API.
    - **Ejemplo de Alias (`.zshrc`, `.bashrc`):**
        ```bash
        torvalds() {
          curl -s -X POST https://your-domain.com/api/cli-chat \
            -H "Authorization: Bearer YOUR_API_KEY" \
            -H "Content-Type: application/json" \
            -d "{\"prompt\": \"$1\"}" | jq -r .response
        }
        ```
