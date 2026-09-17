$ErrorActionPreference = "Stop"

$possibleExcelPaths = @(
    "C:\Users\NB\OneDrive - GPSC\GPSC Group Transformer Assessment\Transformer Asset Managment GPSC GROUP Rev.25.xlsm",
    "d:\Users\Gpsc11630400\OneDrive - GPSC\GPSC Group Transformer Assessment\Transformer Asset Managment GPSC GROUP Rev.25.xlsm",
    (Join-Path $PSScriptRoot "..\Transformer Asset Managment GPSC GROUP Rev.25.xlsm")
)

$excelPath = $null
foreach ($p in $possibleExcelPaths) {
    if (Test-Path $p) {
        $excelPath = $p
        break
    }
}

$repoRoot = $PSScriptRoot
$testDataDir = Join-Path $repoRoot "TestData"
$healthCsvPath = Join-Path $repoRoot "HealthIndexSum.csv"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  GPSC Transformer Data Exporter: Rev.25.xlsm -> CSV   " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

if (-not $excelPath) {
    Write-Error "Excel file not found at any of the candidate paths!"
    exit 1
}
Write-Host "Using Excel file: $excelPath" -ForegroundColor Green

$tempXlsm = "$env:TEMP\export_rev25_$([System.Guid]::NewGuid().ToString()).xlsm"
Write-Host "Creating temp copy of workbook: $tempXlsm"
Copy-Item -Path $excelPath -Destination $tempXlsm -Force

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

