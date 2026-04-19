# tools\RepairDailyPlaytime.ps1
# This script rebuilds the daily_playtime table from session_history to fix corruption.
# It ensures all sessions are correctly split across midnight and re-aggregates daily totals.

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath
Set-Location ".."

Import-Module ".\modules\PSSQLite"
Import-Module ".\modules\HelperFunctions.psm1"
Import-Module ".\modules\StorageFunctions.psm1"
Import-Module ".\modules\QueryFunctions.psm1"

function Log($Message) {
    $timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ss"
    Write-Host "$timestamp : $Message"
    "$timestamp : $Message" | Out-File -Append -FilePath ".\GamingGaiden.log" -Encoding UTF8
}

Log "--- STARTING MANUAL REPAIR OF DAILY PLAYTIME ---"

# The module function now handles both splitting sessions and rebuilding the daily_playtime table
Repair-HistoricSessionData

Log "--- REPAIR COMPLETED ---"
