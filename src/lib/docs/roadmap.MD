# Roadmap del Proyecto: Portfolio (Estado Actual)

**Objetivo General:** Transformar el portfolio estático en una aplicación _full-stack_ con una arquitectura de microservicios dockerizados y un flujo de despliegue continuo (CI/CD).

---

## Arquitectura y Estrategia

El proyecto sigue un patrón de **arquitectura de microservicios dockerizados**.

- **Frontend (Cliente):** Servicio SvelteKit.
- **Backend (API):** Servicio NestJS ("Servicio de Proyectos").
- **Base de Datos:** Servicio MySQL.
- **Orquestación:** Todos los servicios son dockerizados y gestionados a través de `docker-compose.yml`.

**Flujo de Trabajo (CI/CD):**
El objetivo es la automatización total desde el desarrollo hasta la producción.

1.  **Desarrollo Local:** Se trabaja en la máquina local, usando `docker-compose` para replicar el entorno de producción.
2.  **Control de Versiones:** Los cambios se confirman y se suben a GitHub (`git push`).
3.  **Integración Continua (CI):** Un `push` a la rama principal dispara un workflow de GitHub Actions que:
    - Construye las imágenes Docker para el frontend y el backend.
    - Sube estas imágenes a un registro de contenedores (ej. Docker Hub ).
4.  **Despliegue Continuo (CD):** Tras el éxito de la CI, el workflow:
    - Se conecta de forma segura al VPS (vía SSH).
    - Ejecuta `docker-compose pull` para descargar las nuevas imágenes.
    - Reinicia los servicios con `docker-compose up -d` para aplicar los cambios.

---

## Fase 0: Limpieza y Consistencia (Completada)

_Objetivo: Eliminar "ruido" y deudas técnicas antes de construir._

- [ X ] **Tarea 1: Actualizar `README.md` (GitHub)**
- [ X ] **Tarea 2: Corregir SEO en `src/routes/+layout.svelte`**

---

## Fase 1: Migración a Monorepo (Paso Inicial Crítico)

_Objetivo: Reestructurar el repositorio de una sola aplicación a una estructura de monorepo para soportar múltiples microservicios._

- [ ] **Tarea 1: Ejecutar la Migración Estructural**
    - **Razón:** Esta es la base sobre la que se construirá toda la arquitectura. Separa físicamente los servicios, permitiendo un desarrollo y despliegue independientes.
    - **Guía Técnica:** Sigue los pasos detallados en el documento: [`monorepo-setup.md`](./monorepo-setup.md).

---

## Fase 2: Refactor del Frontend (Modularización)

_Objetivo: Mover el contenido hardcodeado a archivos `.md` para mejorar la mantenibilidad._
_(Las tareas de esta fase no cambian, ya que son internas al código del frontend)_

- [ ] **Tarea 1: Crear Estructura de Contenido**
- [ ] **Tarea 2: Extraer Contenido a Archivos `.md`**
- [ ] **Tarea 3: Actualizar `file-system.ts`**
- [ ] **Tarea 4: Cargar Contenido Dinámicamente**

---

## Fase 3: El Backend y la Orquestación Local

_Objetivo: Crear los servicios de backend y base de datos, y orquestarlos para que funcionen en el entorno de desarrollo local._

- [ ] **Tarea 1: Crear el Proyecto NestJS y su `Dockerfile`**
    - **Razón:** Cada servicio debe ser "dockerizable" de forma independiente. El `Dockerfile` es la receta para construir la imagen del servicio de API.

- [ ] **Tarea 2: Crear el `docker-compose.yml` para Desarrollo Local**
    - Define los 3 servicios (frontend, api, db) y cómo se conectan entre sí en tu máquina.
    - **Razón:** Este archivo es la clave para replicar el entorno de producción localmente. Es la base sobre la que se construirá el despliegue automático.

- [ ] **Tarea 3: Implementar y Probar la API Localmente**
    - Implementa la lógica de NestJS y TypeORM.
    - Levanta todo con `docker-compose up` y verifica que los 3 contenedores funcionan y se comunican.
    - **Razón:** Es crucial validar que la arquitectura completa funciona en un entorno controlado (local) antes de intentar automatizar su despliegue.

---

## Fase 4: Conectar el Frontend al Backend

_Objetivo: Reemplazar los datos estáticos del frontend con llamadas a la API de NestJS._
_(Las tareas no cambian, pero ahora se ejecutan contra la API que corre en Docker localmente)_

- [ ] **Tarea 1: Cargar Datos en la Página Principal**
- [ ] **Tarea 2: Renderizar el Explorador de Archivos Dinámicamente**

---

## Fase 4.5: La Consola Interactiva (Søren Public Integration)

_Objetivo: Implementar una terminal web funcional que permita a los visitantes "chatear" con una versión sanitizada del asistente._

- [ ] **Tarea 1: Definir la "Máscara Pública" de Søren**
    - Crear un nuevo prompt en el backend que solo tenga acceso a datos profesionales (CV, Stack, Proyectos).
    - Implementar reglas estrictas de privacidad (Data Loss Prevention).

- [ ] **Tarea 2: Componente `Console.svelte`**
    - Implementar listener de teclado global (`Ctrl + Ñ`).
    - Crear interfaz visual estilo "Matrix" o terminal Linux.
    - Conectar vía `fetch` al endpoint `/api/public-chat`.

- [ ] **Tarea 3: Endpoint Público en Backend**
    - Crear ruta `POST /public-chat` en `soren-mirror`.
    - Rate limiting (para que no te fundan la API key de Gemini).

## Fase 5: Preparación para el Despliegue (CI/CD)

_Objetivo: Configurar las herramientas y la infraestructura necesarias para la automatización._

- [ ] **Tarea 1: Configurar el Registro de Contenedores**
    - Crea un repositorio en Docker Hub o GitHub Container Registry para alojar tus imágenes.
    - **Razón:** El VPS no construirá las imágenes; las descargará de este registro central.

- [ ] **Tarea 2: Configurar Secrets en GitHub**
    - Añade los `secrets` en tu repositorio de GitHub para:
        - `DOCKER_USERNAME`, `DOCKER_PASSWORD`: Para iniciar sesión en el registro.
        - `VPS_SSH_HOST`, `VPS_SSH_USER`, `VPS_SSH_KEY`: Para que GitHub Actions pueda acceder a tu VPS.
    - **Razón:** Permite que el workflow de CI/CD se autentique en servicios externos de forma segura, sin exponer credenciales en el código.

- [ ] **Tarea 3: Crear el Workflow de CI (`ci.yml`)**
    - Crea el archivo `.github/workflows/ci.yml`.
    - Define el job de **Build y Push**: se activa con un `push`, construye las imágenes y las sube al registro.
    - **Razón:** Este es el paso de "Integración Continua". Asegura que tu código siempre se puede construir y empaquetar correctamente.

---

## Fase 5: Despliegue Continuo (CD)

_Objetivo: Automatizar el despliegue en el VPS._

- [ ] **Tarea 1: Preparar el VPS**
    - Instala Docker y Docker Compose en tu VPS.
    - Sube el archivo `docker-compose.yml` al VPS (puedes crear una versión `docker-compose.prod.yml` si es necesario).

- [ ] **Tarea 2: Añadir el Job de Despliegue al `ci.yml`**
    - Añade un segundo `job` al workflow que dependa del éxito del job de "Build y Push".
    - Este job usará los secrets SSH para conectarse al VPS y ejecutar `docker-compose pull && docker-compose up -d`.
    - **Razón:** Este es el paso de "Despliegue Continuo". Completa la automatización, llevando tus cambios a producción después de cada `push` exitoso.
