@echo off
title Sistema de Biblioteca
setlocal enabledelayedexpansion

set "BASE_DIR=%~dp0"
set "SISTEMA_DIR=%BASE_DIR%sistema-biblioteca"

echo     INICIANDO SISTEMA DE BIBLIOTECA
echo.

REM cierra procesos viejos en los puertos 3001 y 5173
powershell -NoProfile -Command "$pids = (Get-NetTCPConnection -LocalPort 3001,5173 -ErrorAction SilentlyContinue).OwningProcess | Select-Object -Unique; foreach($p in $pids){ if($p -and $p -gt 0){ Stop-Process -Id $p -Force -ErrorAction SilentlyContinue } }" >nul 2>&1

if not exist "%SISTEMA_DIR%\app\biblioteca.jar" (
    echo [ERROR] No se encontro el archivo compilado.
    echo Por favor, ejecuta primero INSTALAR_DEPENDENCIAS.bat
    pause
    exit /b 1
)

echo [1/1] Iniciando servidor Biblioteca (Java + Web) en puerto 3001...
start "Biblioteca Core" /D "%SISTEMA_DIR%" /min java -jar "%SISTEMA_DIR%\app\biblioteca.jar"

echo.
echo Esperando a que el servidor web este listo en http://localhost:3001...
powershell -NoProfile -Command "$ready=$false; for($i=0; $i -lt 15; $i++){ try{ $res = Invoke-WebRequest -Uri 'http://localhost:3001' -UseBasicParsing -TimeoutSec 1; if($res.StatusCode -eq 200){ $ready=$true; break; } }catch{} Start-Sleep -Seconds 1 } if(-not $ready){ Write-Host '[AVISO] El servidor tardo un poco mas en responder.' }"

start "" "http://localhost:3001"

echo.
echo ===================================================================
echo  SISTEMA DE BIBLIOTECA INICIADO CORRECTAMENTE!
echo ===================================================================
echo  - Aplicacion Web: http://localhost:3001
echo  - Swagger UI:     http://localhost:3001/swagger-ui
echo.
echo  Para apagar el servidor, cierra la ventana de Java o ejecuta 'DETENER_SISTEMA.bat'
echo ===================================================================
echo.
timeout /t 3 /nobreak >nul 2>&1
exit
