@echo off
title Bergerac Merge
cd /d "%~dp0"
echo Iniciando Bergerac Merge en http://localhost:4300 ...
start "" http://localhost:4300
node tools\server.mjs
echo.
echo (Si esta ventana muestra un error arriba, la pagina NO esta corriendo.)
pause
