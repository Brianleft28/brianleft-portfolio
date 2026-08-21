# LinkedIn — Brian Benegas

> Consistencia de título: usá **el mismo** en LinkedIn, CV y sitio. Elegido:
> **Backend Developer · Systems Architecture** (ya está en el sitio). Evitá "Full Stack"
> en unos lados y "Arquitecto" en otros — las señales cruzadas restan. El typo
> "conocmiento" que tenías en el About lo corregí abajo.

---

## Headline (≤220 caracteres — es lo que se ve en búsquedas)

**EN (mercado primario):**
> Backend Developer · Node.js · TypeScript · NestJS | Production systems on Kubernetes | Open to remote (UTC-3)

**ES:**
> Desarrollador Backend · Node.js · TypeScript · NestJS | Sistemas en producción sobre Kubernetes | Abierto a remoto

---

## About (EN)

I build and run backend systems that stay up in front of the public, all day, unattended.

Right now I lead the innovation team at the Municipality of Ituzaingó, where I'm the primary engineer on VUS — a real-time queue-calling system on Kubernetes: kiosks, waiting-room screens, operator stations, thermal printing, live dashboard. The kind of system where every component fails differently and none of them can take the rest down.

What I actually do, in concrete terms:
• Took real-time events to multiple Kubernetes pods with Redis pub/sub for Socket.IO, after per-process in-memory state silently made the replicas non-interchangeable.
• Killed daily peak API timeouts by rewriting a non-SARGable query as a range scan — full table scan down to milliseconds.
• Flattened memory on always-on clients (unbounded Set → 60s LRU), and isolated thermal-printer drivers behind a small .NET daemon.
• Work end to end: backend and frontend, plus the Linux hosts, CI/CD and nginx/TLS that put it all in production.

I care about the unglamorous part: systems that degrade gracefully instead of failing silently, and changes that ship as data instead of deploys.

Stack: TypeScript, Node.js, NestJS, .NET, SvelteKit, MySQL, Redis, Docker, Kubernetes, Linux, GitLab CI/CD.

Open to remote backend roles. Portfolio + technical writeups: brianleft.com

---

## About (ES)

Construyo y opero sistemas backend que se mantienen en pie de cara al público, todo el día, desatendidos.

Hoy lidero el equipo de innovación del Municipio de Ituzaingó, donde soy el ingeniero principal de VUS — un llamador de turnos en tiempo real sobre Kubernetes: tótems, pantallas de sala de espera, puestos de operador, impresión térmica, dashboard en vivo. El tipo de sistema donde cada componente falla distinto y ninguno puede tirar al resto.

Lo que hago, en concreto:
• Llevé los eventos en tiempo real a múltiples pods de Kubernetes con Redis como pub/sub de Socket.IO, después de que el estado en memoria de cada proceso volviera las réplicas no intercambiables en silencio.
• Eliminé los timeouts de la API en el pico reescribiendo una consulta no-SARGable como un range scan — de full table scan a milisegundos.
• Dejé plana la memoria de clientes que nunca se apagan (Set sin límite → Map LRU de 60s), y aislé los drivers de impresoras térmicas detrás de un daemon en .NET.
• Trabajo de punta a punta: backend y frontend, más el Linux, el CI/CD y el nginx/TLS que lo ponen en producción.

Me importa la parte poco glamorosa: sistemas que degradan con gracia en vez de fallar en silencio, y cambios que se despliegan como datos y no como deploys.

Stack: TypeScript, Node.js, NestJS, .NET, SvelteKit, MySQL, Redis, Docker, Kubernetes, Linux, GitLab CI/CD.

Abierto a roles backend remotos. Portfolio y writeups técnicos: brianleft.com
