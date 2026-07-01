
# ============================================
# EUPHORIA - Iniciar todo el sistema
# Ejecutar: .\iniciar-euphoria.ps1
# ============================================

Write-Host ""
Write-Host "======================================" -ForegroundColor Magenta
Write-Host "   EUPHORIA - Iniciando Sistema       " -ForegroundColor Magenta
Write-Host "======================================" -ForegroundColor Magenta
Write-Host ""

$raiz = "c:\Users\arauc\Desktop\Tickets"

Write-Host "Limpiando conexiones de ejecuciones anteriores..." -ForegroundColor Yellow
Get-NetTCPConnection -LocalPort 3000, 5173, 8000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 1

# Iniciar SERVICIO IA (Recomendaciones) en nueva ventana
Write-Host "[1] Iniciando Servicio IA / Recomendaciones (puerto 8000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$raiz\euphoria-ia'; Write-Host '=== EUPHORIA IA (Recomendaciones) ===' -ForegroundColor Magenta; Write-Host 'http://localhost:8000/docs' -ForegroundColor Green; uvicorn api:app --port 8000"

Start-Sleep -Seconds 2

# Iniciar BACKEND en nueva ventana
Write-Host "[2] Iniciando Backend (puerto 3000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$raiz\euphoria-backend'; Write-Host '=== EUPHORIA BACKEND ===' -ForegroundColor Magenta; Write-Host 'http://localhost:3000' -ForegroundColor Green; npm run dev"

Start-Sleep -Seconds 2

# Iniciar FRONTEND en nueva ventana
Write-Host "[3] Iniciando Frontend (puerto 5173, accesible en red)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$raiz\euphoria-frontend'; Write-Host '=== EUPHORIA FRONTEND ===' -ForegroundColor Magenta; Write-Host 'http://localhost:5173' -ForegroundColor Green; npm run dev -- --host"

Start-Sleep -Seconds 3

# Abrir navegador local
Write-Host "[3] Abriendo navegador..." -ForegroundColor Cyan
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "  Sistema iniciado!                   " -ForegroundColor Green
Write-Host "  PC Local: http://localhost:5173     " -ForegroundColor Green
Write-Host ""

# ---- Deteccion de red y acceso desde celular ----
try {
    # Obtener TODAS las IPs de la maquina (excluir loopback y APIPA)
    $todasLasIPs = Get-NetIPAddress -AddressFamily IPv4 |
        Where-Object { $_.IPAddress -notmatch "^127\." -and $_.IPAddress -notmatch "^169\.254\." } |
        Select-Object -ExpandProperty IPAddress

    if ($todasLasIPs.Count -eq 0) {
        Write-Host "  (No se detectaron interfaces de red activas)" -ForegroundColor DarkGray
    } else {
        Write-Host "  >>> ACCESO DESDE CELULAR <<<" -ForegroundColor Yellow
        Write-Host ""

        foreach ($ip in $todasLasIPs) {
            # Identificar el tipo de red segun el rango de IP
            $tipoRed = switch -Regex ($ip) {
                "^192\.168\.1\."  { "Red Local (192.168.1.x) - probablemente tu casa/router WiFi" }
                "^192\.168\."     { "Red Local (192.168.x.x) - LAN privada" }
                "^10\.40\.50\."   { "Red Corporativa (10.40.50.x) - red de empresa/universidad" }
                "^10\."           { "Red Privada clase A (10.x.x.x)" }
                "^172\.(1[6-9]|2[0-9]|3[01])\." { "Red Privada clase B (172.16-31.x.x)" }
                default           { "Red desconocida" }
            }

            Write-Host "  Red detectada : $tipoRed" -ForegroundColor DarkCyan
            Write-Host "  IP de tu PC   : $ip" -ForegroundColor White
            Write-Host "  Abre en celular --> http://$($ip):5173" -ForegroundColor Cyan
            Write-Host ""
        }

        Write-Host "  REQUISITO: El celular debe estar en la misma red WiFi que esta PC." -ForegroundColor Yellow
        Write-Host "  Si usas datos moviles en el celular, NO funcionara (no esta en la misma red)." -ForegroundColor DarkGray
    }
} catch {
    Write-Host "  (No se pudo detectar la IP automaticamente - revisa la conexion de red)" -ForegroundColor DarkGray
}

Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "Presiona Enter para cerrar..."
Read-Host
