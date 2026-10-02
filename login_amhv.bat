@echo off
chcp 65001 > nul
echo ========================================================
echo   AM-HV Real-Time Sync Setup: One-Time Microsoft Login
echo ========================================================
echo.
echo กำลังเปิดหน้าต่าง Microsoft Edge เพื่อให้ท่านล็อกอินเข้าระบบ AM-HV...
echo.
py sync_amhv_visual.py --login
pause