function Escape-CsvCell($val, $isDateCol = $false, $isHiDateFormat = $false) {
    if ($val -eq $null) { return "" }
    
    if ($isDateCol -and ($val -is [double] -or $val -is [int]) -and $val -ge 20000 -and $val -le 60000) {
        $dt = [DateTime]::FromOADate([double]$val)
        if ($isHiDateFormat) {
            return $dt.ToString("MM/dd/yyyy")
        } else {
            if ($dt.TimeOfDay.TotalSeconds -eq 0) {
                return $dt.ToString("yyyy-MM-dd 00:00:00")
            } else {
                return $dt.ToString("yyyy-MM-dd HH:mm:ss")
            }
        }
    }
    
    # If it's a whole number stored as double (e.g. 21.0 for age or power), format cleanly
    if ($val -is [double] -and [Math]::Floor($val) -eq $val -and [Math]::Abs($val) -lt 1000000000) {
        # Check if it was an integer
        # Note: serial numbers or large ints shouldn't lose precision
        $str = ([long]$val).ToString()
    } else {
        $str = [string]$val
    }
    
    if ($str.Contains(",") -or $str.Contains("`"") -or $str.Contains("`n") -or $str.Contains("`r")) {
        return "`"" + $str.Replace("`"", "`"`"") + "`""
    }
    return $str
}

try {
    Write-Host "Opening workbook via Excel COM..."
    $wb = $excel.Workbooks.Open($tempXlsm, 0, $true)
    Write-Host "Workbook opened successfully ($($wb.Sheets.Count) sheets)."

    # ----------------------------------------------------
    # 1. Export HealthIndexSum
    # ----------------------------------------------------
    Write-Host "`n--- Exporting HealthIndexSum ---" -ForegroundColor Yellow
    $wsHi = $null
    try { $wsHi = $wb.Sheets.Item("HealthIndexSum") } catch {}
    if ($wsHi) {
        $vHi = $wsHi.UsedRange.Value2
        $rows = $vHi.GetLength(0)
        $cols = [Math]::Min(56, $vHi.GetLength(1))
        
        $dateCols = @{}
        for ($c = 1; $c -le $cols; $c++) {
            $hName = [string]$vHi[2, $c]
            if ($hName -match "Date") { $dateCols[$c] = $true }
        }
        
        $utf8WithBom = New-Object System.Text.UTF8Encoding($true)
        $sw = New-Object System.IO.StreamWriter($healthCsvPath, $false, $utf8WithBom)
        
        # Row 2 is Headers
        $hLine = @()
        for ($c = 1; $c -le $cols; $c++) {
            $h = [string]$vHi[2, $c]
            $cleanH = $h.Replace("`n", " ").Replace("`r", "").Trim()
            $hLine += Escape-CsvCell $cleanH $false $false
        }
        $sw.WriteLine(($hLine -join ","))
        
        # Row 3..N are Data Rows
        $hiRowCount = 0
        for ($r = 3; $r -le $rows; $r++) {
            $firstCol = [string]$vHi[$r, 1]
            $eqName = [string]$vHi[$r, 2]
            $serial = [string]$vHi[$r, 3]
            if ([string]::IsNullOrWhitespace($eqName) -or [string]::IsNullOrWhitespace($serial) -or -not ($firstCol -match "^\d+$")) {
                continue
            }
            $line = @()
            for ($c = 1; $c -le $cols; $c++) {
                $cellVal = $vHi[$r, $c]
                $line += Escape-CsvCell $cellVal ($dateCols.ContainsKey($c)) $true
            }
            $sw.WriteLine(($line -join ","))
            $hiRowCount++
        }
        $sw.Close()
        Write-Host "Exported HealthIndexSum.csv ($hiRowCount data rows, size: $((Get-Item $healthCsvPath).Length) bytes)" -ForegroundColor Green
    } else {
        Write-Warning "HealthIndexSum sheet not found in workbook!"
    }

    # ----------------------------------------------------
    # 2. Export 23 TestData Sheets
    # ----------------------------------------------------
    $SHEET_NAMES = @(
        'SAPorder',
        'FactoryData',
        'VisualData',
        'WindingPFData',
        'IRandPIData',
        'BushingPFData',
        'BushingInfo',
        'SurgePFData',
        'SurgeInfo',
        'ExcitingData',
        'RatioData',
        'WindingData',
        'SingleShortData',
        'ThreeShortData',
        'FRAData',
        'DFRData',
        'DRMData',
        'PDonlineData',
        'ThermoScanData',
        'TRinfo2',
        'TRHistory',
        'MTOilData',
        'OLTCOilData'
    )

    Write-Host "`n--- Exporting $($SHEET_NAMES.Count) TestData Sheets ---" -ForegroundColor Yellow
    foreach ($sheetName in $SHEET_NAMES) {
        $ws = $null
        try { $ws = $wb.Sheets.Item($sheetName) } catch {}
        if (-not $ws) {
            Write-Warning "Sheet '$sheetName' not found, skipping."
            continue
        }
        
        $outFile = Join-Path $testDataDir "$sheetName.csv"
        $v = $ws.UsedRange.Value2
        if (-not $v) {
            Write-Warning "Sheet '$sheetName' is empty, skipping."
            continue
        }
        
        $rows = $v.GetLength(0)
        $cols = $v.GetLength(1)
        
        $dateCols = @{}
        for ($c = 1; $c -le $cols; $c++) {
            $hName = [string]$v[1, $c]
            if ($hName -match "Date") { $dateCols[$c] = $true }
        }
        
        $utf8WithBom = New-Object System.Text.UTF8Encoding($true)
        $sw = New-Object System.IO.StreamWriter($outFile, $false, $utf8WithBom)
        
        # Header (Row 1)
        $hLine = @()
        for ($c = 1; $c -le $cols; $c++) {
            $hLine += Escape-CsvCell $v[1, $c] $false $false
        }
        $sw.WriteLine(($hLine -join ","))
        
        # Data (Row 2..N)
        $exportedRows = 0
        for ($r = 2; $r -le $rows; $r++) {
            $line = @()
            $hasData = $false
            for ($c = 1; $c -le $cols; $c++) {
                $cellVal = $v[$r, $c]
                if ($cellVal -ne $null -and [string]$cellVal -ne "") { $hasData = $true }
                $line += Escape-CsvCell $cellVal ($dateCols.ContainsKey($c)) $false
            }
            if ($hasData) {
                $sw.WriteLine(($line -join ","))
                $exportedRows++
            }
        }
        $sw.Close()
        Write-Host "Exported $sheetName.csv ($exportedRows data rows, size: $((Get-Item $outFile).Length) bytes)" -ForegroundColor Green
    }
    
    $wb.Close($false)
} finally {
    $excel.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()
    if (Test-Path $tempXlsm) {
        Remove-Item $tempXlsm -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "`nAll CSV sheets exported successfully from Excel!" -ForegroundColor Cyan

# ----------------------------------------------------
# 3. Synchronize TRInfo.csv from TRinfo2.csv
# ----------------------------------------------------
$tr2Path = Join-Path $testDataDir "TRinfo2.csv"
$trInfoPath = Join-Path $repoRoot "TRInfo.csv"
if (Test-Path $tr2Path) {
    Copy-Item -Path $tr2Path -Destination $trInfoPath -Force
    Write-Host "Synchronized TRInfo.csv from TestData/TRinfo2.csv" -ForegroundColor Green
}

# ----------------------------------------------------
# 4. Evaluate with Core Evaluation Engine & Synchronize all datasets
# ----------------------------------------------------
Write-Host "`n--- Running Evaluation Engine and Syncing Fleet Datasets ---" -ForegroundColor Yellow
$syncScript = Join-Path $repoRoot "scripts\sync_evaluation.js"
if (Test-Path $syncScript) {
    node $syncScript
} else {
    Write-Warning "scripts/sync_evaluation.js not found!"
}

# ----------------------------------------------------
# 5. Push to GitHub
# ----------------------------------------------------
$gitExe = Join-Path $repoRoot ".git-portable\cmd\git.exe"
if (Test-Path $gitExe) {
    Write-Host "`n--- Pushing to GitHub ---" -ForegroundColor Yellow
    & $gitExe add HealthIndexSum.csv TestData/*.csv TRInfo.csv data.js health_data.js scripts/sync_evaluation.js refresh_data_from_excel.ps1
    & $gitExe commit -m "data: refresh all CSV datasets and health index tables from master Excel Rev.25"
    & $gitExe push origin main
    Write-Host "Pushed to GitHub successfully!" -ForegroundColor Green
}

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "   REFRESH & SYNC PROCESS COMPLETE!                      " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
