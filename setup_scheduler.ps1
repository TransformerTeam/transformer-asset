$pyPath = "C:\Users\NB\AppData\Local\Programs\Python\Python314\py.exe"
$scriptPath = "C:\Users\NB\Downloads\TR Asset\export_excel_sheets.py"
$workingDir = "C:\Users\NB\Downloads\TR Asset"

$action = New-ScheduledTaskAction -Execute $pyPath -Argument "`"$scriptPath`"" -WorkingDirectory $workingDir
$trigger = New-ScheduledTaskTrigger -Daily -At "07:30AM"
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Register-ScheduledTask -TaskName "GPSC_TR_Asset_Excel_Export" `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description "Daily export of GPSC Transformer Asset Management Excel sheets to CSV at 07:30" `
    -Force

Write-Host "Scheduled Task GPSC_TR_Asset_Excel_Export created successfully."
