# Forzar soporte de colores ANSI
$env:TERM = "xterm-256color"

# Oh My Posh Prompt (tema slim = una sola línea)
oh-my-posh init pwsh --config "$env:POSH_THEMES_PATH\slim.omp.json" | Invoke-Expression

# Alias útiles
Set-Alias ll Get-ChildItem
Set-Alias vi nvim

# Mensaje de bienvenida
Write-Host "`Buenas! Terminal lista para despegar 🚀" -ForegroundColor Green
Write-Host ("─" * $Host.UI.RawUI.WindowSize.Width) -ForegroundColor Green