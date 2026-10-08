@echo off
title Instalar Dependencias - Sistema de Biblioteca
setlocal enabledelayedexpansion

set "BASE_DIR=%~dp0"
set "SISTEMA_DIR=%BASE_DIR%sistema-biblioteca"
set "JAVA_DIR=%SISTEMA_DIR%\java-core"
set "FRONTEND_DIR=%SISTEMA_DIR%\frontend"
set "APP_DIR=%SISTEMA_DIR%\app"
set "MAVEN_LOCAL=%BASE_DIR%maven"
set "MAVEN_VERSION=3.9.9"
set "MVN_EXE="

echo ===================================================================
echo   INSTALANDO DEPENDENCIAS Y COMPILANDO EL SISTEMA
echo ===================================================================
echo  Se instalara lo que falte: Java 17 JDK, Maven y Node.js LTS.
echo.

echo [1/4] Verificando Java 17 o superior...
call :ensure_java
if errorlevel 1 goto :fail

echo [2/4] Verificando Maven...
call :ensure_maven
if errorlevel 1 goto :fail

echo [3/4] Verificando Node.js (npm)...
call :ensure_node
if errorlevel 1 goto :fail

echo [4/4] Compilando el sistema...
if not exist "%APP_DIR%" mkdir "%APP_DIR%"

REM El pom.xml (plugin shade) escribe el JAR final directamente en app\biblioteca.jar
cd /d "%JAVA_DIR%"
call "!MVN_EXE!" clean package -DskipTests
if errorlevel 1 (
    echo [ERROR] Fallo la compilacion del backend Java.
    goto :fail
)
if not exist "%APP_DIR%\biblioteca.jar" (
    echo [ERROR] No se genero "%APP_DIR%\biblioteca.jar".
    goto :fail
)

cd /d "%FRONTEND_DIR%"
call npm.cmd install
if errorlevel 1 (
    echo [ERROR] Fallo la instalacion de dependencias del frontend.
    goto :fail
)
call npm.cmd run build
if errorlevel 1 (
    echo [ERROR] Fallo la compilacion del frontend.
    goto :fail
)

cd /d "%BASE_DIR%"
echo.
echo ===================================================================
echo   INSTALACION COMPLETADA CORRECTAMENTE
echo ===================================================================
echo Puedes ejecutar INICIAR_SISTEMA.bat para arrancar la aplicacion.
pause
exit /b 0

:fail
cd /d "%BASE_DIR%"
echo.
echo [ERROR] La instalacion no se completo. Revisa los mensajes anteriores.
pause
exit /b 1


REM ===================== SUBRUTINAS =====================

:ensure_java
set "JVER="
set "JMAJOR="
where javac >nul 2>nul
if not errorlevel 1 (
    for /f "tokens=3" %%v in ('java -version 2^>^&1 ^| findstr /i "version"') do if not defined JVER set "JVER=%%~v"
    for /f "delims=." %%m in ("!JVER!") do set "JMAJOR=%%m"
)
if defined JMAJOR if !JMAJOR! geq 17 (
    echo    Java !JVER! encontrado.
    exit /b 0
)

echo    Java 17 JDK no encontrado. Instalando con winget...
where winget >nul 2>nul
if errorlevel 1 (
    echo [ERROR] winget no esta disponible. Instala Java 17 JDK manualmente desde https://adoptium.net
    exit /b 1
)
winget install --id EclipseAdoptium.Temurin.17.JDK -e --silent --accept-package-agreements --accept-source-agreements
call :refresh_path
where javac >nul 2>nul
if errorlevel 1 (
    echo [ERROR] No se pudo instalar Java 17 JDK. Instalalo manualmente desde https://adoptium.net
    exit /b 1
)
echo    Java 17 JDK instalado.
exit /b 0

:ensure_maven
call :find_maven
if defined MVN_EXE (
    echo    Maven encontrado: !MVN_EXE!
    exit /b 0
)

echo    Maven no encontrado. Descargando Maven %MAVEN_VERSION% en "%MAVEN_LOCAL%"...
set "MVN_ZIP=%TEMP%\apache-maven-%MAVEN_VERSION%-bin.zip"
set "MVN_TMP=%TEMP%\maven-extract-%MAVEN_VERSION%"
curl.exe -L -f -o "!MVN_ZIP!" "https://archive.apache.org/dist/maven/maven-3/%MAVEN_VERSION%/binaries/apache-maven-%MAVEN_VERSION%-bin.zip"
if errorlevel 1 (
    echo [ERROR] No se pudo descargar Maven. Descargalo de https://maven.apache.org y descomprimelo en "%MAVEN_LOCAL%"
    exit /b 1
)
if exist "!MVN_TMP!" rmdir /s /q "!MVN_TMP!"
powershell -NoProfile -Command "Expand-Archive -LiteralPath '!MVN_ZIP!' -DestinationPath '!MVN_TMP!' -Force"
if not exist "%MAVEN_LOCAL%" mkdir "%MAVEN_LOCAL%"
xcopy "!MVN_TMP!\apache-maven-%MAVEN_VERSION%\*" "%MAVEN_LOCAL%\" /E /I /Y /Q >nul
rmdir /s /q "!MVN_TMP!" 2>nul
del /q "!MVN_ZIP!" 2>nul

call :find_maven
if defined MVN_EXE (
    echo    Maven instalado en: %MAVEN_LOCAL%
    exit /b 0
)
echo [ERROR] Maven no quedo disponible.
exit /b 1

:ensure_node
where npm >nul 2>nul
if not errorlevel 1 (
    echo    Node.js/npm encontrado.
    exit /b 0
)

echo    Node.js no encontrado. Instalando con winget...
where winget >nul 2>nul
if errorlevel 1 (
    echo [ERROR] winget no esta disponible. Instala Node.js LTS manualmente desde https://nodejs.org
    exit /b 1
)
winget install --id OpenJS.NodeJS.LTS -e --silent --accept-package-agreements --accept-source-agreements
call :refresh_path
where npm >nul 2>nul
if errorlevel 1 (
    echo [ERROR] No se pudo instalar Node.js. Instalalo manualmente desde https://nodejs.org
    exit /b 1
)
echo    Node.js instalado.
exit /b 0

:find_maven
set "MVN_EXE="
where mvn >nul 2>nul
if not errorlevel 1 set "MVN_EXE=mvn"
if not defined MVN_EXE if exist "%MAVEN_LOCAL%\bin\mvn.cmd" set "MVN_EXE=%MAVEN_LOCAL%\bin\mvn.cmd"
exit /b 0

REM Relee PATH de Machine y User para que las herramientas recien instaladas se vean en esta sesion
:refresh_path
for /f "usebackq delims=" %%p in (`powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')"`) do set "PATH=%%p;%PATH%"
exit /b 0
