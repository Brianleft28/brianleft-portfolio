---
slug: vus
title: "VUS — Sistema llamador de turnos para atención al público"
summary: "Un llamador: el sistema que ordena la cola de un edificio con atención al público. El ciudadano saca turno en un tótem, la pantalla lo llama, el operador lo atiende. Tótem, backend, pantallas, impresión térmica, dashboard en vivo, analítica histórica y despliegue en Kubernetes — corriendo todo el día en un municipio, sin poder caerse. En Ituzaingó se lo conoce como VUS, Ventanilla Única Simplificada."
priority: 10
techStack: [NestJS, SvelteKit, TypeScript, MySQL, TypeORM, Socket.io, Redis, Chart.js, Node.js, Docker, Kubernetes, PM2, ESC/POS, GitLab CI/CD]
keywords: [vus, vus app, ventanilla unica, ventanilla unica simplificada, llamador, llamador de turnos, turnero, sistema de turnos, gestion de colas, smart queue management, municipio, ituzaingo, govtech, sector publico, totem, kiosk, autogestion, pantallas, smart tv, sala de espera, operador, box, atencion al publico, impresion termica, esc-pos, print server, nestjs, sveltekit, typeorm, mysql, socket.io, websockets, tiempo real, redis, pub/sub, adapter, pods, kubernetes, escalado horizontal, replicas, dashboard, dashboard en vivo, analitica, metricas, chart.js, graficos, parametria, configuracion, pm2, vps, gitlab, ci/cd, sargable, memory leak, monorepo]
---

# Portfolio: VUS — Llamador de turnos

## 🤖 Contexto para IA Conversacional

Es un **llamador**: el sistema que ordena la cola en un edificio con atención al público. El ciudadano llega, saca un turno en una terminal táctil y se sienta; una pantalla lo llama por número y oficina; un operador lo atiende desde su puesto y cierra el turno. En el Municipio de Ituzaingó se lo conoce como **VUS (Ventanilla Única Simplificada)**, pero el nombre institucional describe la política, no el software: técnicamente es un sistema de gestión de colas en tiempo real.

Lo que lo hace interesante no es el dominio —un turnero es conceptualmente simple— sino las condiciones: corre todo el día, con hardware heterogéneo, gente real esperando, y nadie mirando los logs. Cada componente falla distinto y todos tienen que degradar sin tirar el resto.

## 📊 Arquitectura

```mermaid
flowchart TD
    C([Ciudadano]) -->|toque| T[Tótem de autogestión<br/>SvelteKit]
    T -->|POST /turnos| API[VUS API<br/>NestJS + TypeORM]
    API -->|cola de impresión| PS[Print Server<br/>daemon local Node.js]
    PS -->|ESC/POS por USB| PR([Impresora térmica])
    PR --> B([Boleto físico])

    API <-->|persistencia| DB[(MySQL)]
    API <-->|pub/sub entre pods| R[(Redis)]
    API -->|WebSocket| F[VUS Front<br/>SvelteKit]

    F --> TV([Smart TVs · sala de espera])
    F --> BOX([Puestos de atención])
    F --> DASH([Dashboard en vivo])

    BOX -->|cambio de estado| API
    DB --> AN([Analítica histórica])
```

## 🧩 Los componentes

- **Tótem** (SvelteKit) — terminal táctil de autogestión. Un toque, un turno, un boleto impreso.
- **API** (NestJS + TypeORM + MySQL) — el motor: oficinas, turnos, auditoría de estados y broadcast por WebSocket.
- **Front** (SvelteKit + Socket.IO) — los televisores de sala de espera y el panel del operador.
- **Dashboard** (Chart.js) — la foto del momento: qué está pasando **ahora** en el edificio. Se alimenta de los mismos eventos de socket que las pantallas, así que se mueve solo.
- **Analítica** (Chart.js) — lo contrario del dashboard: consulta histórica sobre datos ya cerrados. Tiempos de atención, volumen por oficina, comportamiento por franja horaria.
- **Print Server** (Node.js) — daemon local que traduce HTTP/JSON a comandos ESC/POS nativos.
- **Parametría** — oficinas, servicios y comportamiento del llamador se configuran desde el sistema, sin tocar código ni redeployar. Lo que cambia según la institución es dato, no build.
- **Infraestructura** — Kubernetes con múltiples pods, Redis, MySQL y CI/CD en GitLab.

Dashboard y analítica comparten la librería de gráficos pero no el problema: uno tiene que reaccionar en milisegundos a un evento y el otro tiene que agregar meses de registros sin tumbar la base. Mezclarlos en una sola vista "que hace las dos cosas" hubiera terminado con consultas pesadas corriendo en tiempo real.

---

## 🛡️ Torvalds Defender: la consulta que tiraba la API

> *"Una consulta no-SARGable en producción es un crimen contra la base de datos." — Torvalds*

**El Desafío:** el sistema colapsaba con `TIMEOUT_ERROR` justo al generar el primer llamado del día. La concurrencia de inserciones de histórico chocaba con lecturas completas porque la consulta usaba `DATE(createdAt) = CURDATE()`. Envolver la columna en una función anula el índice y obliga a un Full Table Scan — precisamente durante el pico transaccional de la mañana.

**La Resolución Defensiva:**
- Se reescribió la capa de datos con rangos puros: `createdAt >= CURDATE() AND createdAt < CURDATE() + INTERVAL 1 DAY`.
- Al volver la consulta **SARGable**, MySQL aplica el índice y resuelve en milisegundos lo que antes tumbaba la API.
- Se separaron los estados en el canal de Socket.IO para que la conexión TCP efímera no tenga fricción con el ciclo de vida del JWT.

