# PROFESSIONAL PROFILE — {{owner_name}}

I'm {{owner_first_name}}. {{owner_role}}, based in {{owner_location}}.

"{{owner_philosophy}}"

{{owner_bio}}

## How I Work

I'm ambitious and I'm tidy, and I don't think those pull in opposite directions. I take on large systems, but I don't leave code half-finished or infrastructure undocumented. What interests me most isn't the new feature: it's finding the exact point where a system breaks under load, or unattended at 3 in the morning, and hardening it.

I work end to end: I write the backend and the frontend, but I also run the Linux box it lives on, build the CI/CD that ships it, and configure the nginx that serves it and the certificate that secures it. I don't outsource the "I'll put it in production later" part.

## What I've Worked On

A good part of my experience is in the public sector and govtech — systems used by real people, at a service counter, every day, that simply cannot go down. That's where I learned to program defensively. But it isn't the ceiling of what I do, nor the only place I want to work.

Some specific problems I've solved and can explain in detail:

- **Database Performance:** a non-SARGable query (`DATE(column) = CURDATE()`) threw the index away and forced a Full Table Scan precisely during peak transactional load, causing the API to throw `TIMEOUT_ERROR`. I rewrote it as a plain range comparison and it started answering in milliseconds.
- **24/7 Systems:** screens that never get switched off accumulated queue-ticket markers in an unbounded `Set`. I replaced it with a bounded, LRU-style `Map` that expires entries after 60 seconds, so the memory footprint stays flat for good.
- **Real-time:** a debounce keyed on an `id + state` hash to kill duplicate socket events, and I dropped the hand-rolled watchdogs in favour of Socket.IO's own exponential backoff.
- **Kiosk-UX:** I took the blocking modals out of an unattended terminal. A terminal can't sit waiting for a click in order to keep existing.
- **Legacy Hardware:** I put ESC/POS thermal printers behind a local .NET daemon instead of coupling the browser to the operating system's ports.
- **Repo Architecture:** I broke up a fake monorepo where every microservice shared one `.git`, along with the dependency collisions and the CI/CD that never knew what it was building.
- **RAG without a framework:** this very portfolio. Document ingestion, keyword extraction with an LLM, relevance-based retrieval and context building, all written by hand in TypeScript.

## Where to Find Me

- GitHub: {{social_github}}
- LinkedIn: {{social_linkedin}}
- Email: {{owner_email}}

{{contact_availability}}

---

## Featured Projects

<!-- projects:auto:start -->
<!-- projects:auto:end -->

---

## Note for {{ai_name}}

This document is written in the first person because it is my source material. You speak *about* me: rephrase in the third person, using Rioplatense Spanish, in a technical and direct manner.

- When asked about a project, explain **the problem and how it was solved**, not just the stack.
- Each project has its own detailed document; visitors can read it in full with `cat ~/proyectos/<slug>/README.md`.
- If you don't know something, state it and offer contact information. Do not invent experience, clients, or technologies.
- **Do not invent commands.** The complete list is in `COMANDOS.md`: if a command is not listed there, it does not exist. There are no `login`, `sudo`, `register`, `apikey`, or administration commands.
