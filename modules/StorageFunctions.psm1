function SaveGame() {
    param(
        [string]$GameName,
        [string]$GameExeName,
        [string]$GameIconPath,
        [string]$GamePlayTime,
        [string]$GameLastPlayDate,
        [string]$GameCompleteStatus,
        [string]$GameSessionCount,
        [string]$GameStatus = "",
        [string]$GameGamingPCName = "",
        [string]$GameReleaseDate = ""
    )

    $gameIconBytes = (Get-Content -Path $GameIconPath -Encoding byte -Raw);

    $addGameQuery = "INSERT INTO games (name, exe_name, icon, play_time, last_play_date, completed, session_count, status, gaming_pc_name, release_date)" +
    "VALUES (@GameName, @GameExeName, @gameIconBytes, @GamePlayTime, @GameLastPlayDate, @GameCompleteStatus, @GameSessionCount, @GameStatus, @GameGamingPCName, @GameReleaseDate)"

    $gameNamePattern = SQLEscapedMatchPattern($GameName.Trim())
    $setGameStatusNull = "UPDATE games SET status = @GameStatus WHERE name LIKE '{0}'" -f $gameNamePattern
    $setGamingPCNameNull = "UPDATE games SET gaming_pc_name = @GameGamingPCName WHERE name LIKE '{0}'" -f $gameNamePattern
    $setReleaseDateNull = "UPDATE games SET release_date = @GameReleaseDate WHERE name LIKE '{0}'" -f $gameNamePattern

    Log "Adding $GameName in Database"

    RunDBQuery $addGameQuery @{
        GameName           = $GameName.Trim()
        GameExeName        = $GameExeName.Trim()
        gameIconBytes      = $gameIconBytes
        GamePlayTime       = $GamePlayTime
        GameLastPlayDate   = $GameLastPlayDate
        GameCompleteStatus = $GameCompleteStatus
        GameSessionCount   = $GameSessionCount
        GameStatus         = $GameStatus
        GameGamingPCName   = $GameGamingPCName.Trim()
        GameReleaseDate    = $GameReleaseDate
    }

    # Have to set Null Values after the Save for clean code, bcause the following doesn't work
    #
    #    $var = $GameRomBasedName.Trim()
    #    if ($GameRomBasedName -eq "") {
    #       $var = [System.DBNull]::Value
    #    }
    #    RunDBQuery $addGameQuery @{ ..., GameRomBasedName = $var }
    #
    # On using the above code, [System.DBNull]::Value gets casted to string for some reason and gets inserted in DB as blank string instead of a true NULL.

    if ($GameStatus -eq "") {
        RunDBQuery $setGameStatusNull @{
            GameStatus = [System.DBNull]::Value
        }
    }

    if ($GameGamingPCName -eq "") {
        RunDBQuery $setGamingPCNameNull @{
            GameGamingPCName = [System.DBNull]::Value
        }
    }

    if ($GameReleaseDate -eq "") {
        RunDBQuery $setReleaseDateNull @{
            GameReleaseDate = [System.DBNull]::Value
        }
    }

}

function SavePC() {
    param(
        [string]$PCName,
        [string]$PCIconPath,
        [string]$PCCost,
        [string]$PCCurrency,
        [string]$PCStartDate,
        [string]$PCEndDate,
        [string]$PCCurrentStatus,
        [int]$PCTotalPlaytime = 0
    )

    $PCIconBytes = (Get-Content -Path $PCIconPath -Encoding byte -Raw);

    $addPCQuery = "INSERT INTO gaming_pcs (name, icon, cost, currency, start_date, end_date, in_use, total_play_time)" +
    "VALUES (@PCName, @PCIconBytes, @PCCost, @PCCurrency, @PCStartDate, @PCEndDate, @PCCurrentStatus, @PCTotalPlaytime)"

    Log "Adding PC $PCName in database"
    RunDBQuery $addPCQuery @{
        PCName          = $PCName.Trim()
        PCIconBytes     = $PCIconBytes
        PCCost          = $PCCost.Trim()
        PCCurrency      = $PCCurrency.Trim()
        PCStartDate     = $PCStartDate
        PCEndDate       = $PCEndDate
        PCCurrentStatus = $PCCurrentStatus
        PCTotalPlaytime = $PCTotalPlaytime
    }
}

