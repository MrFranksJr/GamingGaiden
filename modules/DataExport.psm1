function Save-IconToCache
{
    param(
        [byte[]]$Bytes,
        [string]$Name,
        [string]$CacheDir
    )

    if ($null -eq $Bytes -or $Bytes.Length -eq 0)
    {
        return $null
    }

    $safeName = ($Name -replace "[^a-zA-Z0-9_\-]", "_").Trim("_")
    if ( [string]::IsNullOrWhiteSpace($safeName))
    {
        $safeName = "image"
    }

    $nameHasher = [System.Security.Cryptography.SHA256]::Create()
    try
    {
        $nameHashBytes = $nameHasher.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($Name))
        $nameHash = ([System.BitConverter]::ToString($nameHashBytes) -replace "-", "").Substring(0, 8).ToLowerInvariant()
    }
    finally
    {
        $nameHasher.Dispose()
    }

    $extension = if ($Bytes.Length -ge 4 -and $Bytes[0] -eq 0x89 -and $Bytes[1] -eq 0x50 -and $Bytes[2] -eq 0x4E -and $Bytes[3] -eq 0x47)
    {
        "png"
    }
    elseif ($Bytes.Length -ge 3 -and $Bytes[0] -eq 0x47 -and $Bytes[1] -eq 0x49 -and $Bytes[2] -eq 0x46)
    {
        "gif"
    }
    elseif ($Bytes.Length -ge 2 -and $Bytes[0] -eq 0xFF -and $Bytes[1] -eq 0xD8)
    {
        "jpg"
    }
    else
    {
        # Existing databases may contain formats without a reliable signature. Browsers sniff these successfully.
        "jpg"
    }

    $fileName = "$safeName-$nameHash.$extension"
    $filePath = Join-Path $CacheDir $fileName
    $needsWrite = -not (Test-Path $filePath)
    if (-not $needsWrite)
    {
        $existingBytes = [System.IO.File]::ReadAllBytes($filePath)
        $needsWrite = -not [System.Collections.StructuralComparisons]::StructuralEqualityComparer.Equals($existingBytes, $Bytes)
    }

    if ($needsWrite)
    {
        [System.IO.File]::WriteAllBytes($filePath, $Bytes)
    }

    return "resources/images/cache/$fileName"
}

function Export-GameDataToJson
{
    param(
        [string]$DatabasePath = ".\GamingGaiden.db",
        [ValidatePattern('(?i)\.json$')]
        [string]$OutputPath = ".\frontend\resources\data.json",
        [switch]$Force = $false
    )

    if ([System.IO.Path]::GetExtension($OutputPath) -ine ".json")
    {
        throw "OutputPath must end with .json."
    }

    $workingDirectory = (Get-Location).Path
    $fullPath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($workingDirectory, $OutputPath))
    $lastExportFile = "$fullPath.last"
    $jsPath = $fullPath -replace "\.json$", ".js"
    $outputDirectory = Split-Path $fullPath -Parent
    $cacheDir = Join-Path $outputDirectory "images\cache"

    if (-not (Test-Path $outputDirectory))
    {
        New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
    }
    if (-not (Test-Path $cacheDir))
    {
        New-Item -ItemType Directory -Path $cacheDir -Force | Out-Null
    }

    Log "Checking if JSON export is needed: $fullPath"
    $gamesRaw = @(RunDBQuery "SELECT * FROM games ORDER BY name COLLATE NOCASE ASC" -DatabasePath $DatabasePath)
    $sessionHistory = @(RunDBQuery "SELECT * FROM session_history ORDER BY start_time ASC, id ASC" -DatabasePath $DatabasePath)
    $gamingPCsRaw = @(RunDBQuery "SELECT * FROM gaming_pcs ORDER BY name COLLATE NOCASE ASC" -DatabasePath $DatabasePath)
    $dailyPlaytime = @(RunDBQuery "SELECT * FROM daily_playtime ORDER BY play_date ASC" -DatabasePath $DatabasePath)

    $games = @($gamesRaw | ForEach-Object {
        $game = $_ | Select-Object * -ExcludeProperty icon
        $game | Add-Member -MemberType NoteProperty -Name "icon_path" -Value (Save-IconToCache -Bytes $_.icon -Name $_.name -CacheDir $cacheDir)
        $game
    })
    $gamingPCs = @($gamingPCsRaw | ForEach-Object {
        $pc = $_ | Select-Object * -ExcludeProperty icon
        $pc | Add-Member -MemberType NoteProperty -Name "icon_path" -Value (Save-IconToCache -Bytes $_.icon -Name $_.name -CacheDir $cacheDir)
        $pc
    })
    $data = [PSCustomObject]@{
        schema_version = 1
        games = $games
        session_history = $sessionHistory
        gaming_pcs = $gamingPCs
        daily_playtime = $dailyPlaytime
    }
    $currentJson = $data | ConvertTo-Json -Depth 10
    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    try
    {
        $currentHash = [Convert]::ToBase64String($sha256.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($currentJson)))
    }
    finally
    {
        $sha256.Dispose()
    }

    $lastHash = if (Test-Path $lastExportFile)
    {
        (Get-Content $lastExportFile -Raw).Trim()
    }
    else
    {
        $null
    }
    $needsExport = $Force -or
            (-not (Test-Path $fullPath)) -or
            (-not (Test-Path $jsPath)) -or
            ($currentHash -ne $lastHash)

    if ($needsExport)
    {
        Log "Exporting game data to JSON: $fullPath"
        $fileData = [PSCustomObject]@{
            schema_version = 1
            games = $games
            session_history = $sessionHistory
            gaming_pcs = $gamingPCs
            daily_playtime = $dailyPlaytime
            export_date = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
            hash = $currentHash
        }
        $jsonContent = $fileData | ConvertTo-Json -Depth 10
        $jsonContent | Set-Content -Path $fullPath -Encoding UTF8

        # Also export as JS for file:/// compatibility
        "window.gamingGaidenData = $jsonContent;" | Set-Content -Path $jsPath -Encoding UTF8

        $currentHash | Set-Content -Path $lastExportFile -Encoding UTF8
    }
    else
    {
        Log "No changes detected. Skipping JSON export."
    }
}

Export-ModuleMember -Function Export-GameDataToJson
