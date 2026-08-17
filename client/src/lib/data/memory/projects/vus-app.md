---
slug: vus-app
title: "VUS App — Ecosistema de Smart Queue Management"
summary: "Solución integral de gestión de turnos para atención al público en un organismo municipal: emisión desde tótems de autogestión, visualización en tiempo real en Smart TVs, panel de operadores y métricas institucionales. Backend NestJS y frontends SvelteKit, repartidos en repositorios independientes tras desarmar un monorepo falso."
priority: 10
techStack: [NestJS, SvelteKit, TypeScript, MySQL, Socket.io, Git]
keywords: [vus, vus-app, smart queue management, gestion de turnos, turnos, municipio, atencion al publico, ecosistema, microservicios, monorepo, repositorios independientes, nestjs, sveltekit, arquitectura, ci-cd]
---

# Portfolio: VUS App (Ventanilla Única de Sistemas)

## 🤖 Contexto para IA Conversacional
El ecosistema VUS es una solución integral de Smart Queue Management diseñada para resolver aglomeraciones físicas y optimizar el flujo de atención al público en un municipio. Actúa como el sistema nervioso central de la institución, orquestando la emisión de turnos desde terminales de autogestión, la visualización en tiempo real en Smart TVs, la atención de operadores y la medición del rendimiento institucional mediante analíticas.

## 📊 Arquitectura Visual
```mermaid
flowchart TD
    A([Ciudadano ingresa al edificio]) --> B["Tótem de Autogestión (totem-app)"]

    subgraph Emisión de Turnos
        B -->|Selección Táctil| C["Backend Orquestador (vus-api)"]
        C -->|Cola de Impresión| D[Print Server Local]
        D -.->|Impresión Térmica| E[Boleto Físico]
    end

    C -->|Evento WebSocket| F["Sala de Espera (vus-front)"]

    subgraph Pantallas y Puestos
        F --> TV["Smart TVs — Turnos por Oficina"]
        F --> PUESTO["Puesto de Atención — Control de Llamados"]
    end

    PUESTO -->|Cambio de Estado| C
    C -->|Finalizado| G[(Métricas y Analíticas)]
```

## 🛡️ Torvalds Defender: Arquitectura y Git
> *"No mezcles peras con manzanas. Un monorepo falso es una bomba de tiempo." — Torvalds*

**El Desafío:** El proyecto inicial estructuraba todos los microservicios (`totem-app`, `vus-api`, `vus-front`, `print-server`) dentro de un único gran directorio `.git` compartido, provocando colisiones de dependencias, scripts cruzados y un CI/CD caótico.

**La Resolución Defensiva:**
- Se destruyó el falso monorepo, separando cada aplicación en su propio repositorio Git con tracking independiente.
- Esto garantizó que el backend (`NestJS`) y los frontends (`SvelteKit`) pudieran escalar sin pisarse, facilitando despliegues atómicos y permitiendo que la raíz `vus-app` quede estrictamente como un "wrapper" de portfolio, limpio de código ajeno o laboral.
