# PROYECTO: Middleware de Impresión RAW (.NET Print Server)

## Clasificación

- **Tipo:** Proyecto Privado (Corporativo)
- **Categoría:** Infraestructura / Integraciones
- **Estado:** Producción
- **Confidencialidad:** NDA — Solo arquitectura abstracta

## El Problema

Las aplicaciones web modernas (SPA, PWA) no pueden comunicarse nativamente con impresoras térmicas antiguas o industriales que usan protocolos como:

- **ZPL** (Zebra Programming Language) — Etiquetas industriales
- **ESC-POS** — Tickets de punto de venta

Los navegadores no tienen acceso al spooler de impresión. Los drivers gráficos son lentos y generan PDFs innecesarios.

## La Solución

Una **API RESTful** construida en **.NET 8** que se ejecuta como un **Servicio de Windows (Background Service)**.

### Arquitectura

```mermaid
flowchart LR
    A["🌐 Aplicación Web<br/>(Nube)"] -->|HTTP/JSON| B["⚙️ Print Server<br/>(.NET 8)"]
    B -->|RAW Bytes| C["🖨️ Windows Spooler<br/>(Impresora)"]
```

### Flujo de Datos

1. La app web envía un payload JSON con datos de impresión (puede ser Base64 o texto ZPL)
2. El servicio .NET recibe la petición en `localhost`
3. Convierte el payload a bytes crudos
4. Inyecta directamente al spooler del SO, saltándose drivers gráficos
5. La impresora recibe comandos nativos → Impresión instantánea

## Stack Técnico

- **.NET 8** con Worker Service template
- **Kestrel** como servidor HTTP embebido
- **P/Invoke** para comunicación con Win32 API (winspool.drv)
- Instalador como servicio de Windows (sc.exe o NSSM)

## Impacto

- Impresión **instantánea** (< 100ms) vs 2-5 segundos con drivers tradicionales
- Funciona desde cualquier navegador sin plugins
- Soporta múltiples impresoras simultáneas
- Zero configuración en el cliente

## Por qué es "Good Code"

- Resuelve un problema real que otros ignoran
- Arquitectura simple pero efectiva (localhost bridge)
- Desacopla completamente el frontend del hardware
- Fácil de deployar y mantener
