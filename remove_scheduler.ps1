# ==============================================================================
# GPSC Transformer Asset Management - Remove AM-HV Sync Scheduler
# ==============================================================================
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "   GPSC Transformer Asset Management - Remove AM-HV Sync Scheduler" -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "กำลังยกเลิกและลบงาน GPSC_AMHV_Visual_Sync ออกจาก Windows Task Scheduler..." -ForegroundColor Yellow

$taskName = "GPSC_AMHV_Visual_Sync"

try {
    $existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if ($existing) {
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
        Write-Host "[SUCCESS] ลบงาน $taskName ออกจาก Task Scheduler เรียบร้อยแล้ว!" -ForegroundColor Green
        Write-Host "ระบบจะไม่ทำการ Sync อัตโนมัติทุกๆ 30 นาทีอีกต่อไป" -ForegroundColor White
    } else {
        Write-Host "[INFO] ไม่พบงาน $taskName ในระบบ หรือถูกลบไปก่อนหน้านี้แล้ว" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[ERROR] เกิดข้อผิดพลาดในการลบ Task: $_" -ForegroundColor Red
}
Write-Host ""
