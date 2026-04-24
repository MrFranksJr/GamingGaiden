function Save-IconToCache
{
    param([byte[]]$Bytes, [string]$Name, [string]$CacheDir) if ($null -eq $Bytes -or $Bytes.Length -eq 0)
    {
        return $null
    }; $safeName = $Name -replace "[^a-zA-Z0-9_\-]", "_"; $fileName = "$safeName.jpg"; $filePath = Join-Path $CacheDir $fileName; if (-not (Test-Path $filePath) -or (Get-Item $filePath).Length -ne $Bytes.Length)
    {
        [System.IO.File]::WriteAllBytes($filePath, $Bytes)
    }; return "resources/images/cache/$fileName"
}; function Export-GameDataToJson
{
    param([string]$DatabasePath = ".\GamingGaiden.db", [string]$OutputPath = ".\frontend\resources\data.json", [switch]$Force = $false); $workingDirectory = (Get-Location).Path; $fullPath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($workingDirectory, $OutputPath)); $lastExportFile = "$fullPath.last"; $cacheDir = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($workingDirectory, "frontend\resources\images\cache")); if (-not (Test-Path $cacheDir))
    {
        New-Item -ItemType Directory -Path $cacheDir -Force | Out-Null
    }; Log "Checking if JSON export is needed: $fullPath"; $gamesRaw = @(RunDBQuery "SELECT * FROM games" -DatabasePath $DatabasePath); $sessionHistory = @(RunDBQuery "SELECT * FROM session_history" -DatabasePath $DatabasePath); $gamingPCsRaw = @(RunDBQuery "SELECT * FROM gaming_pcs" -DatabasePath $DatabasePath); $dailyPlaytime = @(RunDBQuery "SELECT * FROM daily_playtime" -DatabasePath $DatabasePath); $games = $gamesRaw | ForEach-Object { $game = $_ | Select-Object * -ExcludeProperty icon; $game | Add-Member -MemberType NoteProperty -Name "icon_path" -Value (Save-IconToCache -Bytes $_.icon -Name $_.name -CacheDir $cacheDir); $game }; $gamingPCs = $gamingPCsRaw | ForEach-Object { $pc = $_ | Select-Object * -ExcludeProperty icon; $pc | Add-Member -MemberType NoteProperty -Name "icon_path" -Value (Save-IconToCache -Bytes $_.icon -Name $_.name -CacheDir $cacheDir); $pc }; $data = [PSCustomObject]@{ games = $games; session_history = $sessionHistory; gaming_pcs = $gamingPCs; daily_playtime = $dailyPlaytime }; $currentJson = $data | ConvertTo-Json -Depth 10; $currentHash = [Convert]::ToBase64String([System.Security.Cryptography.SHA256]::Create().ComputeHash([System.Text.Encoding]::UTF8.GetBytes($currentJson))); $needsExport = $Force -or (-not (Test-Path $fullPath)); if (-not $needsExport -and (Test-Path $lastExportFile))
    {
        $lastHash = Get-Content $lastExportFile -Raw; if ($currentHash -ne $lastHash)
        {
            $needsExport = $true
        }
    }
    else
    {
        $needsExport = $true
    }; if ($needsExport)
    {
        Log "Exporting game data to JSON: $fullPath"; $fileData = [PSCustomObject]@{ games = $games; session_history = $sessionHistory; gaming_pcs = $gamingPCs; daily_playtime = $dailyPlaytime; export_date = (Get-Date -Format "yyyy-MM-dd HH:mm:ss"); hash = $currentHash }; $fileData | ConvertTo-Json -Depth 10 | Set-Content -Path $fullPath -Encoding UTF8; $currentHash | Set-Content -Path $lastExportFile -Encoding UTF8
    }
    else
    {
        Log "No changes detected. Skipping JSON export."
    }
}; Export-ModuleMember -Function Export-GameDataToJson
