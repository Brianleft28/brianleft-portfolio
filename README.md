# Portfolio Interactivo v2 (Søren Público)

Este proyecto es la cara visible del monorepo: una aplicación web construida con **SvelteKit** que funciona como el portfolio personal de Brian Benegas. Su característica principal es la integración de **"Søren Público"**, un asistente de IA que responde preguntas sobre el perfil, la experiencia y los proyectos del autor.

Originalmente diseñado para correr con modelos locales, la versión actual ha evolucionado para utilizar la potencia de **Google Gemini 1.5 Flash**, garantizando respuestas rápidas y baja latencia directamente desde la terminal web, utilizando un archivo de memoria unificado.

### Stack Tecnológico

![SvelteKit](https://img.shields.io/badge/SvelteKit-FF3E00?style=for-the-badge&logo=svelte&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Google%20Gemini-8E75B2?style=for-the-badge&logo=google&logoColor=white)
![Bootstrap](https://img.shields.io/badge/Bootstrap-7952B3?style=for-the-badge&logo=bootstrap&logoColor=white)

---

## 🎯 Arquitectura y Flujo de Datos del Chat

Este servicio (`portfolio`) actúa como interfaz y orquestador. El flujo de una consulta en la terminal es el siguiente:

1.  **Terminal Web (Frontend)**: 
    * El usuario interactúa mediante comandos o chat libre.
    * La UI gestiona el sistema de archivos virtual y el estado del contexto.
    * Cuando se envía un mensaje, hace una petición `POST` a `/api/chat`.

2.  **Backend (SvelteKit Server Route)**: 
    * Recibe el mensaje del usuario.
    * Carga la memoria base estática desde `static/data/public_memory.md`.
    * Construye un *System Prompt* inyectando la memoria y el contexto de la sesión.
    * Conecta con la **API de Google Gemini (1.5 Flash)** para generar la respuesta.

3.  **Respuesta**: 
    * El texto generado se envía de vuelta al frontend y se renderiza en la terminal simulando una salida de consola.

---

## 💻 Comandos de la Terminal

La terminal interactiva es la forma principal de navegación. Los proyectos ahora se exploran como si fueran directorios en un sistema real:

| Comando | Descripción |
| :--- | :--- |
| `help` o `-h` | Muestra la lista de comandos disponibles. |
| `ll` / `dir` | Lista el contenido del directorio actual. Úsalo para ver qué proyectos existen. |
| `cd [dir]` | Navegación entre directorios (ej: `cd portfolio`). |
| `soren_chat` | Activa el modo chat general con el asistente. |
| `soren_chat [proyecto]` | Activa el modo chat **con contexto**, enfocando las respuestas en un proyecto específico (ej: `soren_chat soren-mirror`). |
| `cls` | Limpia la pantalla y reinicia el contexto del chat. |

---

## 🚀 Desarrollo Local

Para levantar este servicio:

1.  **Configura las variables de entorno**:
    Crea un archivo `.env` en la raíz con tu API Key de Gemini:
    ```env
    GEMINI_API_KEY=tu_api_key_aqui
    ```

2.  **Instala dependencias y corre el servidor**:
    ```bash
    npm install
    npm run dev
    ```

3.  **Docker (Opcional)**:
    Si prefieres correrlo contenerizado como en producción:
    ```bash
    docker-compose up -d --build
    ```

---

## 📄 Documentación Profunda

Para una visión completa de la arquitectura del monorepo, decisiones de diseño y el manifiesto de los agentes, consulta la documentación en el directorio `docs/` del repositorio principal o pregunta directamente a Søren en la terminal.

-   **[Ver Documentación del Proyecto Portfolio](../../docs/proyectos/portfolio.md)**