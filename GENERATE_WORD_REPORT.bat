@echo off
title Generate Transformer Assessment Word Report
cd /d %~dp0
echo ==========================================================
echo    GPSC Transformer Asset Management - Word Report Gen
echo ==========================================================
echo.
echo Generating 2026 Transformer Life Assessment Report for CUP-3 TR-001...
powershell -NoProfile -ExecutionPolicy Bypass -File generate_assessment_word_report.ps1
echo.
pause
