# ==============================================================================
# GPSC Transformer Asset Management - AM-HV 30-Minute Sync Scheduler Setup
# ==============================================================================
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "   GPSC Transformer Asset Management - AM-HV 30-Minute Sync Scheduler Setup" -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "กำลังตั้งค่า Windows Task Scheduler เพื่อดึงข้อมูล AM-HV อัตโนมัติทุกๆ 30 นาที..." -ForegroundColor Yellow

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$vbsPath = Join-Path $scriptDir "sync_background.vbs"
$taskName = "GPSC_AMHV_Visual_Sync"

try {
    # 1. Create recurring 30-minute task via schtasks
    $createCmd = "schtasks /create /tn `"$taskName`" /tr `"wscript.exe `\`"$vbsPath`\`"`" /sc MINUTE /mo 30 /f"
    $res = cmd.exe /c $createCmd 2>&1

    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] ไม่สามารถลงทะเบียน Task ใน Task Scheduler ได้" -ForegroundColor Red
        Write-Host "รายละเอียด: $res" -ForegroundColor DarkGray
        Write-Host "กรุณาลองคลิกขวาที่ไฟล์ .bat แล้วเลือก 'Run as administrator'" -ForegroundColor Red
        return
    }

    # 2. Configure advanced settings via PowerShell
    $action = New-ScheduledTaskAction -Execute 'wscript.exe' -Argument "`"$vbsPath`"" -WorkingDirectory $scriptDir
    Set-ScheduledTask -TaskName $taskName -Action $action | Out-Null

    $task = Get-ScheduledTask -TaskName $taskName
    $task.Settings.StartWhenAvailable = $true
    $task.Settings.DisallowStartIfOnBatteries = $false
    $task.Settings.StopIfGoingOnBatteries = $false
    $task.Settings.ExecutionTimeLimit = 'PT15M'
    Set-ScheduledTask -InputObject $task | Out-Null

    $info = Get-ScheduledTaskInfo -TaskName $taskName

    Write-Host "[SUCCESS] ลงทะเบียน Task ใน Windows Task Scheduler เรียบร้อยสมบูรณ์!" -ForegroundColor Green
    Write-Host ""
    Write-Host "==============================================================================" -ForegroundColor Gray
    Write-Host " รายละเอียดการตั้งค่า (Configuration Summary)" -ForegroundColor White
    Write-Host "==============================================================================" -ForegroundColor Gray
    Write-Host " - ชื่องาน (Task Name)      : $taskName" -ForegroundColor White
    Write-Host " - ความถี่ (Frequency)      : ทำงานอัตโนมัติทุกๆ 30 นาที (Every 30 minutes)" -ForegroundColor White
    Write-Host " - โหมดการทำงาน (Mode)      : 100% Silent Background (ไม่มีหน้าต่างดำขึ้นมารบกวน)" -ForegroundColor White
    Write-Host " - การคำนวณอัตโนมัติ        : อัปเดต VisualData.csv + คำนวณ Health Index ทันที" -ForegroundColor White
    Write-Host " - กรณีเครื่องดับ/Sleep     : ทำงานทันทีเมื่อเปิดเครื่องขึ้นมาใหม่ (Catch-up on boot)" -ForegroundColor White
    Write-Host " - บันทึกประวัติ (Log)      : sync_history.log" -ForegroundColor White
    Write-Host " - รอบที่จะทำงานครั้งต่อไป  : $($info.NextRunTime)" -ForegroundColor Green
    Write-Host "==============================================================================" -ForegroundColor Gray
    Write-Host ""
    Write-Host "สามารถตรวจสอบสถานะได้ตลอดเวลาที่: check_scheduler_status.bat" -ForegroundColor Cyan
    Write-Host "หากต้องการยกเลิกการตั้งค่า ให้รัน  : remove_scheduler.bat" -ForegroundColor DarkYellow
} catch {
    Write-Host "[ERROR] เกิดข้อผิดพลาด: $_" -ForegroundColor Red
}
