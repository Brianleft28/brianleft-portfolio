#Requires -RunAsAdministrator

param(
    [switch]$SkipFonts,
    [switch]$SkipApps
)

Write-Host "🚀 Instalando dotfiles de Brian..." -ForegroundColor Cyan
Write-Host ("─" * 50) -ForegroundColor Green

# ===== 1. Instalar dependencias =====
if (-not $SkipApps) {
    Write-Host "`n📦 Instalando aplicaciones..." -ForegroundColor Yellow
    
$apps = @(
    "JanDeDobbeleer.OhMyPosh",
    "Neovim.Neovim"
)
    
    foreach ($app in $apps) {
        if (-not (winget list --id $app 2>$null | Select-String $app)) {
            Write-Host "  Instalando $app..." -ForegroundColor Gray
            winget install --id $app -e --silent
        } else {
            Write-Host "  ✓ $app ya instalado" -ForegroundColor Green
        }
    }
}

# ===== 2. Instalar Nerd Fonts =====
if (-not $SkipFonts) {
    Write-Host "`n🔤 Instalando Nerd Fonts..." -ForegroundColor Yellow
    
    $fontInstalled = [System.Reflection.Assembly]::LoadWithPartialName("System.Drawing") | Out-Null
    $fonts = (New-Object System.Drawing.Text.InstalledFontCollection).Families | Where-Object { $_.Name -like "*Cascadia*NF*" }
    
    if (-not $fonts) {
        oh-my-posh font install CascadiaCode
        Write-Host "  ✓ Cascadia Code NF instalada" -ForegroundColor Green
    } else {
        Write-Host "  ✓ Nerd Font ya instalada" -ForegroundColor Green
    }
}

# ===== 3. Configurar PowerShell Profile =====
Write-Host "`n⚙️ Configurando PowerShell profile..." -ForegroundColor Yellow

$profileDir = Split-Path $PROFILE -Parent
if (-not (Test-Path $profileDir)) {
    New-Item -ItemType Directory -Path $profileDir -Force | Out-Null
}

$dotfilesPath = $PSScriptRoot
$sourceProfile = Join-Path $dotfilesPath "powershell-profile.ps1"

# Crear symlink o copiar
if (Test-Path $PROFILE) {
    $backup = "$PROFILE.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Copy-Item $PROFILE $backup
    Write-Host "  Backup creado: $backup" -ForegroundColor Gray
}

Copy-Item $sourceProfile $PROFILE -Force
Write-Host "  ✓ Profile instalado en: $PROFILE" -ForegroundColor Green

# ===== 4. Configurar VS Code (opcional) =====
Write-Host "`n💻 Configurando VS Code terminal..." -ForegroundColor Yellow

$vscodeSettings = "$env:APPDATA\Code\User\settings.json"
if (Test-Path $vscodeSettings) {
    $settings = Get-Content $vscodeSettings -Raw | ConvertFrom-Json
    $settings | Add-Member -NotePropertyName "terminal.integrated.fontFamily" -NotePropertyValue "'Cascadia Code NF'" -Force
    $settings | ConvertTo-Json -Depth 10 | Set-Content $vscodeSettings
    Write-Host "  ✓ VS Code configurado con Nerd Font" -ForegroundColor Green
} else {
    Write-Host "  ⚠ VS Code settings no encontrado" -ForegroundColor Yellow
}

# ===== Finalizado =====
Write-Host "`n" + ("─" * 50) -ForegroundColor Green
Write-Host "✅ Instalación completada!" -ForegroundColor Green
Write-Host "   Reiniciá tu terminal para aplicar los cambios." -ForegroundColor Cyan
Write-Host "`n"