---
slug: brianleft-portfolio
title: "Portfolio Interactivo — Terminal virtual con RAG escrito a mano"
summary: "Portfolio que se navega como una consola de Linux y responde preguntas sobre mi trabajo con un pipeline RAG propio. Todo lo que un orquestador de workflows resolvería arrastrando nodos —ingesta, extracción de keywords con LLM, recuperación por relevancia, armado de contexto y streaming— está escrito paso a paso en TypeScript, sin motor de workflows en el medio."
priority: 10
techStack: [SvelteKit, NestJS, TypeScript, MySQL, Redis, Docker, Gemini, Nginx]
keywords: [portfolio, brianleft, brianleft-portfolio, terminal, terminal virtual, consola, rag, retrieval augmented generation, memorias, keywords, gemini, llm, ia conversacional, sveltekit, nestjs, typeorm, mysql, redis, docker, docker compose, nginx, jwt, rate limiting, filesystem virtual, ssr, streaming, n8n, orquestacion, multi-tenant, white label, seeder, idempotencia]
---

# Portfolio: Interactivo con Terminal y RAG

## 🤖 Contexto para IA Conversacional

Este sitio es el proyecto. No es una landing con secciones: es una **terminal virtual** con un filesystem propio que el visitante navega con `cd`, `ls`, `cat` y `tree`, y un asistente conversacional que responde sobre mi trabajo usando un pipeline **RAG (Retrieval Augmented Generation)** construido a mano.

La tesis técnica es esa última parte. Hoy existen herramientas —n8n y compañía— que resuelven un flujo de IA arrastrando nodos: leer documentos, sacar keywords, buscar lo relevante, armar el prompt, llamar al modelo, devolver el stream. Acá cada uno de esos pasos está escrito en TypeScript, es inspeccionable y corre dentro de la misma app. No es un pipeline visual: es código que puedo debuggear, testear y explicar línea por línea.

## 📊 Arquitectura

```mermaid
flowchart TD
    V([Visitante]) --> NG[Nginx + SSL]
    NG --> CL[SvelteKit SSR]

    subgraph Cliente
        CL --> TERM[Terminal virtual]
        CL --> HOOK["hooks.server.ts<br/>proxy de /api/* + sesión"]
    end

    HOOK --> API[NestJS]

    subgraph Backend
        API --> RL{Rate limit}
        RL --> RD[(Redis)]
        API --> RAG[Pipeline RAG]
        RAG --> DB[(MySQL)]
        RAG --> GEM[Gemini]
    end

    GEM -.->|stream de tokens| TERM
```

**Stack:** SvelteKit con SSR (adapter-node) + NestJS + TypeORM + MySQL 8 + Redis, todo en Docker Compose detrás de Nginx con certificado de Let's Encrypt.

Una decisión de diseño que se paga sola: **el cliente no habla directo con la API**. `hooks.server.ts` intercepta todo `/api/*` antes de que SvelteKit resuelva rutas, le saca el prefijo y lo proxea al backend inyectando el `Authorization` de la sesión. El browser nunca ve un token ni la URL interna del backend, y no hay que configurar CORS entre ambos.

## 🧠 El pipeline RAG, paso por paso

1. **Ingesta.** Cada proyecto es un `.md` con frontmatter (`slug`, `title`, `summary`, `priority`, `techStack`, `keywords`). Un seeder los lee y los convierte en filas de la tabla `memories`.
2. **Extracción de keywords.** Si un documento no trae keywords, se las pide al LLM y las persiste en `memory_keywords`. Se hace una vez, en la ingesta, no en cada consulta: el costo de tokens es de carga, no de lectura.
3. **Recuperación.** Ante una pregunta, se buscan las memorias relevantes por keywords y prioridad. Los tipos (`META`, `INDEX`, `DOCS`, `PROJECT`) le dan al recuperador una jerarquía: el perfil pesa distinto que un proyecto puntual.
4. **Armado de contexto.** Se compone el prompt con las memorias recuperadas más la personalidad de IA activa, y se resuelven los placeholders `{{owner_name}}`, `{{social_github}}` y demás contra la parametría en base de datos, en cada request.
5. **Streaming.** La respuesta de Gemini se reenvía chunk a chunk hasta la terminal, que la va escribiendo con efecto typewriter.

