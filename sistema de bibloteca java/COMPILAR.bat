@echo off
title Compilar Sistema de Biblioteca
setlocal enabledelayedexpansion

set "BASE_DIR=%~dp0"
set "SISTEMA_DIR=%BASE_DIR%sistema-biblioteca"
set "JAVA_DIR=%SISTEMA_DIR%\java-core"
set "FRONTEND_DIR=%SISTEMA_DIR%\frontend"
set "APP_DIR=%SISTEMA_DIR%\app"

echo =======================================================================
echo          COMPILACION DEL SISTEMA DE BIBLIOTECA (FULL BUILD)
echo =======================================================================
echo.

REM 1. Deteccion de Maven
set "MVN_EXE="
where mvn >nul 2>nul
if !errorlevel! equ 0 (
    set "MVN_EXE=mvn"
) else if exist "%BASE_DIR%maven\bin\mvn.cmd" (
    set "MVN_EXE=%BASE_DIR%maven\bin\mvn.cmd"
)

if "%MVN_EXE%"=="" (
    echo [ERROR] No se encontro Maven en PATH ni en Downloads.
    echo Por favor descargue Maven o agreguelo a las variables de entorno.
    pause
    exit /b 1
)

echo [OK] Maven detectado: %MVN_EXE%

REM 2. Compilacion Backend Java
echo.
echo [1/2] Compilando Backend Java...
if not exist "%APP_DIR%" mkdir "%APP_DIR%"

call "!MVN_EXE!" -f "%JAVA_DIR%\pom.xml" clean package
if !errorlevel! neq 0 (
    echo [ERROR] Fallo la compilacion del backend Java.
    pause
    exit /b 1
)

if not exist "%APP_DIR%\biblioteca.jar" (
    echo [ERROR] No se genero el archivo JAR en '%APP_DIR%\biblioteca.jar'.
    pause
    exit /b 1
)
echo [OK] Backend compilado con exito: %APP_DIR%\biblioteca.jar

REM 3. Compilacion Frontend (Vite)
echo.
echo [2/2] Compilando Frontend con Vite...
if exist "%FRONTEND_DIR%\package.json" (
    cd /d "%FRONTEND_DIR%"
    if not exist "node_modules" (
        call npm.cmd install
        if !errorlevel! neq 0 (
            echo [ERROR] Fallo la instalacion de dependencias del frontend.
            cd /d "%BASE_DIR%"
            pause
            exit /b 1
        )
    )
    call npm.cmd run build
    if !errorlevel! neq 0 (
        echo [ERROR] Fallo la construccion del frontend con Vite.
        cd /d "%BASE_DIR%"
        pause
        exit /b 1
    )
    cd /d "%BASE_DIR%"
    echo [OK] Frontend empaquetado con exito en '%FRONTEND_DIR%\dist'.
) else (
    echo [AVISO] No se encontro package.json en el directorio frontend.
)

echo.
echo =======================================================================
echo          COMPILACION EXITOSA DE TODOS LOS COMPONENTES
echo =======================================================================
echo  - Backend JAR:  %APP_DIR%\biblioteca.jar
echo  - Frontend Dist: %FRONTEND_DIR%\dist
echo.
echo Ya puede ejecutar 'INICIAR_SISTEMA.bat'.
echo =======================================================================
pause
