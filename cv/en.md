# Brian Benegas

Backend Developer · Systems Architecture
Buenos Aires, Argentina · UTC-3 · Open to remote
contactobrianleft@gmail.com · +54 11 3155 6315
github.com/Brianleft28 · linkedin.com/in/brian-benegas-44770729b · brianleft.com

---

## Summary

Backend developer building and operating public-sector systems that run unattended all day and cannot go down. I work end to end: backend and frontend, plus the Linux hosts, CI/CD pipelines, nginx and certificates that put them in production. Most of my work is hardening real-time systems under load — horizontal scaling, memory behaviour in long-running clients, and database access at peak. Currently leading the innovation team at the Municipality of Ituzaingó.

---

## Experience

### Municipality of Ituzaingó — Secretariat of Innovation and Technology

Buenos Aires, Argentina · September 2023 – Present
**Innovation Team Lead** (October 2024 – Present) · **Backend Developer** (September 2023 – October 2024)

Primary engineer on VUS, a real-time queue management system running daily across municipal offices: self-service kiosks, thermal ticket printing, waiting-room displays, operator stations, a live dashboard and historical analytics, deployed on Kubernetes.

- Resolved intermittent real-time event loss when scaling to multiple Kubernetes replicas by introducing Redis as a Socket.IO pub/sub adapter, removing per-process in-memory connection state that silently made pods non-interchangeable.
- Eliminated daily peak API timeouts by rewriting a non-SARGable query (`DATE(column) = CURDATE()`) as a pure range scan, restoring index usage and reducing a full table scan to milliseconds.
- Flattened memory growth on always-on waiting-room displays by replacing an unbounded Set with a 60-second LRU Map, and removed hand-rolled reconnection watchdogs in favour of Socket.IO's native exponential backoff.
- Eliminated duplicate call announcements with an ID-plus-state hash debounce over a 15-second anti-repeat window.
- Decoupled browsers from operating-system printer ports by building a local .NET daemon that translates JSON over HTTP into native ESC/POS commands, isolating thermal printer drivers behind a single replaceable component.
- Split a false monorepo — four microservices sharing one `.git` — into independent repositories with their own GitLab CI/CD pipelines, ending dependency collisions and cross-triggered builds.
- Separated a socket-driven live operations dashboard from historical analytics, so heavy aggregate queries never run on the real-time path.
- Made offices, services and queue behaviour runtime-configurable, so per-institution changes ship as data rather than as a new build.
- Built a recurring Node.js ETL migrating a monthly social-benefit roster from Excel into MySQL, keeping personal-data files out of version control by design and requiring explicit file selection through an interactive CLI to prevent silent reprocessing.
- Lead the innovation team, coordinate delivery between engineering and administrative departments, and train public officials on the systems shipped.

### Pidgeon Solutions — Co-founder

Buenos Aires, Argentina

- Co-founded a software services studio, working alongside a second engineer and a graphic designer.

---

## Selected Projects

**VUS — Municipal queue management system**
NestJS · SvelteKit · TypeScript · MySQL · TypeORM · Socket.IO · Redis · Kubernetes · .NET · GitLab CI/CD
Full ecosystem for public-facing service desks: touch kiosk, orchestration API, waiting-room screens, operator panel, ESC/POS print daemon, live dashboard and analytics. Built for heterogeneous hardware and unattended operation, where every component has to degrade without taking the rest down.

**brianleft.com — Interactive portfolio with a hand-written RAG pipeline**
SvelteKit · NestJS · TypeScript · MySQL · Redis · Docker · nginx
Portfolio navigated as a Linux console, answering questions about my work through a retrieval pipeline written step by step in TypeScript — document ingestion, LLM keyword extraction, relevance retrieval, context assembly and streaming — with no workflow engine in between. Self-hosted end to end on my own VPS, including nginx, TLS and deployment.

**SØREN — Computer vision over an unattended process**
Python · OpenCV · Tesseract · Discord Webhooks
Reads an external process's state through OCR and pixel analysis, without touching its memory or network traffic, and acts on it. Runs for hours unsupervised; the interesting part is not the automation but recovering on its own when conditions change underneath.

---

## Skills

**Languages** · TypeScript, JavaScript, C#, Python, SQL
**Backend** · Node.js, NestJS, .NET, TypeORM, Socket.IO, REST APIs
**Frontend** · SvelteKit, Svelte
**Data** · MySQL, MongoDB, Redis
**Infrastructure** · Docker, Kubernetes, nginx, Linux (Debian, Ubuntu, Arch), GitLab CI/CD, PM2, VPS administration
**Practices** · SOLID, clean code, defensive programming for 24/7 systems, Git, Jira, Postman

---

## Education

**Technical Degree in Software Development** — Regional University Center of Ituzaingó · 2023 – Present

## Languages

Spanish (native) · English (advanced)

## Courses

Platzi, 2024 — C# programming, .NET fundamentals, data management with LINQ, SOLID principles, object-oriented programming, best practices and clean code, advanced TypeScript types and functions.
