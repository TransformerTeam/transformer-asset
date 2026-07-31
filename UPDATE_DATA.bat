@echo off
title Update Transformer Dashboard Data
cd /d "%~dp0"
echo.
echo ==================================================
echo      UPDATING TRANSFORMER DASHBOARD DATA
echo ==================================================
echo.

echo 1. Updating general data from TRInfo.csv...
powershell -NoProfile -ExecutionPolicy Bypass -File update_data.ps1

echo.
echo 2. Updating health index assessment data from HealthIndexSum.csv...
powershell -NoProfile -ExecutionPolicy Bypass -File update_health_data.ps1

echo.
echo ==================================================
echo      UPDATE PROCESS COMPLETE
echo ==================================================
echo.
pause