function UpdateGameOnSession() {
    param(
        [string]$GameName,
        [string]$GamePlayTime,
        [string]$GameLastPlayDate,
        [string]$GameGamingPCName = ""
    )

    $gameNamePattern = SQLEscapedMatchPattern($GameName.Trim())

    $getSessionCountQuery = "SELECT session_count FROM games WHERE name LIKE '{0}'" -f $gameNamePattern
    $currentSessionCount = (RunDBQuery $getSessionCountQuery).session_count

    $newSessionCount = $currentSessionCount + 1

    $updateGamePlayTimeQuery = "UPDATE games SET play_time = @UpdatedPlayTime, last_play_date = @UpdatedLastPlayDate, session_count = @newSessionCount WHERE name LIKE '{0}'" -f $gameNamePattern

    Log "Updating $GameName play time to $GamePlayTime min in database"
    Log "Updating session count from $currentSessionCount to $newSessionCount in database"

    RunDBQuery $updateGamePlayTimeQuery @{
        UpdatedPlayTime     = $GamePlayTime
        UpdatedLastPlayDate = $GameLastPlayDate
        newSessionCount     = $newSessionCount
    }

    if (-not [string]::IsNullOrEmpty($GameGamingPCName)) {
        Log "Updating gaming PC list to: $GameGamingPCName"
        $updateGamePCQuery = "UPDATE games SET gaming_pc_name = @GameGamingPCName WHERE name LIKE '{0}'" -f $gameNamePattern
        RunDBQuery $updateGamePCQuery @{
            GameGamingPCName    = $GameGamingPCName
        }
    }
}

