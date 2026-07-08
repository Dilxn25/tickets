# ============================================
# EUPHORIA - Vigilante del Servicio IA
# Mantiene el microservicio de recomendaciones SIEMPRE arriba.
# Si el proceso se cae por cualquier motivo, lo reinicia solo.
# Ejecutar:  .\vigilar-ia.ps1
# ============================================

Set-Location $PSScriptRoot

Write-Host ""
Write-Host "======================================" -ForegroundColor Magenta
Write-Host "  EUPHORIA IA - Vigilante activo      " -ForegroundColor Magenta
Write-Host "  http://localhost:8000/docs          " -ForegroundColor Green
Write-Host "  (Se reinicia solo si se cae)        " -ForegroundColor DarkGray
Write-Host "======================================" -ForegroundColor Magenta
Write-Host ""

while (1 -eq 1) {
    # "python -m uvicorn" evita depender de que el exe 'uvicorn' este en el PATH
    python -m uvicorn api:app --port 8000
    Write-Host ""
    Write-Host "[IA] El servicio se detuvo (o se cerro). Reiniciando en 3s..." -ForegroundColor Red
    Start-Sleep -Seconds 3
}
