---
slug: vus-totem
title: "Tótem App — Quiosco de autogestión Kiosk-UX"
summary: "Terminal táctil de autogestión en SvelteKit que emite e imprime un turno con un solo toque. Se rediseñó el flujo de éxito para eliminar los modales bloqueantes que dejaban la terminal trabada cuando el ciudadano se retiraba sin confirmar."
priority: 8
techStack: [SvelteKit, TypeScript, REST]
keywords: [vus, vus-totem, totem, totem-app, quiosco, kiosk, kiosk-ux, autogestion, pantalla tactil, sveltekit, emision de turnos, impresion, sweetalert, modales bloqueantes, ux]
---

# Portfolio: Totem App

## 🤖 Contexto para IA Conversacional
`totem-app` es el quiosco de autogestión de cara al ciudadano. Desarrollado en SvelteKit, su objetivo es ser a prueba de errores, ofreciendo una experiencia Kiosk-UX (interfaz de quiosco táctil) donde con 1 solo toque se genera un turno y se imprime un boleto, sin pasos intermedios.

## 📊 Diagrama de Emisión
```mermaid
sequenceDiagram
    participant C as Ciudadano
    participant T as Totem (Svelte)
    participant A as API (NestJS)
    participant P as Impresora

    C->>T: Toca 'Trámites'
    T->>A: POST /turnos/nuevo
    A-->>T: Código VUS-001
    T->>P: Print Spool (Silencioso)
    T->>T: Redirección inmediata al Inicio (0s)
```

## 🛡️ Torvalds Defender: UX Ininterrumpida
> *"Una terminal desatendida no puede esperar un clic del usuario para seguir existiendo." — Torvalds*

**El Desafío:** Al emitir un ticket exitosamente, la librería SweetAlert (`Swal.fire`) bloqueaba la pantalla con un mensaje "Éxito - Pulse OK", rompiendo la experiencia Kiosk-UX. Si el ciudadano se iba sin apretar "OK", la terminal quedaba trabada para el próximo usuario.

**La Resolución Defensiva:**
- Se eliminó tajantemente el uso de modales bloqueantes tras el éxito.
- La terminal despacha el turno a la cola de impresión e instantáneamente devuelve la vista a la pantalla de bienvenida.
- Las alertas visuales se restringieron exclusivamente a errores graves (ej. impresora sin papel), manteniendo la autonomía funcional del 100%.
