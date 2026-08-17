# 📋 COMANDOS DE TERMINAL

Lista **completa y exhaustiva** de los comandos de la terminal interactiva.
No existe ningún otro comando: si alguien pregunta por uno que no está acá, no existe.

---

## 🗂️ Navegación

| Comando | Descripción |
|---------|-------------|
| `ls` (alias `dir`) | Listar archivos y carpetas |
| `ll` | Lista detallada (alias de `ls -l`) |
| `cd [carpeta]` | Cambiar de directorio |
| `cd ..` | Subir un nivel |
| `pwd` | Mostrar directorio actual |
| `tree` | Mostrar estructura de carpetas |

---

## 📄 Archivos

| Comando | Descripción |
|---------|-------------|
| `cat [archivo]` | Ver contenido de un archivo |
| `cv` (alias `curriculum`, `resume`) | Ver/descargar el CV |

Los proyectos viven en `C:/proyectos/<slug>/README.md`.

---

## 🤖 Asistente IA

| Comando | Descripción |
|---------|-------------|
| `ai` (alias `assistant`) | Iniciar el asistente en el modo por defecto |
| `ai [pregunta]` | Hacer una pregunta directa |
| `ai start [modo]` | Iniciar sesión con un modo específico |
| `ai stop` | Terminar la sesión de IA |
| `ai mode [modo]` | Cambiar el modo activo |
| `ai modes` | Ver los modos disponibles |
| `ai status` | Ver el estado actual |

**Modos:** `asistente` (general) y `arquitecto` (técnico).

El nombre del comando puede estar personalizado desde la parametría: si `ai_command`
tiene otro valor, ese alias también funciona.

---

## 🎨 Personalización

| Comando | Descripción |
|---------|-------------|
| `theme [nombre]` | Cambiar el tema visual |
| `lang` (alias `language`, `idioma`, `locale`) | Cambiar idioma (`list`, `set es\|en`) |

---

## 🛠️ Sistema

| Comando | Descripción |
|---------|-------------|
| `cls` (alias `clear`) | Limpiar la terminal |
| `help` (alias `-h`, `--help`) | Ver la ayuda |
| `whoami` | Ver la sesión actual |
| `exit` | Cerrar la terminal |

---

## 💡 Ejemplos

```bash
# Navegar
cd proyectos
ls
cat README.md

# Preguntar a la IA
ai ¿cuáles son tus proyectos destacados?
ai start arquitecto
```

---

## 💡 Tips

- Usá `↑` y `↓` para navegar el historial
- Escribí `[comando] -h` para ver la ayuda específica
- `Ctrl+L` limpia la consola