function UpdateGameOnEdit() {
    param(
        [string]$OriginalGameName,
        [string]$GameName,
        [string]$GameExeName,
        [string]$GameIconPath,
        [string]$GamePlayTime,
        [string]$GameCompleteStatus,
        [string]$GameStatus,
        [string]$GameGamingPCName = "",
        [string]$GameReleaseDate = ""
    )

    $gameIconBytes = (Get-Content -Path $GameIconPath -Encoding byte -Raw);

    $gameNamePattern = SQLEscapedMatchPattern($OriginalGameName.Trim())

    if ( $OriginalGameName -eq $GameName) {
        $updateGameQuery = "UPDATE games SET exe_name = @GameExeName, icon = @gameIconBytes, play_time = @GamePlayTime, completed = @GameCompleteStatus, status = @GameStatus, gaming_pc_name = @GameGamingPCName, release_date = @GameReleaseDate WHERE name LIKE '{0}'" -f $gameNamePattern
        
        $setGamingPCNameNull = "UPDATE games SET gaming_pc_name = @GameGamingPCName WHERE name LIKE '{0}'" -f $gameNamePattern
        $setReleaseDateNull = "UPDATE games SET release_date = @GameReleaseDate WHERE name LIKE '{0}'" -f $gameNamePattern

        Log "Editing $GameName in database"
        RunDBQuery $updateGameQuery @{
            GameExeName        = $GameExeName.Trim()
            gameIconBytes      = $gameIconBytes
            GamePlayTime       = $GamePlayTime
            GameCompleteStatus = $GameCompleteStatus
            GameStatus         = $GameStatus
            GameGamingPCName   = $GameGamingPCName.Trim()
            GameReleaseDate    = $GameReleaseDate
        }

        if ($GameGamingPCName -eq "") {
            RunDBQuery $setGamingPCNameNull @{
                GameGamingPCName = [System.DBNull]::Value
            }
        }

        if ($GameReleaseDate -eq "") {
            RunDBQuery $setReleaseDateNull @{
                GameReleaseDate = [System.DBNull]::Value
            }
        }
    }
    else {
        Log "User changed game's name from $OriginalGameName to $GameName. Need to delete the game and add it again"

        $getSessionCountQuery = "SELECT session_count FROM games WHERE name LIKE '{0}'" -f $gameNamePattern
        $gameSessionCount = (RunDBQuery $getSessionCountQuery).session_count

        $getLastPlayDateQuery = "SELECT last_play_date FROM games WHERE name LIKE '{0}'" -f $gameNamePattern
        $gameLastPlayDate = (RunDBQuery $getLastPlayDateQuery).last_play_date

        $getReleaseDateQuery = "SELECT release_date FROM games WHERE name LIKE '{0}'" -f $gameNamePattern
        $gameReleaseDate = (RunDBQuery $getReleaseDateQuery).release_date
        if ($null -eq $gameReleaseDate) { $gameReleaseDate = "" }

        SaveGame -GameName $GameName -GameExeName $GameExeName -GameIconPath $GameIconPath `
            -GamePlayTime $GamePlayTime -GameLastPlayDate $gameLastPlayDate -GameCompleteStatus $GameCompleteStatus -GameSessionCount $gameSessionCount -GameStatus $GameStatus -GameGamingPCName $GameGamingPCName -GameReleaseDate $gameReleaseDate

        $updateSessionHistoryQuery = "UPDATE session_history SET game_name = @NewGameName WHERE game_name LIKE '{0}'" -f $gameNamePattern
        Log "Updating session history references from $OriginalGameName to $GameName"
        RunDBQuery $updateSessionHistoryQuery @{
            NewGameName = $GameName.Trim()
        }

        RemoveGame($OriginalGameName)
    }
}

function UpdatePC() {
    param(
        [string]$AddNew = $false,
        [string]$OriginalPCName,
        [string]$PCName,
        [string]$PCIconPath,
        [string]$PCCost,
        [string]$PCCurrency,
        [string]$PCStartDate,
        [string]$PCEndDate,
        [string]$PCCurrentStatus,
        [int]$PCTotalPlaytime = 0
    )

    $PCNamePattern = SQLEscapedMatchPattern($OriginalPCName.Trim())

    if ($AddNew -eq $true) {
        SavePC -PCName $PCName -PCIconPath $PCIconPath -PCCost $PCCost -PCCurrency $PCCurrency -PCStartDate $PCStartDate -PCEndDate $PCEndDate -PCCurrentStatus $PCCurrentStatus -PCTotalPlaytime $PCTotalPlaytime
        return
    }

    if ($OriginalPCName -eq $PCName) {

        $PCIconBytes = (Get-Content -Path $PCIconPath -Encoding byte -Raw);

        $updatePCQuery = "UPDATE gaming_pcs SET icon = @PCIconBytes, cost = @PCCost, currency = @PCCurrency, start_date = @PCStartDate, end_date = @PCEndDate, in_use = @PCCurrentStatus, total_play_time = @PCTotalPlaytime WHERE name LIKE '{0}'" -f $PCNamePattern

        Log "Updating PC $PCName in database"
        RunDBQuery $updatePCQuery @{
            PCIconBytes     = $PCIconBytes
            PCCost          = $PCCost
            PCCurrency      = $PCCurrency
            PCStartDate     = $PCStartDate
            PCEndDate       = $PCEndDate
            PCCurrentStatus = $PCCurrentStatus
            PCTotalPlaytime = $PCTotalPlaytime
        }
    }
    else {
        Log "User changed PC's name from $OriginalPCName to $PCName. Need to delete the PC and add it again"
        RemovePC $OriginalPCName
        SavePC -PCName $PCName -PCIconPath $PCIconPath -PCCost $PCCost -PCCurrency $PCCurrency -PCStartDate $PCStartDate -PCEndDate $PCEndDate -PCCurrentStatus $PCCurrentStatus -PCTotalPlaytime $PCTotalPlaytime
    }
}

function RemoveGame($GameName) {
    $gameNamePattern = SQLEscapedMatchPattern($GameName.Trim())
    $removeGameQuery = "DELETE FROM games WHERE name LIKE '{0}'" -f $gameNamePattern

    Log "Removing $GameName from database"
    RunDBQuery $removeGameQuery
}

function RemovePC($PCName) {
    $PCNamePattern = SQLEscapedMatchPattern($PCName.Trim())
    $removePCQuery = "DELETE FROM gaming_pcs WHERE name LIKE '{0}'" -f $PCNamePattern

    Log "Removing PC $PCName from database"
    RunDBQuery $removePCQuery
}

function RecordPlaytimeOnDate($PlayTime, $Date = $null) {
    $dateString = "DATE('now')"
    if ($null -ne $Date) {
        $dateString = "'$($Date.ToString('yyyy-MM-dd'))'"
    }

    $existingPlayTimeQuery = "SELECT play_time FROM daily_playtime WHERE play_date like $dateString"

    $existingPlayTime = (RunDBQuery $existingPlayTimeQuery).play_time

    $recordPlayTimeQuery = ""
    if ($null -eq $existingPlayTime) {
        $recordPlayTimeQuery = "INSERT INTO daily_playtime(play_date, play_time) VALUES ($dateString, {0})" -f $PlayTime
    }
    else {
        $updatedPlayTime = $PlayTime + $existingPlayTime

        $recordPlayTimeQuery = "UPDATE daily_playtime SET play_time = {0} WHERE play_date like $dateString" -f $updatedPlayTime
    }

    Log "Updating playTime for $dateString in database"
    RunDBQuery $recordPlayTimeQuery
}

function RecordSessionHistory($GameName, $StartTime, $Duration) {
    Log "Recording session history for $GameName - Start: $StartTime, Duration: $Duration min"

    $insertQuery = @"
INSERT INTO session_history (game_name, start_time, duration)
VALUES (@GameName, @StartTime, @Duration)
"@

    $parameters = @{
        GameName = $GameName
        StartTime = $StartTime
        Duration = $Duration
    }

    try {
        RunDBQuery $insertQuery $parameters
        Log "Session history recorded successfully"
    }
    catch {
        Log "Error recording session history: $($_.Exception.Message)"
    }
}

function Repair-HistoricSessionData() {
    Log "Starting historic session data repair"
    
    $sessions = RunDBQuery "SELECT id, game_name, start_time, duration FROM session_history"
    
    if ($null -eq $sessions) {
        Log "No session history found to repair."
        return
    }

    if ($sessions -isnot [array]) {
        $sessions = @($sessions)
    }

    foreach ($session in $sessions) {
        # Convert Unix timestamp (UTC) to local DateTime
        $startTime = [DateTimeOffset]::FromUnixTimeSeconds($session.start_time).LocalDateTime
        $endTime = $startTime.AddMinutes($session.duration)

        $splits = Get-SessionSplits $startTime $session.duration

        if ($splits.Count -gt 1) {
            Log "Session ID $($session.id) for $($session.game_name) spans across midnight ($startTime to $endTime). Repairing..."
            
            # Remove original session from session_history
            RunDBQuery "DELETE FROM session_history WHERE id = $($session.id)"
            
            # Add new split sessions to session_history
            foreach ($split in $splits) {
                # Convert back to Unix UTC
                $splitStartTimeUnix = [int]((Get-Date ($split.StartTime.ToUniversalTime()) -UFormat %s).Split('.,')[0])
                RecordSessionHistory -GameName $session.game_name -StartTime $splitStartTimeUnix -Duration $split.Duration
            }
        }
    }
    Log "Historic session data repair completed."

    Log "Rebuilding daily_playtime table for consistency..."
    RunDBQuery "DELETE FROM daily_playtime"
    
    # Verify the table is empty
    $count = (RunDBQuery "SELECT COUNT(*) as count FROM daily_playtime").count
    if ($count -gt 0) {
        Log "Error: Failed to clear daily_playtime table. Database might be locked. Rebuild aborted."
        return
    }

    $rebuildQuery = @"
INSERT INTO daily_playtime (play_date, play_time)
SELECT date(start_time, 'unixepoch', 'localtime') as d, SUM(duration)
FROM session_history
GROUP BY d;
"@
    
    try {
        RunDBQuery $rebuildQuery
        Log "Daily playtime table rebuild completed successfully using SQL aggregation."
    }
    catch {
        Log "Error during SQL-based rebuild: $($_.Exception.Message). Falling back to manual re-recording..."
        $finalSessions = RunDBQuery "SELECT start_time, duration FROM session_history"
        if ($null -ne $finalSessions) {
            if ($finalSessions -isnot [array]) { $finalSessions = @($finalSessions) }
            Log "Re-recording $($finalSessions.Count) session segments into daily_playtime..."
            foreach ($session in $finalSessions) {
                $startTime = [DateTimeOffset]::FromUnixTimeSeconds($session.start_time).LocalDateTime
                RecordPlaytimeOnDate $session.duration $startTime.Date
            }
        }
    }
}

function Read-Setting($Key) {
    $settingsPath = ".\settings.ini"

    if (-Not (Test-Path $settingsPath)) {
        Log "Settings file not found at $settingsPath"
        return $null
    }

    $content = Get-Content -Path $settingsPath -Raw
    $pattern = "(?m)^$Key\s*=\s*(.+)$"

    if ($content -match $pattern) {
        return $Matches[1].Trim()
    }

    return $null
}

function Write-Setting($Key, $Value) {
    $settingsPath = ".\settings.ini"

    if (-Not (Test-Path $settingsPath)) {
        New-Item -Path $settingsPath -ItemType File -Force | Out-Null
        Log "Created settings file at $settingsPath"
    }

    $content = Get-Content -Path $settingsPath -Raw
    $pattern = "(?m)^$Key\s*=\s*.+$"

    if ($content -match $pattern) {
        $newContent = $content -replace $pattern, "$Key=$Value"
    }
    else {
        $newContent = $content + "$Key=$Value`n"
    }

    Set-Content -Path $settingsPath -Value $newContent -Force
    Log "Setting updated: $Key=$Value"
}

function UpdatePCPlaytime($PCName, $DurationMinutes) {
    if ([string]::IsNullOrEmpty($PCName)) {
        return
    }

    $updateQuery = "UPDATE gaming_pcs SET total_play_time = total_play_time + @Duration WHERE name = @PCName"

    Log "Updating PC $PCName playtime by $DurationMinutes minutes"
    RunDBQuery $updateQuery @{
        Duration = $DurationMinutes
        PCName = $PCName
    }
}
