@echo off
title Instalar Dependencias - Sistema de Biblioteca
setlocal enabledelayedexpansion

set "BASE_DIR=%~dp0"
set "SISTEMA_DIR=%BASE_DIR%sistema-biblioteca"
set "FRONTEND_DIR=%SISTEMA_DIR%\frontend"

echo ===================================================================
echo   INSTALANDO DEPENDENCIAS Y COMPILANDO EL SISTEMA
echo ===================================================================
echo.

echo [1/3] Verificando Java y Maven...
where java >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] No se encontro Java en el sistema. Por favor instala Java 17 o superior.
    pause
    exit /b 1
)

where mvn >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] No se encontro Maven en el sistema. Por favor instala Maven.
    pause
    exit /b 1
)

echo [2/3] Compilando el Backend (Spring Boot)...
cd /d "%SISTEMA_DIR%\java-core"
call mvn clean package -DskipTests
if %errorlevel% neq 0 (
    echo [ERROR] Fallo la compilacion del backend.
    pause
    exit /b 1
)
REM Mover el jar a la carpeta app
if not exist "%SISTEMA_DIR%\app" mkdir "%SISTEMA_DIR%\app"
copy /y "%SISTEMA_DIR%\java-core\target\*.jar" "%SISTEMA_DIR%\app\biblioteca.jar" >nul

echo [3/3] Instalando dependencias y compilando Frontend (React/Node.js)...
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] No se encontro NPM. Por favor instala Node.js.
    pause
    exit /b 1
)
cd /d "%FRONTEND_DIR%"
call npm install
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Fallo la compilacion del frontend.
    pause
    exit /b 1
)

cd /d "%BASE_DIR%"
echo.
echo ===================================================================
echo   INSTALACION COMPLETADA CORRECTAMENTE
echo ===================================================================
echo Puedes ejecutar INICIAR_SISTEMA.bat para arrancar la aplicacion.
pause
