<div align="center">

# 🖥️ Portfolio Interactivo

**Un "Sistema Operativo" web con un asistente de IA integrado.**

[![SvelteKit](https://img.shields.io/badge/SvelteKit-FF3E00?style=for-the-badge&logo=svelte&logoColor=white)](https://kit.svelte.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white)](https://ai.google.dev/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

<div align="center">

<a href="https://portfolio.brianleft.com" target="_blank" rel="noopener noreferrer">
  <img src="https://img.shields.io/badge/Ver%20Demo%20en%20Vivo-🚀-blue?style=for-the-badge" alt="Demo en Vivo">
</a>

</div>

</div>

---

## 📋 Tabla de Contenidos

- [Descripción](#-descripción)
- [Características Principales](#-características-principales)
- [Arquitectura del Sistema](#-arquitectura-del-sistema)
- [Stack Tecnológico](#-stack-tecnológico)
- [Instalación y Desarrollo](#-instalación-y-desarrollo)
- [Comandos de la Terminal](#-comandos-de-la-terminal)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Configuración de la IA](#-configuración-de-la-ia)
- [Despliegue con Docker](#-despliegue-con-docker)
- [Documentación Interna](#-documentación-interna)
- [Licencia](#-licencia)

---

## 📖 Descripción

Este portfolio es una experiencia interactiva que simula un sistema operativo dentro del navegador. Los usuarios pueden explorar proyectos y contenido a través de un explorador de archivos visual o mediante una **terminal web completamente funcional**.

La pieza central es **TorvaldsAi**, un asistente de inteligencia artificial con la personalidad de Linus Torvalds, capaz de responder preguntas técnicas sobre la arquitectura del proyecto, la experiencia profesional del autor y los detalles de implementación de cada proyecto listado.

> **Filosofía de diseño:** El código es la herramienta, la arquitectura es el objetivo. Este portfolio no solo muestra _qué_ sé hacer, sino _cómo_ pienso al construir software.

---

## ✨ Características Principales

| Característica                  | Descripción                                                                                           |
| :------------------------------ | :---------------------------------------------------------------------------------------------------- |
| **Terminal Interactiva**        | Emulador de consola con historial, autocompletado y comandos personalizados. Abre con `Ctrl + Ñ`.     |
| **Sistema de Archivos Virtual** | Navegación por proyectos como si fueran directorios (`cd`, `ll`).                                     |
| **TorvaldsAi (IA Integrada)**   | Asistente con streaming de respuestas, renderizado Markdown y syntax highlighting. Usa Google Gemini. |
| **Docs as Code**                | La IA obtiene su conocimiento de un archivo Markdown (`memory.md`), fácil de versionar y mantener.    |
| **SSR + Hidratación**           | Renderizado del lado del servidor con SvelteKit para SEO y performance óptimos.                       |
| **Contenerizado**               | Dockerfile multi-stage optimizado (<100MB en imagen final).                                           |

---

## 🏛️ Arquitectura del Sistema

```mermaid
flowchart TB
    subgraph Cliente["🖥️ CLIENTE (Navegador)"]
        UI["📁 Explorador de Archivos"]
        Terminal["⌨️ Terminal Web"]
        Markdown["📝 Renderizador Markdown"]
    end

    subgraph Servidor["⚙️ SERVIDOR (SvelteKit Node)"]
        API["/api/chat"]
        Memory["memory.md"]
        
        API --> |"1. Recibe prompt"| Memory
        Memory --> |"2. Inyecta contexto"| API
    end

    subgraph Externos["☁️ SERVICIOS EXTERNOS"]
        Gemini["🤖 Google Gemini API<br/>gemini-2.5-flash"]
    end

    Terminal --> |"POST /api/chat<br/>(streaming)"| API
    UI --> |"Navegación"| Terminal
    API --> |"3. Request + System Prompt"| Gemini
    Gemini --> |"4. ReadableStream"| API
    API --> |"5. Chunks de texto"| Terminal
    Terminal --> Markdown
```

### Flujo de la IA

```mermaid
sequenceDiagram
    participant U as Usuario
    participant T as Terminal
    participant S as SvelteKit Server
    participant G as Google Gemini

    U->>T: torvaldsai "¿Cómo funciona esto?"
    T->>S: POST /api/chat
    S->>S: Cargar memory.md
    S->>G: System Prompt + User Prompt
    
    loop Streaming
        G-->>S: Chunk de texto
        S-->>T: ReadableStream
        T-->>U: Renderiza Markdown
    end
```

---

## 🛠️ Stack Tecnológico

| Capa                    | Tecnología               | Propósito                         |
| :---------------------- | :----------------------- | :-------------------------------- |
| **Frontend**            | SvelteKit 2, Svelte 5    | Framework reactivo con SSR        |
| **Estilos**             | Bootstrap 5, SASS        | Utilidades CSS y preprocesador    |
| **Lenguaje**            | TypeScript               | Tipado estático                   |
| **IA**                  | Google Gemini API        | Generación de respuestas (LLM)    |
| **Markdown**            | marked, marked-highlight | Parsing y renderizado de Markdown |
| **Syntax Highlighting** | highlight.js             | Coloreo de código en respuestas   |
| **Runtime**             | Node.js 20+              | Servidor SSR                      |
| **Contenedor**          | Docker (multi-stage)     | Despliegue optimizado             |

---

## 🚀 Instalación y Desarrollo

### Prerrequisitos

- **Node.js** >= 20.x
- **npm** >= 10.x (o pnpm/yarn)
- **API Key de Google Gemini** ([Obtener aquí](https://aistudio.google.com/app/apikey))

### Pasos

1.  **Clonar el repositorio:**

    ```bash
    git clone https://github.com/brianleft/portfolio.git
    cd portfolio
    ```

2.  **Instalar dependencias:**

    ```bash
    npm install
    ```

3.  **Configurar variables de entorno:**

    ```bash
    cp .env.example .env
    ```

    Edita `.env` y añade tu API Key:

    ```env
    GEMINI_API_KEY=tu_api_key_aqui
    ```

4.  **Iniciar servidor de desarrollo:**
    ```bash
    npm run dev
    ```
    Abre [http://localhost:5173](http://localhost:5173) en tu navegador.

---

## 💻 Comandos de la Terminal

La terminal se abre con `Ctrl + Ñ` o haciendo clic en el botón **"Hablar con Torvalds (AI)"**.

| Comando                 | Descripción                                            |
| :---------------------- | :----------------------------------------------------- |
| `-h`                    | Muestra la ayuda con todos los comandos disponibles.   |
| `ll`                    | Lista archivos y carpetas del directorio actual.       |
| `cd [dir]`              | Cambia de directorio. Usa `cd ..` para subir un nivel. |
| `cls`                   | Limpia la terminal y reinicia el contexto del chat.    |
| `exit`                  | Cierra la terminal o sale del modo chat.               |
| `torvaldsai`            | Activa el modo chat con TorvaldsAi.                    |
| `torvaldsai [pregunta]` | Envía una pregunta directa a la IA.                    |

**Ejemplo de uso:**

```
C:\> torvaldsai ¿Cuál es la arquitectura de este proyecto?
TorvaldsAi: Este portfolio está construido con SvelteKit usando SSR...
```

---

## 📁 Estructura del Proyecto

```
brianleft-portfolio/
├── src/
│   ├── lib/
│   │   ├── components/        # Componentes Svelte reutilizables
│   │   │   └── Terminal.svelte    # Emulador de terminal principal
│   │   ├── data/
│   │   │   ├── file-system.ts     # Definición del sistema de archivos virtual
│   │   │   └── memory/
│   │   │       └── memory.md      # 🧠 Memoria/contexto de TorvaldsAi
│   │   ├── docs/              # Documentación interna (Docs as Code)
│   │   └── stores/            # Stores de Svelte (estado global)
│   │       ├── ui.ts              # Estado de visibilidad de terminal
│   │       └── terminal.ts        # Estado del path actual
│   ├── routes/
│   │   ├── +layout.svelte     # Layout principal con terminal global
│   │   ├── +page.svelte       # Página de inicio
│   │   └── api/
│   │       └── chat/
│   │           └── +server.ts # Endpoint de la IA (Gemini)
│   └── app.html               # Template HTML base
├── static/                    # Archivos estáticos (robots.txt, etc.)
├── Dockerfile                 # Build multi-stage optimizado
├── .env.example               # Plantilla de variables de entorno
├── package.json
├── svelte.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## 🤖 Configuración de la IA

### Archivo de Memoria (`src/lib/data/memory/memory.md`)

Este archivo Markdown contiene **todo el conocimiento** que TorvaldsAi tiene sobre el proyecto, el autor y los proyectos listados. Se inyecta como contexto en cada petición a la API de Gemini.

**Ventajas de este enfoque:**

- ✅ Versionable con Git
- ✅ Fácil de editar (es solo Markdown)
- ✅ La IA siempre tiene información actualizada
- ✅ Separación clara entre código y contenido

### Personalidad de la IA

El prompt del sistema en [`src/routes/api/chat/+server.ts`](src/routes/api/chat/+server.ts) define:

- Personalidad tipo Linus Torvalds (directo, técnico, pragmático)
- Respuestas en español
- Formato Markdown con syntax highlighting
- Límite de tokens y manejo de errores

---

## 🐳 Despliegue con Docker

### Build y ejecución local:

```bash
# Construir imagen
docker build -t portfolio:latest .

# Ejecutar contenedor
docker run -d -p 3000:3000 \
  -e GEMINI_API_KEY=tu_api_key \
  --name portfolio \
  portfolio:latest
```

### Con Docker Compose:

```yaml
# docker-compose.yml
version: '3.8'
services:
    portfolio:
        build: .
        ports:
            - '3000:3000'
        environment:
            - GEMINI_API_KEY=${GEMINI_API_KEY}
        restart: unless-stopped
```

```bash
docker-compose up -d --build
```

---

## 📚 Documentación Interna

La documentación técnica profunda sigue el paradigma **Docs as Code** y se encuentra en:

| Documento     | Ubicación                                                        | Descripción                       |
| :------------ | :--------------------------------------------------------------- | :-------------------------------- |
| Memoria de IA | [`src/lib/data/memory/memory.md`](src/lib/data/memory/memory.md) | Contexto completo para TorvaldsAi |
| Arquitectura  | [`src/lib/docs/arquitectura.md`](src/lib/docs/arquitectura.md)   | Decisiones de diseño y diagramas  |
| Roadmap       | [`src/lib/docs/roadmap.MD`](src/lib/docs/roadmap.MD)             | Fases de evolución del proyecto   |
| Dotfiles      | [`dotfiles/README.md`](dotfiles/README.md)                       | Setup portable de terminal        |

> **Tip:** Podés preguntarle directamente a TorvaldsAi sobre cualquier aspecto del proyecto usando el comando `torvaldsai` en la terminal.

---

## 📄 Licencia

Este proyecto está licenciado bajo **GPL-3.0** (o posterior). Ver [LICENCE](LICENCE) para el texto completo y las instrucciones de uso.

---

<div align="center">

**Desarrollado con ☕ y entusiasmo por [Brian Benegas](https://portfolio.brianleft.com)**


</div>
