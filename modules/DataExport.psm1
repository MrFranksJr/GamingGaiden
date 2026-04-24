function Export-GameDataToJson {
    <#
    .SYNOPSIS
        Exports game data to a JSON file.
    #>
    param( [string]$DatabasePath = ".\GamingGaiden.db",
        [string]$OutputPath = ".\frontend\resources\data.json",
        [switch]$Force = $false
    )

    $workingDirectory = (Get-Location).Path
    $fullPath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($workingDirectory, $OutputPath))
    $lastExportFile = "$fullPath.last"

    Log "Checking if JSON export is needed: $fullPath"

    $games = @(RunDBQuery "SELECT * FROM games" -DatabasePath $DatabasePath)
    $sessionHistory = @(RunDBQuery "SELECT * FROM session_history" -DatabasePath $DatabasePath)
    $gamingPCs = @(RunDBQuery "SELECT * FROM gaming_pcs" -DatabasePath $DatabasePath)
    $dailyPlaytime = @(RunDBQuery "SELECT * FROM daily_playtime" -DatabasePath $DatabasePath)

    $data = [PSCustomObject]@{
        games           = $games
        session_history = $sessionHistory
        gaming_pcs      = $gamingPCs
        daily_playtime  = $dailyPlaytime
    }

    $currentJson = $data | ConvertTo-Json -Depth 10
    $currentHash = [Convert]::ToBase64String([System.Security.Cryptography.SHA256]::Create().ComputeHash([System.Text.Encoding]::UTF8.GetBytes($currentJson)))

    $needsExport = $Force -or (-not (Test-Path $fullPath))
    if (-not $needsExport -and (Test-Path $lastExportFile)) {
        $lastHash = Get-Content $lastExportFile -Raw
        if ($currentHash -ne $lastHash) {
            $needsExport = $true
        }
    }
    else {
        $needsExport = $true
    }

    if ($needsExport) {
        Log "Exporting game data to JSON: $fullPath"
        
        # Add metadata for the actual file
        $fileData = [PSCustomObject]@{
            games           = $games
            session_history = $sessionHistory
            gaming_pcs      = $gamingPCs
            daily_playtime  = $dailyPlaytime
            export_date     = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
            hash            = $currentHash
        }

        $fileData | ConvertTo-Json -Depth 10 | Set-Content -Path $fullPath -Encoding UTF8
        $currentHash | Set-Content -Path $lastExportFile -Encoding UTF8
    }
    else {
        Log "No changes detected. Skipping JSON export."
    }
}

Export-ModuleMember -Function Export-GameDataToJson