Nada de esto está hardcodeado a mi nombre: el contenido sale de la base y la identidad sale de la parametría, editable desde el panel sin tocar código.

## 🗂️ El filesystem virtual

`~/proyectos/<slug>/README.md` no son archivos en disco: son filas en las tablas `folders` y `files`. Un servicio sincroniza esa estructura desde las memorias tipo `PROJECT`, así que **un `.md` en el repo produce, en una sola corrida, una memoria consultable por la IA y una carpeta navegable en la terminal**. Una sola fuente de verdad para dos consumos distintos.

## 🛡️ Torvalds Defender: idempotencia del seeder

> *"Un seeder que no podés correr dos veces no es un seeder, es un ritual." — Torvalds*

**El Desafío:** la carga de contenido appendeaba a las memorias índice. Correr el seeder de nuevo —cosa que pasa en cada deploy— duplicaba cada proyecto en el perfil, y el RAG terminaba leyendo el mismo texto tres veces, gastando contexto y confundiendo al modelo.

**La Resolución Defensiva:**
- Las secciones generadas se delimitan con marcadores `<!-- projects:auto:start -->` / `<!-- projects:auto:end -->` y se **regeneran** completas, en vez de acumularse.
- La carga por slug hace upsert: si el proyecto existe se actualiza el contenido y se regraban las keywords desde cero.
- Resultado: el seeder es idempotente de punta a punta y se puede correr en cada deploy sin pensarlo.

## 🛡️ Torvalds Defender: variables de entorno en Docker

> *"Una variable horneada en la imagen no es configuración, es una constante con pretensiones." — Torvalds*

**El Desafío:** SvelteKit ofrece `$env/static/*`, que resuelve las variables **en tiempo de build**. Como Docker Compose las inyecta en runtime, la imagen se construía con los valores vacíos y la app arrancaba apuntando a ninguna parte, sin fallar de forma obvia.

**La Resolución Defensiva:** migrar a `$env/dynamic/*` en todo lo que provee el contenedor. La misma imagen sirve para desarrollo y producción, y cambiar una variable es reiniciar, no reconstruir.

## 🛡️ Torvalds Defender: rate limiting sin confiar en la red

> *"Si tu límite depende de una IP que no configuraste, no tenés un límite: tenés una ilusión." — Torvalds*

**El Desafío:** el asistente consume una API key de pago, así que el free tier se limita por IP. Pero detrás de un proxy inverso, la aplicación ve la IP del proxy, no la del visitante: sin las cabeceras correctas, todas las consultas caen en el mismo balde y el primero que llega se lo come entero.

**La Resolución Defensiva:**
- Nginx propaga `X-Real-IP` y `X-Forwarded-For`, y la API resuelve la IP real desde ahí.
- El contador vive en Redis con TTL de 24h, y hay fallback en memoria si Redis no responde: que se caiga el cache no puede tirar el chat.
- Al agotarse el cupo no se corta con un error seco: se responde con mis datos de contacto, leídos de la parametría. El límite es una invitación a escribirme, no una pared.

## 🛡️ Torvalds Defender: podar lo que sobra

> *"Borrar código que funciona, porque no hacía falta, es más difícil que escribirlo." — Torvalds*

**El Desafío:** el proyecto arrancó como plataforma multi-tenant white-label: subdominios por usuario, registro público, cada visitante con su propio portfolio y su propia API key. Toda esa maquinaria —registro, verificación por email, resolución de subdominios, keys de terceros— funcionaba. Y no la necesitaba nadie: es *mi* portfolio.

**La Resolución Defensiva:**
- Se retiró el registro público y el dueño pasó a crearse por seeder, con las credenciales como única fuente de verdad en el entorno.
- Se eliminó el "traé tu propia API key" completo: la key es del servidor y el límite es por IP.
- El acceso de administración quedó en un comando de terminal deliberadamente ausente de la ayuda, con la contraseña pedida por prompt enmascarado para que no quede en el historial que el navegador persiste.
- El scoping por usuario en las queries se dejó intacto: sacarlo era una refactor enorme sin ningún beneficio. Podar no es arrasar.

Reconocer que sobre-diseñaste y volver atrás es una decisión de ingeniería como cualquier otra. La cuento porque es la parte del proyecto que más me enseñó.
