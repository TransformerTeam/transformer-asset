# PowerShell script to update data.js from TRInfo.csv
# Run this script whenever TRInfo.csv is updated

$CsvPath = Join-Path $PSScriptRoot "TRInfo.csv"
$JsPath = Join-Path $PSScriptRoot "data.js"

if (Test-Path $CsvPath) {
    Write-Host "Reading and converting $CsvPath..." -ForegroundColor Cyan
    
    # Import CSV and convert to JSON
    $Data = Import-Csv -Path $CsvPath | ConvertTo-Json -Depth 5
    
    # Write to data.js
    "const TR_DATA = $Data;" | Out-File -FilePath $JsPath -Encoding utf8 -Force
    
    Write-Host "Successfully generated $JsPath" -ForegroundColor Green
    Write-Host "Double-click dashboard.html to view the updated dashboard!" -ForegroundColor Yellow
} else {
    Write-Error "Error: $CsvPath was not found. Please ensure TRInfo.csv is in the same directory as this script."
}
