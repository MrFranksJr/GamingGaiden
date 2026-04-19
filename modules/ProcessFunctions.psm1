function DetectGame() {
    Log "Starting game detection"

    # Fetch games in order of most recent to least recent
    $getGameExesQuery = "SELECT exe_name FROM games ORDER BY last_play_date DESC"

    $queryResult = RunDBQuery $getGameExesQuery
    if ($null -eq $queryResult) {
        Log "No games found in database. Exiting detection."
        return
    }
    $exeList = [string[]] @($queryResult.exe_name)

    # PERFORMANCE OPTIMIZATION: CPU & MEMORY
    # Process games in batches of 35 with most recent 10 games processed every batch. 5 sec wait b/w every batch.
    # Processes 300 games in 60 sec. Most recent 10 games guaranteed to be detected in 5 sec, accounting for 99% of UX in typical usage.
    # Uses ~ 3% cpu in active blips of less than 1s, every 5s.
    # Benchmarked on a 2019 Ryzen 3550H in low power mode (1.7 GHz Clk with boost disabled), Windows 10 21H2.
    # No new objects are created inside infinite loops to prevent objects explosion, keeps Memory usage ~ 50 MB or less.
    if ($exeList.length -le 35) {
        # If exeList is of size 35 or less. process whole list in every batch
        while ($true) {
            foreach ($exe in $exeList) {
                if ($null -ne $exe -and $exe -ne "" -and [System.Diagnostics.Process]::GetProcessesByName($exe)) {
                    Log "Found $exe running. Exiting detection"
                    return $exe
                }
            }
            Start-Sleep -s 5
        }
    }
    else {
        # If exeList is longer than 35.
        $startIndex = 10; $batchSize = 25
        while ($true) {
            # Process most recent 10 games in every batch.
            for ($i = 0; $i -lt 10; $i++) {
                $exe = $exeList[$i]
                if ($null -ne $exe -and $exe -ne "" -and [System.Diagnostics.Process]::GetProcessesByName($exe)) {
                    Log "Found $exe running. Exiting detection"
                    return $exe
                }
            }
            # Rest of the games in incrementing way. 25 in each batch.
            $endIndex = [Math]::Min($startIndex + $batchSize, $exeList.length)

            for ($i = $startIndex; $i -lt $endIndex; $i++) {
                $exe = $exeList[$i]
                if ($null -ne $exe -and $exe -ne "" -and [System.Diagnostics.Process]::GetProcessesByName($exe)) {
                    Log "Found $exe running. Exiting detection"
                    return $exe
                }
            }

            if ($startIndex + $batchSize -lt $exeList.length) {
                $startIndex = $startIndex + $batchSize
            }
            else {
                $startIndex = 10
            }

            Start-Sleep -s 5
        }
    }
}

function TimeTrackerLoop($DetectedExe) {
    $hwInfoSensorSession = 'HKCU:\SOFTWARE\HWiNFO64\Sensors\Custom\Gaming Gaiden\Other1'
    $playTimeForCurrentSession = 0
    $processes = [System.Diagnostics.Process]::GetProcessesByName($DetectedExe)
    if ($null -eq $processes -or $processes.Length -eq 0) {
        return 0
    }
    $exeStartTime = $processes.StartTime | Sort-Object | Select-Object -First 1

    while ([System.Diagnostics.Process]::GetProcessesByName($DetectedExe)) {
        $playTimeForCurrentSession = [int16] (New-TimeSpan -Start $exeStartTime).TotalMinutes
        Set-Itemproperty -path $hwInfoSensorSession -Name 'Value' -value $playTimeForCurrentSession
        Start-Sleep -s 5
    }

    Log "Play time for current session: $playTimeForCurrentSession min."

    return $playTimeForCurrentSession
}

function MonitorGame($DetectedExe) {
    if ($null -eq $DetectedExe) { return }
    Log "Starting monitoring for $DetectedExe"

    $databaseFileHashBefore = CalculateFileHash '.\GamingGaiden.db'
    Log "Database hash before: $databaseFileHashBefore"

    $gameName = $null
    $entityFound = $null
    $updatedPlayTime = 0
    $updatedLastPlayDate = [int]((Get-Date ([datetime]::UtcNow) -UFormat %s).Split('.,')[0])

    # Capture process start time for session history
    $processes = [System.Diagnostics.Process]::GetProcessesByName($DetectedExe)
    if ($null -eq $processes -or $processes.Length -eq 0) {
        Log "Process $DetectedExe no longer found. Aborting monitoring."
        return
    }
    $processStartTime = $processes.StartTime | Sort-Object | Select-Object -First 1
    # Strips the decimal/comma first, then casts the clean string to an integer, fixes for non-US locales
    $sessionStartTimeUnix = [int]((Get-Date ($processStartTime.ToUniversalTime()) -UFormat %s).Split('.,')[0])

    $entityFound = DoesEntityExists "games" "exe_name" $DetectedExe

    if ($null -ne $entityFound) {
        $gameName = $entityFound.name
    }

    # Create Temp file to signal parent process to update notification icon color to show game is running
    Write-Output "$gameName" > "$env:TEMP\GmGdn-TrackingGame.txt"
    $currentPlayTime = TimeTrackerLoop $DetectedExe
    # Remove Temp file to signal parent process to update notification icon color to show game has finished
    Remove-Item "$env:TEMP\GmGdn-TrackingGame.txt"

    if ($null -ne $entityFound) {
        Log "Game Already Exists. Updating PlayTime and Last Played Date"
        $recordedGamePlayTime = GetPlayTime $gameName
        $updatedPlayTime = $recordedGamePlayTime + $currentPlayTime

        # Get current PC and append if needed
        $currentPC = Read-Setting "current_pc"
        $updatedPCList = ""
        if ($null -ne $currentPC) {
            $gameNamePattern = SQLEscapedMatchPattern($gameName.Trim())
            $getGamingPCQuery = "SELECT gaming_pc_name FROM games WHERE name LIKE '{0}'" -f $gameNamePattern
            $existingPCs = (RunDBQuery $getGamingPCQuery).gaming_pc_name

            if ([string]::IsNullOrEmpty($existingPCs)) {
                $updatedPCList = $currentPC
            } elseif ($existingPCs -notlike "*$currentPC*") {
                $updatedPCList = $existingPCs + "," + $currentPC
            }
        }

        UpdateGameOnSession -GameName $gameName -GamePlayTime $updatedPlayTime -GameLastPlayDate $updatedLastPlayDate -GameGamingPCName $updatedPCList
    }

    if ($null -ne $gameName) {
        $splits = Get-SessionSplits $processStartTime $currentPlayTime
        foreach ($split in $splits) {
            RecordPlaytimeOnDate $split.Duration $split.Date

            # Convert segment start time to Unix UTC for session history
            $splitStartTimeUnix = [int]((Get-Date ($split.StartTime.ToUniversalTime()) -UFormat %s).Split('.,')[0])
            RecordSessionHistory -GameName $gameName -StartTime $splitStartTimeUnix -Duration $split.Duration
        }

        # Update current PC playtime
        $currentPC = Read-Setting "current_pc"
        if ($null -ne $currentPC) {
            UpdatePCPlaytime -PCName $currentPC -DurationMinutes $currentPlayTime
        }
    }

    $databaseFileHashAfter = CalculateFileHash '.\GamingGaiden.db'
    Log "Database hash after: $databaseFileHashAfter"

    if ($databaseFileHashAfter -ne $databaseFileHashBefore) {
        BackupDatabase
    }
}
