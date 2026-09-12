@echo off
title Refresh Data CSV from Master Excel
cd /d %~dp0
echo ==========================================================
echo    GPSC Transformer Asset Management - Refresh Data CSV
echo ==========================================================
echo.
echo Exporting latest data from Transformer Asset Managment GPSC GROUP Rev.25.xlsm...
powershell -NoProfile -ExecutionPolicy Bypass -File refresh_data_from_excel.ps1
echo.
pause