## 🛡️ Torvalds Defender: el llamado que se perdía entre pods

> *"Escalar horizontal un sistema con estado en memoria no lo hace más grande: lo hace inconsistente." — Torvalds*

**El Desafío:** al pasar a Kubernetes con varias réplicas, los llamados empezaron a fallar de forma intermitente y desconcertante: un turno se llamaba y **algunas pantallas no se enteraban**. No era un error, no había excepción, no había nada en los logs.

La causa: Socket.IO mantiene las conexiones en la memoria del proceso. Con un solo pod eso alcanza. Con varios, cada uno conoce únicamente a los clientes conectados a él. Cuando un operador llamaba un turno y su request caía en el pod A, el evento se emitía sólo a los clientes de A — las pantallas conectadas al pod B se quedaban esperando algo que nunca iba a llegar. Y como el balanceador reparte, qué pantalla veía qué llamado dependía del azar.

**La Resolución Defensiva:**
- Se sumó **Redis como canal pub/sub entre pods**: cada instancia publica sus eventos y está suscrita a los del resto, así que emitir desde cualquier pod alcanza a todos los clientes, sin importar dónde estén conectados.
- El estado de las conexiones deja de vivir sólo en la memoria de un proceso: los pods pasan a ser realmente intercambiables, que es la premisa que Kubernetes asume y que el código no estaba cumpliendo.
- Es la lección de fondo: **escalar horizontal no es sólo levantar más réplicas**. Todo lo que estaba implícitamente en memoria —conexiones, sesiones, caché— hay que sacarlo afuera antes, o el sistema empieza a funcionar "a veces".

## 🛡️ Torvalds Defender: pantallas que viven para siempre

> *"Memory leaks y sockets no controlados destruyen sistemas 24/7." — Torvalds*

**El Desafío:** las pantallas de sala de espera no se apagan nunca. Acumulaban marcadores de turnos en un `Set` sin límite —un leak lento pero seguro— y tenían watchdogs artesanales que forzaban reconexiones de WebSocket cada 10 segundos, peleándose con el ciclo natural de la librería. Efecto colateral: el audio de un mismo llamado se disparaba varias veces.

**La Resolución Defensiva:**
1. **LRU acotado:** el `Set` infinito pasó a ser un `Map` que auto-elimina registros de más de 60 segundos. La huella de RAM queda plana de por vida.
2. **Debounce acorazado:** hash absoluto `ID + Estado` con ventana anti-repetición de 15 segundos, que bloquea eventos de socket concurrentes e idénticos.
3. **Resiliencia delegada:** fuera los watchdogs propios; se confía en el *exponential backoff* nativo de Socket.IO, con HTTP polling de 60s sólo como último recurso.

## 🛡️ Torvalds Defender: una terminal no espera un clic

> *"Una terminal desatendida no puede esperar un clic del usuario para seguir existiendo." — Torvalds*

**El Desafío:** al emitir el ticket, un modal de éxito bloqueaba la pantalla con "Pulse OK". Si el ciudadano agarraba su boleto y se iba —que es exactamente lo que hace cualquiera— la terminal quedaba trabada para el siguiente.

**La Resolución Defensiva:** se eliminaron los modales bloqueantes del flujo de éxito. El tótem despacha el turno a la cola de impresión y vuelve solo a la pantalla de bienvenida, sin pasos intermedios. El estado por defecto de un quiosco tiene que ser "listo para el próximo".

## 🛡️ Torvalds Defender: el navegador no habla con el puerto USB

> *"Nunca acoples el frontend directamente a los puertos del sistema operativo." — Torvalds*

**El Desafío:** conectar navegadores modernos con impresoras térmicas por COM/USB, vía APIs experimentales o extensiones, es una deuda técnica que se cobra en la próxima actualización del navegador.

**La Resolución Defensiva:** un microservicio local (daemon en localhost) en cada terminal. El frontend manda un JSON limpio; el daemon se encarga del driver, del protocolo ESC/POS y de la cola de impresión a nivel sistema operativo. Aislamiento total de responsabilidades: si cambia la impresora, cambia un solo componente.

## 🛡️ Torvalds Defender: el monorepo que no era

> *"No mezcles peras con manzanas. Un monorepo falso es una bomba de tiempo." — Torvalds*

**El Desafío:** los cuatro microservicios vivían dentro de un único `.git` compartido. No era un monorepo con herramientas de monorepo: era una carpeta grande. Colisiones de dependencias, scripts que se pisaban y un CI/CD que no sabía qué estaba construyendo.

**La Resolución Defensiva:** se separó cada servicio en su propio repositorio con su ciclo de vida independiente, y se apuntó el CI a la infraestructura interna del municipio.

## 🛡️ Torvalds Defender: mixed content y entornos

> *"La configuración del entorno nunca debe estar hardcodeada. Nunca." — Torvalds*

**El Desafío:** en producción aparecían errores de *mixed content*: frontends servidos por HTTPS intentando hablar con endpoints HTTP hardcodeados.

**La Resolución Defensiva:** inyección dinámica de protocolo. Los frontends leen `window.location.protocol` y ascienden automáticamente a `https://` y `wss://` cuando el proxy provee certificados, sin tocar la capa de entorno de Vite y sin duplicar builds por ambiente.

---

## 📌 Nota

La versión más reciente del código vive en un GitLab interno del municipio, no en un repositorio público. Lo documentado acá refleja la arquitectura y las decisiones técnicas, no una copia del código actual.
