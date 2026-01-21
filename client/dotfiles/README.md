# 🚀 Dotfiles de Brian

> **Docs as Code**: Esta documentación ES la fuente de verdad. Si algo no está acá, no existe.

Configuración portable para PowerShell + Oh My Posh.

## ¿Qué hace este setup?

| Paso | Acción |
|------|--------|
| 1 | Instala **Oh My Posh** y **Neovim** via winget |
| 2 | Instala **Cascadia Code NF** (Nerd Font) |
| 3 | Copia el profile de PowerShell a `$PROFILE` |
| 4 | Configura VS Code para usar la Nerd Font |

## Instalación rápida

```powershell
# Clonar el repo
git clone https://github.com/brianleft/brianleft-portfolio.git
cd brianleft-portfolio/dotfiles

# Ejecutar setup (como administrador)
.\setup.ps1
```

## Opciones

```powershell
.\setup.ps1 -SkipFonts   # No instalar fuentes
.\setup.ps1 -SkipApps    # No instalar apps
```

## Estructura

| Archivo | Descripción |
|---------|-------------|
| `powershell-profile.ps1` | Profile de PowerShell con Oh My Posh |
| `setup.ps1` | Script de instalación automatizada |
| `README.md` | Esta documentación (fuente de verdad) |

## Personalización

Para cambiar el tema del prompt, editá `powershell-profile.ps1`:

```powershell
# Temas de una línea: slim, pure, atomic, minimal
# Temas de dos líneas: paradox, agnoster, powerlevel10k_rainbow
oh-my-posh init pwsh --config "$env:POSH_THEMES_PATH\slim.omp.json" | Invoke-Expression
```

Ver todos los temas: `Get-PoshThemes`

## Requisitos

- Windows 10/11
- PowerShell 7+
- Winget
