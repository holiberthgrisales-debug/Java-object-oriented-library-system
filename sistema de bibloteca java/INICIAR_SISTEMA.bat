@echo off
title Sistema de Biblioteca
setlocal enabledelayedexpansion

REM rutas del proyecto
set "BASE_DIR=%~dp0"
set "SISTEMA_DIR=%BASE_DIR%sistema-biblioteca"
set "FRONTEND_DIR=%SISTEMA_DIR%\frontend"

echo     INICIANDO SISTEMA DE BIBLIOTECA
echo.

REM cierra procesos viejos en los puertos 3001 y 5173
powershell -NoProfile -Command "$pids = (Get-NetTCPConnection -LocalPort 3001,5173 -ErrorAction SilentlyContinue).OwningProcess | Select-Object -Unique; foreach($p in $pids){ if($p -and $p -gt 0){ Stop-Process -Id $p -Force -ErrorAction SilentlyContinue } }" >nul 2>&1

REM busca java en la carpeta o en el sistema
set "JAVA_EXE="
if exist "%SISTEMA_DIR%\runtime\bin\java.exe" (
    set "JAVA_EXE=%SISTEMA_DIR%\runtime\bin\java.exe"
    echo [OK] Utilizando Java embebido.
) else (
    where java >nul 2>nul
    if !errorlevel! equ 0 (
        set "JAVA_EXE=java"
        echo [OK] Utilizando Java del sistema.
    )
)

if "%JAVA_EXE%"=="" (
    echo.
    echo [ERROR] No se encontro Java Portable ni Java instalado en el equipo.
    echo Por favor asegurese de no haber eliminado la carpeta 'runtime'.
    echo.
    pause
    exit /b 1
)

REM revisa si existe el jar
if not exist "%SISTEMA_DIR%\app\biblioteca.jar" (
    echo [AVISO] No se encontro '%SISTEMA_DIR%\app\biblioteca.jar'.
    echo Buscando Maven para compilar el backend...
    set "MVN_EXE="
    where mvn >nul 2>nul
    if !errorlevel! equ 0 (
        set "MVN_EXE=mvn"
    ) else if exist "C:\Users\G\Downloads\apache-maven-3.9.16\bin\mvn.cmd" (
        set "MVN_EXE=C:\Users\G\Downloads\apache-maven-3.9.16\bin\mvn.cmd"
    ) else if exist "%USERPROFILE%\Downloads\apache-maven-3.9.16\bin\mvn.cmd" (
        set "MVN_EXE=%USERPROFILE%\Downloads\apache-maven-3.9.16\bin\mvn.cmd"
    ) else if exist "%BASE_DIR%maven\bin\mvn.cmd" (
        set "MVN_EXE=%BASE_DIR%maven\bin\mvn.cmd"
    )

    if not "!MVN_EXE!"=="" (
        echo [OK] Maven detectado en !MVN_EXE!. Compilando el proyecto...
        call "!MVN_EXE!" -f "%SISTEMA_DIR%\java-core\pom.xml" clean package -DskipTests
        if not exist "%SISTEMA_DIR%\app\biblioteca.jar" (
            echo [ERROR] La compilacion con Maven no genero el archivo JAR.
            pause
            exit /b 1
        )
        echo [OK] Backend compilado exitosamente.
    ) else (
        echo.
        echo [ERROR] No se encontro Maven en el PATH ni en la carpeta Downloads.
        echo Para compilar el backend, instale Maven o ejecute 'COMPILAR.bat'.
        echo.
        pause
        exit /b 1
    )
)

REM revisa si el frontend esta compilado en dist/
if not exist "%FRONTEND_DIR%\dist\index.html" (
    echo [AVISO] No se encontro '%FRONTEND_DIR%\dist\index.html'.
    echo Compilando frontend por primera vez con npm...
    where npm.cmd >nul 2>nul
    if !errorlevel! equ 0 (
        cd /d "%FRONTEND_DIR%"
        call npm.cmd run build
        cd /d "%BASE_DIR%"
    ) else (
        echo [AVISO] npm no detectado. El servidor iniciara en modo solo API.
    )
)

REM arrancar el servidor unificado (Backend + Frontend en puerto 3001)
echo [1/1] Iniciando servidor Biblioteca (Java + Web) en puerto 3001...
start "Biblioteca Core" /D "%SISTEMA_DIR%" /min "%JAVA_EXE%" -jar "%SISTEMA_DIR%\app\biblioteca.jar"

REM espera que el servidor responda
echo.
echo Esperando a que el servidor web este listo en http://localhost:3001...
powershell -NoProfile -Command "$ready=$false; for($i=0; $i -lt 15; $i++){ try{ $res = Invoke-WebRequest -Uri 'http://localhost:3001' -UseBasicParsing -TimeoutSec 1; if($res.StatusCode -eq 200){ $ready=$true; break; } }catch{} Start-Sleep -Seconds 1 } if(-not $ready){ Write-Host '[AVISO] El servidor tardo un poco mas en responder.' }"

REM abre el navegador en el puerto 3001
start "" "http://localhost:3001"

echo.
echo ===================================================================
echo  SISTEMA DE BIBLIOTECA INICIADO CORRECTAMENTE!
echo ===================================================================
echo  - Aplicacion Web: http://localhost:3001
echo  - Swagger UI:     http://localhost:3001/swagger-ui
echo  - Base de Datos:  %SISTEMA_DIR%\database\biblioteca.db
echo.
echo  Para apagar el servidor, ejecuta 'DETENER_SISTEMA.bat'
echo ===================================================================
echo.
timeout /t 3 /nobreak >nul 2>&1
exit
