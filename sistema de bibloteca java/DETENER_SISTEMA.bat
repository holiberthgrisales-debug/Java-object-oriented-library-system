@echo off
title Detener Sistema de Biblioteca
cd /d "%~dp0"

echo        DETENIENDO SISTEMA DE BIBLIOTEC
echo.

powershell -NoProfile -Command "$pids = (Get-NetTCPConnection -LocalPort 3001,5173 -ErrorAction SilentlyContinue).OwningProcess | Select-Object -Unique; foreach($p in $pids){ if($p -and $p -gt 0){ Stop-Process -Id $p -Force -ErrorAction SilentlyContinue; Write-Host '[OK] Proceso detenido con PID:' $p } }"

echo.
echo [OK] El sistema de la biblioteca (Backend y Frontend) se ha detenido.
echo.
timeout /t 2 /nobreak >nul 2>&1
exit
