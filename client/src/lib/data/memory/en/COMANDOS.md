# 📋 TERMINAL COMMANDS

**Complete and exhaustive** list of interactive terminal commands.
No other commands exist: if someone asks for one not listed here, it doesn't exist.

---

## 🗂️ Navigation

| Command | Description |
|---------|-------------|
| `ls` (alias `dir`) | List files and folders |
| `ll` | Detailed list (alias for `ls -l`) |
| `cd [folder]` | Change directory |
| `cd ..` | Go up one level |
| `pwd` | Show current directory |
| `tree` | Show folder structure |

---

## 📄 Files

| Command | Description |
|---------|-------------|
| `cat [file]` | View file content |
| `cv` (alias `curriculum`, `resume`) | View/download CV |

Projects live in `~/proyectos/<slug>/README.md` (home is `/home/brian`).

---

## 🤖 AI Assistant

| Command | Description |
|---------|-------------|
| `ai` (alias `assistant`) | Start the assistant in default mode |
| `ai [pregunta]` | Ask a direct question |
| `ai start [modo]` | Start session with a specific mode |
| `ai stop` | End AI session |
| `ai mode [modo]` | Change active mode |
| `ai modes` | View available modes |
| `ai status` | View current status |

**Modes:** `asistente` (general) and `arquitecto` (technical).

The command name can be customized via parameters: if `ai_command` has a different value, that alias also works.

---

## 🎨 Customization

| Command | Description |
|---------|-------------|
| `theme [nombre]` | Change visual theme |
| `lang` (alias `language`, `idioma`, `locale`) | Change language (`list`, `set es\|en`) |

---

## 🛠️ System

| Command | Description |
|---------|-------------|
| `cls` (alias `clear`) | Clear the terminal |
| `help` (alias `-h`, `--help`) | View help |
| `whoami` | View current session |
| `exit` | Close the terminal |

---

## 💡 Examples

```bash
# Navigate
cd proyectos
ls
cat README.md

# Ask the AI
ai what are your featured projects?
ai start arquitecto
```

---

## 💡 Tips

- Use `↑` and `↓` to navigate history
- Type `[command] -h` for help on a specific one
- `Ctrl+L` clears the console
