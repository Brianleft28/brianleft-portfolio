# PERFIL PROFESIONAL — {{owner_name}}

Soy {{owner_first_name}}. {{owner_role}}, desde {{owner_location}}.

"{{owner_philosophy}}"

{{owner_bio}}

## Cómo trabajo

Soy ambicioso y prolijo, y no creo que sean cosas opuestas. Me meto con sistemas grandes, pero no dejo el código a medio terminar ni la infra sin documentar. Lo que más me interesa no es la feature nueva: es encontrar el punto exacto donde un sistema se rompe bajo carga, o desatendido a las 3 de la mañana, y blindarlo.

Me manejo de punta a punta: escribo el backend y el frontend, pero también administro el Linux donde corre, armo el CI/CD que lo despliega, configuro el nginx que lo publica y el certificado que lo asegura. No tercerizo el "después lo subo a producción".

## En qué trabajé

Buena parte de mi experiencia es en sector público y govtech — sistemas que usa gente real, en ventanilla, todos los días, y que no se pueden caer. Ahí aprendí a programar a la defensiva. Pero no es el techo de lo que hago ni el único lugar donde me interesa meterme.

Algunos problemas concretos que resolví y que puedo explicar en detalle:

- **Performance de base de datos:** una consulta no-SARGable (`DATE(campo) = CURDATE()`) anulaba el índice y forzaba Full Table Scan justo en el pico transaccional, tirando la API por `TIMEOUT_ERROR`. La reescribí con rangos puros y pasó a resolver en milisegundos.
- **Sistemas 24/7:** pantallas que corrían todo el día acumulaban turnos en un `Set` infinito. Lo cambié por un `Map` acotado tipo LRU que auto-expira a los 60 segundos y deja la huella de RAM plana de por vida.
- **Tiempo real:** debounce por hash `ID + Estado` para matar eventos de socket duplicados, y saqué los watchdogs artesanales para confiar en el exponential backoff nativo de Socket.IO.
- **Kiosk-UX:** saqué los modales bloqueantes de una terminal desatendida. Una terminal no puede quedarse esperando un clic para seguir existiendo.
- **Hardware legado:** aislé impresoras térmicas ESC/POS detrás de un daemon local en .NET en vez de acoplar el navegador a los puertos del sistema.
- **Arquitectura de repos:** desarmé un monorepo falso donde todos los microservicios compartían un único `.git`, con las colisiones de dependencias y el CI/CD caótico que eso trae.
- **RAG sin framework:** este mismo portfolio. Ingesta de documentos, extracción de keywords con LLM, recuperación por relevancia y armado de contexto, escritos a mano en TypeScript.

## Dónde encontrarme

- GitHub: {{social_github}}
- LinkedIn: {{social_linkedin}}
- Email: {{owner_email}}

{{contact_availability}}

---

## Proyectos Destacados

<!-- projects:auto:start -->
<!-- projects:auto:end -->

---

## Nota para {{ai_name}}

Este documento está escrito en primera persona porque es mi material fuente. Vos hablás *sobre* mí: reformulá en tercera persona, en español rioplatense, técnico y directo.

- Cuando pregunten por un proyecto, contá **el problema y cómo se resolvió**, no sólo el stack.
- Cada proyecto tiene su documento propio con más detalle; el visitante puede leerlo entero con `cat ~/proyectos/<slug>/README.md`.
- Si no sabés algo, decilo y ofrecé el contacto. No inventes experiencia, clientes ni tecnologías.
- **Tampoco inventes comandos.** La lista completa está en `COMANDOS.md`: si un comando no figura ahí, no existe. No hay `login`, ni `sudo`, ni `register`, ni `apikey`, ni comandos de administración.
