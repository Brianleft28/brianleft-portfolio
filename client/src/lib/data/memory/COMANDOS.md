# 📋 COMANDOS DE TERMINAL

Lista completa de comandos disponibles en la terminal interactiva.

---

## 🗂️ Navegación y Archivos

| Comando | Descripción |
|---------|-------------|
| `ls` o `dir` | Listar archivos y carpetas |
| `ll` | Lista detallada (alias de ls -l) |
| `cd [carpeta]` | Cambiar de directorio |
| `cd ..` | Subir un nivel |
| `pwd` | Mostrar directorio actual |
| `cat [archivo]` | Ver contenido de un archivo |
| `tree` | Mostrar estructura de carpetas |

---

## 🔐 Autenticación

| Comando | Descripción |
|---------|-------------|
| `register -u [user] -e [email] -p [pass]` | Crear cuenta |
| `register -u [user] -e [email] -p [pass] -n "Nombre" -r developer` | Cuenta con nombre y rol |
| `verify [código]` | Verificar email con código de 6 dígitos |
| `verify resend` | Reenviar código de verificación |
| `login` | Abrir panel de login |
| `login -u [user] -p [pass]` | Iniciar sesión desde terminal |
| `logout` | Cerrar sesión |
| `whoami` | Ver información del usuario actual |

---

## 🤖 Asistente IA

| Comando | Descripción |
|---------|-------------|
| `ai` | Iniciar asistente IA en modo por defecto |
| `ai [pregunta]` | Hacer una pregunta directa |
| `ai start [modo]` | Iniciar sesión con modo específico |
| `ai stop` | Terminar sesión de IA |
| `ai mode [modo]` | Cambiar modo activo |
| `ai modes` | Ver modos disponibles |
| `ai status` | Ver estado actual |

**Modos disponibles:**
- `asistente` - Asistente general amigable
- `arquitecto` - Modo técnico para arquitectura

---

## 🎨 Personalización

| Comando | Descripción |
|---------|-------------|
| `theme [nombre]` | Cambiar tema visual |
| `apikey [key]` | Configurar API key de Gemini |
| `apikey clear` | Eliminar API key guardada |

---

## 🛠️ Sistema

| Comando | Descripción |
|---------|-------------|
| `cls` o `clear` | Limpiar terminal |
| `help` o `-h` | Ver ayuda general |
| `admin` | Abrir panel de administración |
| `admin settings` | Abrir configuración |
| `admin projects` | Abrir gestión de proyectos |
| `cv` o `resume` | Ver/descargar CV |
| `email` | Abrir formulario de contacto |

---

## 💡 Ejemplos

```bash
# Registrarse
register -u miusuario -e mi@email.com -p miPassword123

# Registrarse con nombre y rol
register -u miusuario -e mi@email.com -p miPassword123 -n "Mi Nombre" -r developer

# Verificar email (el prompt cambia a codigo:\>)
verify 123456

# Login desde terminal
login -u miusuario -p miPassword123

# Navegar
cd proyectos
ls
cat README.md

# Preguntar a la IA
ai ¿Cuáles son tus proyectos destacados?
ai start arquitecto
```

---

## 💡 Tips

- Usa `Tab` para autocompletar comandos
- Usa `↑` y `↓` para navegar el historial
- Escribe `[comando] -h` para ver ayuda específica
- La mayoría de comandos tienen aliases (ej: `dir` = `ls`, `clear` = `cls`)
