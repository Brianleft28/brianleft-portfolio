# Guía de Migración a Monorepo

Este documento detalla los pasos para reestructurar el proyecto SvelteKit inicial en una arquitectura de monorepo con carpetas separadas para el frontend y el backend.

## 1. Estructura de Carpetas Objetivo

El objetivo es alcanzar la siguiente estructura en la raíz del repositorio:

```
.
├── api/                  # Futuro microservicio de Backend (NestJS)
├── frontend/             # Microservicio de Frontend (SvelteKit)
└── docker-compose.yml    # Orquestador de todos los servicios
```

## 2. Pasos de la Migración

- [ ] **Tarea 1: Crear la Carpeta `frontend/`**:
    - En la raíz de tu proyecto, crea una nueva carpeta llamada `frontend`.

- [ ] **Tarea 2: Mover los Archivos del Frontend**:
    - Mueve **todo el contenido actual** del proyecto (las carpetas `src`, `static`, `node_modules`, y los archivos `package.json`, `svelte.config.js`, `README.md`, etc.) dentro de la nueva carpeta `frontend/`.

- [ ] **Tarea 3: Crear la Carpeta `api/`**:
    - En la raíz del proyecto, crea una carpeta vacía llamada `api/`. Esta carpeta albergará el proyecto NestJS más adelante.

- [ ] **Tarea 4: Crear el `docker-compose.yml` Raíz**:
    - En la raíz del proyecto, crea un archivo `docker-compose.yml`. Este archivo estará vacío por ahora, pero se irá completando en fases posteriores.

- [x] **Tarea 5: Actualizar el `README.md` Raíz**:
    - El archivo `README.md` que ahora está en `frontend/` debe ser movido a la raíz del proyecto y actualizado para describir la nueva arquitectura de monorepo.

Después de estos pasos, la estructura del proyecto estará alineada con la visión de microservicios, y el desarrollo de cada servicio podrá continuar de forma independiente dentro de su propia carpeta.
