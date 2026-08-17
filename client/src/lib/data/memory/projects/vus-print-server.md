---
slug: vus-print-server
title: "Print Server — Daemon local de impresión térmica ESC/POS"
summary: "Microservicio puente en Node.js que corre como daemon en la terminal y traduce peticiones HTTP/JSON a comandos ESC/POS nativos para impresoras térmicas USB. Aísla al frontend de los drivers y las colas de impresión del sistema operativo."
priority: 7
techStack: [Node.js, JavaScript, ESC/POS, REST]
keywords: [vus, print-server, print server, impresion, impresora termica, esc-pos, escpos, daemon, microservicio, hardware, usb, spooler, cola de impresion, drivers, localhost]
---

# Portfolio: Print Server

## 🤖 Contexto para IA Conversacional
Un microservicio puente (Daemon) diseñado para abstraer la complejidad de hardware. Toma las peticiones del ecosistema VUS y las traduce a comandos ESC/POS nativos para interactuar con las impresoras térmicas conectadas a los quioscos.

## 📊 Flujo del Spooler Local
```mermaid
graph TD
    TOTEM[Frontend Totem App] -->|HTTP POST JSON| PS[Print Server Node]
    PS -->|Comandos ESC/POS| USB[Puerto USB Impresora]
    USB -->|Papel| FINAL[Ciudadano con Boleto]
```

## 🛡️ Torvalds Defender: Arquitectura de Hardware
> *"Nunca acoples el frontend directamente a los puertos del sistema operativo." — Torvalds*

**El Desafío:** Conectar directamente navegadores modernos a hardware legado de impresión térmica (COM/USB) mediante APIs experimentales o extensiones suele derivar en incompatibilidades a largo plazo.

**La Resolución Defensiva:**
- Se levantó un microservicio local (localhost daemon) en la terminal. El frontend envía un JSON limpio, y el Print Server maneja el *driver* y las colas de impresión a nivel del Sistema Operativo. Total aislamiento de responsabilidades.
