@echo off
title Transformer Dashboard Server
echo.
echo Starting Transformer Dashboard Web Server...
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0serve.ps1" -Port 8888
pause
