@echo off
chcp 65001 > nul
echo ========================================================
echo   AM-HV Real-Time Sync: Fetching Live Visual Data
echo ========================================================
echo.
echo กำลังดึงข้อมูลล่าสุดจากระบบ AM-HV ในเบื้องหลัง (Headless Mode)...
echo.
py sync_amhv_visual.py --sync
echo.
echo ========================================================
echo   Sync Process Complete
echo ========================================================
echo.
pause
