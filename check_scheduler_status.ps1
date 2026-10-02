# ==============================================================================
# GPSC Transformer Asset Management - AM-HV Sync Status Monitor
# ==============================================================================
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$vbsPath = Join-Path $scriptDir "sync_background.vbs"
$logPath = Join-Path $scriptDir "sync_history.log"
$taskName = "GPSC_AMHV_Visual_Sync"

function Show-Status {
    Clear-Host
    Write-Host "==============================================================================" -ForegroundColor Cyan
    Write-Host "   GPSC Transformer Asset Management - AM-HV Sync Status Monitor" -ForegroundColor Cyan
    Write-Host "==============================================================================" -ForegroundColor Cyan
    Write-Host ""

    $t = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if ($t) {
        $info = Get-ScheduledTaskInfo -TaskName $taskName
        $res = if ($info.LastTaskResult -eq 0) { "SUCCESS (0)" } elseif ($info.LastTaskResult -eq 267009) { "RUNNING NOW" } else { "CODE: $($info.LastTaskResult)" }
        $resColor = if ($info.LastTaskResult -eq 0) { "Green" } elseif ($info.LastTaskResult -eq 267009) { "Yellow" } else { "Red" }

        Write-Host "  สถานะ Scheduler        : " -NoNewline; Write-Host $t.State -ForegroundColor Green
        Write-Host "  รอบที่ทำงานล่าสุด      : " -NoNewline; Write-Host $info.LastRunTime -ForegroundColor Cyan
        Write-Host "  ผลลัพธ์รอบล่าสุด       : " -NoNewline; Write-Host $res -ForegroundColor $resColor
        Write-Host "  รอบที่กำลังจะทำงานต่อไป: " -NoNewline; Write-Host $info.NextRunTime -ForegroundColor Cyan
    } else {
        Write-Host "  สถานะ Scheduler : ไม่ได้เปิดใช้งาน (ยังไม่ได้รัน setup_scheduler_30min.bat)" -ForegroundColor Red
    }

    Write-Host ""
    Write-Host "------------------------------------------------------------------------------" -ForegroundColor Gray
    Write-Host "   ประวัติการ Sync ล่าสุด (sync_history.log)" -ForegroundColor White
    Write-Host "------------------------------------------------------------------------------" -ForegroundColor Gray
    if (Test-Path $logPath) {
        Get-Content -Path $logPath -Tail 10 | ForEach-Object {
            if ($_ -match "SUCCESS") {
                Write-Host "  $_" -ForegroundColor Green
            } elseif ($_ -match "ERROR") {
                Write-Host "  $_" -ForegroundColor Red
            } elseif ($_ -match "WARNING") {
                Write-Host "  $_" -ForegroundColor Yellow
            } else {
                Write-Host "  $_" -ForegroundColor DarkGray
            }
        }
    } else {
        Write-Host "  (ยังไม่มีประวัติการทำงาน)" -ForegroundColor DarkGray
    }
    Write-Host "------------------------------------------------------------------------------" -ForegroundColor Gray
    Write-Host ""
    Write-Host "[1] สั่ง Sync ข้อมูลทันทีเดี๋ยวนี้ (Run Sync Now)" -ForegroundColor Yellow
    Write-Host "[2] รีเฟรชหน้าจอนี้ (Refresh Status)" -ForegroundColor Cyan
    Write-Host "[0] ออกจากโปรแกรม (Exit)" -ForegroundColor Gray
    Write-Host ""
}

while ($true) {
    Show-Status
    try {
        $choice = Read-Host "กรุณาเลือก [0-2]"
    } catch {
        break
    }
    if ([string]::IsNullOrWhiteSpace($choice) -or $choice -eq "0") {
        break
    } elseif ($choice -eq "1") {
        Write-Host ""
        Write-Host "กำลังดึงข้อมูลล่าสุดจาก AM-HV..." -ForegroundColor Yellow
        $wscriptCmd = "wscript.exe `"$vbsPath`""
        cmd.exe /c $wscriptCmd
        Start-Sleep -Seconds 3
    } elseif ($choice -eq "2") {
        continue
    }
}
