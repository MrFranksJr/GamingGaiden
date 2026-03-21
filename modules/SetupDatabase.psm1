function SetupDatabase() {
    try {
        $dbConnection = New-SQLiteConnection -DataSource ".\GamingGaiden.db"

        $createGamesTableQuery = "CREATE TABLE IF NOT EXISTS games (
                            name TEXT PRIMARY KEY NOT NULL,
                            exe_name TEXT,
                            icon BLOB,
                            play_time INTEGER,
                            last_play_date INTEGER,
                            completed TEXT,
                            platform TEXT)"

        Invoke-SqliteQuery -Query $createGamesTableQuery -SQLiteConnection $dbConnection

        $createDailyPlaytimeTableQuery = "CREATE TABLE IF NOT EXISTS daily_playtime (
                            play_date TEXT PRIMARY KEY NOT NULL,
                            play_time INTEGER)"

        Invoke-SqliteQuery -Query $createDailyPlaytimeTableQuery -SQLiteConnection $dbConnection

        $createPCTableQuery = "CREATE TABLE IF NOT EXISTS gaming_pcs (
                            name TEXT PRIMARY KEY NOT NULL,
                            icon BLOB,
                            cost TEXT,
                            currency TEXT,
                            start_date INTEGER,
                            end_date INTEGER,
                            current TEXT)"

        Invoke-SqliteQuery -Query $createPCTableQuery -SQLiteConnection $dbConnection

        $gamesTableSchema = Invoke-SqliteQuery -query "PRAGMA table_info('games')" -SQLiteConnection $dbConnection

        # Migration 2
        if (-Not $gamesTableSchema.name.Contains("session_count")) {
            $addSessionCountColumnInGamesTableQuery = "ALTER TABLE games ADD COLUMN session_count INTEGER DEFAULT 0"
            Invoke-SqliteQuery -Query $addSessionCountColumnInGamesTableQuery -SQLiteConnection $dbConnection
        }
        # End Migration 2

        # Migration 4
        if (-Not $gamesTableSchema.name.Contains("status")) {
            $addStatusColumnInGamesTableQuery = "ALTER TABLE games ADD COLUMN status TEXT"

            Invoke-SqliteQuery -Query $addStatusColumnInGamesTableQuery -SQLiteConnection $dbConnection
        }
        # End Migration 4

        # Migration 5
        $createSessionHistoryTableQuery = "CREATE TABLE IF NOT EXISTS session_history (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            game_name TEXT NOT NULL,
                            start_time INTEGER NOT NULL,
                            duration INTEGER NOT NULL,
                            FOREIGN KEY (game_name) REFERENCES games(name))"

        Invoke-SqliteQuery -Query $createSessionHistoryTableQuery -SQLiteConnection $dbConnection
        # End Migration 5

        # Migration 6 - Multi-PC tracking: Add gaming_pc_name, total_play_time and in_use columns
        if (-Not $gamesTableSchema.name.Contains("gaming_pc_name")) {
            $addGamingPCNameColumnInGamesTableQuery = "ALTER TABLE games ADD COLUMN gaming_pc_name TEXT"
            Invoke-SqliteQuery -Query $addGamingPCNameColumnInGamesTableQuery -SQLiteConnection $dbConnection
        }

        $gamingPCsTableSchema = Invoke-SqliteQuery -query "PRAGMA table_info('gaming_pcs')" -SQLiteConnection $dbConnection

        if ($gamingPCsTableSchema.name.Contains("current")) {
            # Create new table without current column
            $createNewPCTableQuery = "CREATE TABLE gaming_pcs_new (
                                name TEXT PRIMARY KEY NOT NULL,
                                icon BLOB,
                                cost TEXT,
                                currency TEXT,
                                start_date INTEGER,
                                end_date INTEGER,
                                in_use TEXT,
                                total_play_time INTEGER DEFAULT 0)"

            Invoke-SqliteQuery -Query $createNewPCTableQuery -SQLiteConnection $dbConnection

            # Copy all data from old table to new table
            $copyDataQuery = "INSERT INTO gaming_pcs_new (name, icon, cost, currency, start_date, end_date, in_use)
                              SELECT name, icon, cost, currency, start_date, end_date, current
                              FROM gaming_pcs"

            Invoke-SqliteQuery -Query $copyDataQuery -SQLiteConnection $dbConnection

            # Drop old table
            Invoke-SqliteQuery -Query "DROP TABLE gaming_pcs" -SQLiteConnection $dbConnection

            # Rename new table to original name
            Invoke-SqliteQuery -Query "ALTER TABLE gaming_pcs_new RENAME TO gaming_pcs" -SQLiteConnection $dbConnection
        }
        # End Migration 6

        # Migration 7 - Add release_date column
        if (-Not $gamesTableSchema.name.Contains("release_date")) {
            $addReleaseDateColumnQuery = "ALTER TABLE games ADD COLUMN release_date TEXT"
            Invoke-SqliteQuery -Query $addReleaseDateColumnQuery -SQLiteConnection $dbConnection
        }
        # End Migration 7

        # Migration 8 - Merge idle_time into play_time before removing idle time feature
        $gamesTableSchema = Invoke-SqliteQuery -query "PRAGMA table_info('games')" -SQLiteConnection $dbConnection
        if ($gamesTableSchema.name.Contains("idle_time")) {
            $hasIdleTime = Invoke-SqliteQuery -Query "SELECT COUNT(*) as count FROM games WHERE idle_time > 0" -SQLiteConnection $dbConnection
            if ($hasIdleTime.count -gt 0) {
                $mergeIdleTimeQuery = "UPDATE games SET play_time = play_time + idle_time, idle_time = 0"
                Invoke-SqliteQuery -Query $mergeIdleTimeQuery -SQLiteConnection $dbConnection
            }
        }
        # End Migration 8

        # Migration 9 - Remove idle_time column
        $gamesTableSchema = Invoke-SqliteQuery -query "PRAGMA table_info('games')" -SQLiteConnection $dbConnection
        if ($gamesTableSchema.name.Contains("idle_time")) {
            Invoke-SqliteQuery -Query "ALTER TABLE games DROP COLUMN idle_time" -SQLiteConnection $dbConnection
        }
        # End Migration 9

        # Migration 10 - Remove emulator support: drop emulated_platforms table and rom_based_name column
        $tableExists = Invoke-SqliteQuery -Query "SELECT name FROM sqlite_master WHERE type='table' AND name='emulated_platforms'" -SQLiteConnection $dbConnection
        if ($null -ne $tableExists) {
            Invoke-SqliteQuery -Query "DROP TABLE emulated_platforms" -SQLiteConnection $dbConnection
        }

        $gamesTableSchema = Invoke-SqliteQuery -query "PRAGMA table_info('games')" -SQLiteConnection $dbConnection
        if ($gamesTableSchema.name.Contains("rom_based_name")) {
            Invoke-SqliteQuery -Query "ALTER TABLE games DROP COLUMN rom_based_name" -SQLiteConnection $dbConnection
        }
        # End Migration 10

        $dbConnection.Close()
        $dbConnection.Dispose()
    }
    catch {
        [System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms')    | out-null
        [System.Windows.Forms.MessageBox]::Show("Exception: $($_.Exception.Message). Check log for details", 'Gaming Gaiden', "OK", "Error")

        $timestamp = Get-date -f s
        Write-Output "$timestamp : Error: A user or system error has caused an exception. Database setup could not be finished. Check log for details." >> ".\GamingGaiden.log"
        Write-Output "$timestamp : Exception: $($_.Exception.Message)" >> ".\GamingGaiden.log"
        exit 1;
    }
}
