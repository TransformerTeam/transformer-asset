@echo off
title Push Changes to GitHub
cd /d "%~dp0"
echo ====================================================
echo   GPSC Transformer Dashboard - Push to GitHub
echo ====================================================
echo.
echo Pushing latest commits to GitHub...
echo.
".git-portable\cmd\git.exe" push origin main
echo.
if %ERRORLEVEL% equ 0 (
    echo ====================================================
    echo   SUCCESS: Pushed to GitHub successfully!
    echo ====================================================
) else (
    echo ====================================================
    echo   FAILED: Could not push to GitHub.
    echo   Please check credentials or login prompt above.
    echo ====================================================
)
echo.
pause
