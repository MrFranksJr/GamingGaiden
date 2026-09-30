# Tests for StorageFunctions: game persistence, including optional exe (backfilled games).
#
# SaveGame / UpdateGameOnEdit call RunDBQuery without an explicit -DatabasePath, so they
# default to ".\GamingGaiden.db" relative to the current working directory. Each test runs
# from a fresh $TestDrive working directory with its own games table so the real database is
# never touched.

$sqliteModulePath = Join-Path $PSScriptRoot "..\..\modules\PSSQLite\1.1.0\PSSQLite.psd1"
$helperPath = Join-Path $PSScriptRoot "..\..\modules\HelperFunctions.psm1"
$storagePath = Join-Path $PSScriptRoot "..\..\modules\StorageFunctions.psm1"

# PSSQLite bundles a native (Windows) System.Data.SQLite provider. On platforms where it
# cannot load (e.g. CI on macOS/Linux dev machines) these tests can't touch a real database,
# so skip them rather than fail spuriously. The canonical run is on Windows.
$script:SqliteAvailable = $true
try {
    Import-Module $sqliteModulePath -Force -ErrorAction Stop
}
catch {
    $script:SqliteAvailable = $false
}
Import-Module $helperPath -Force
Import-Module $storagePath -Force

Describe "StorageFunctions - optional exe" -Skip:(-not $script:SqliteAvailable) {

    BeforeEach {
        # Silence logging noise from the modules under test.
        Mock Log {} -ModuleName StorageFunctions
        Mock Log {} -ModuleName HelperFunctions

        # Work from an isolated directory so ".\GamingGaiden.db" resolves inside $TestDrive.
        $script:originalLocation = Get-Location
        Set-Location $TestDrive

        # Minimal games table matching the production schema's relevant columns.
        $createGamesTable = @"
CREATE TABLE IF NOT EXISTS games (
    name TEXT PRIMARY KEY NOT NULL,
    exe_name TEXT,
    icon BLOB,
    play_time INTEGER,
    last_play_date INTEGER,
    completed TEXT,
    session_count INTEGER DEFAULT 0,
    status TEXT,
    gaming_pc_name TEXT,
    release_date TEXT,
    finish_date TEXT
)
"@
        Invoke-SqliteQuery -Query $createGamesTable -DataBase (Join-Path $TestDrive "GamingGaiden.db") | Out-Null

        # A throwaway icon file so SaveGame's Get-Content on the icon path succeeds.
        $script:iconPath = Join-Path $TestDrive "icon.png"
        [System.IO.File]::WriteAllBytes($script:iconPath, [byte[]](0x89, 0x50, 0x4E, 0x47))
    }

    AfterEach {
        Set-Location $script:originalLocation
    }

    It "Stores SQL NULL for exe_name when the exe is blank (backfilled game)" {
        SaveGame -GameName "Legacy Game" -GameExeName "" -GameIconPath $script:iconPath `
            -GamePlayTime 600 -GameLastPlayDate "" -GameCompleteStatus "FALSE" -GameSessionCount 0

        $row = Invoke-SqliteQuery -Query "SELECT exe_name FROM games WHERE name = 'Legacy Game'" `
            -DataBase (Join-Path $TestDrive "GamingGaiden.db")

        # A true SQL NULL comes back as [System.DBNull], not an empty string.
        ($row.exe_name -is [System.DBNull]) | Should Be $true
    }

    It "Stores the exe_name verbatim when provided (normal tracked game)" {
        SaveGame -GameName "Tracked Game" -GameExeName "coolgame" -GameIconPath $script:iconPath `
            -GamePlayTime 120 -GameLastPlayDate "1700000000" -GameCompleteStatus "FALSE" -GameSessionCount 0

        $row = Invoke-SqliteQuery -Query "SELECT exe_name FROM games WHERE name = 'Tracked Game'" `
            -DataBase (Join-Path $TestDrive "GamingGaiden.db")

        $row.exe_name | Should Be "coolgame"
    }

    It "Stores SQL NULL for last_play_date when it is blank (backfilled game)" {
        SaveGame -GameName "No Date Game" -GameExeName "" -GameIconPath $script:iconPath `
            -GamePlayTime 300 -GameLastPlayDate "" -GameCompleteStatus "FALSE" -GameSessionCount 0

        $row = Invoke-SqliteQuery -Query "SELECT last_play_date FROM games WHERE name = 'No Date Game'" `
            -DataBase (Join-Path $TestDrive "GamingGaiden.db")

        ($row.last_play_date -is [System.DBNull]) | Should Be $true
    }

    It "Clears exe_name to SQL NULL when an edit blanks the exe (same name)" {
        SaveGame -GameName "Editable Game" -GameExeName "oldexe" -GameIconPath $script:iconPath `
            -GamePlayTime 60 -GameLastPlayDate "1700000000" -GameCompleteStatus "FALSE" -GameSessionCount 0

        UpdateGameOnEdit -OriginalGameName "Editable Game" -GameName "Editable Game" -GameExeName "" `
            -GameIconPath $script:iconPath -GamePlayTime 60 -GameCompleteStatus "FALSE" -GameStatus ""

        $row = Invoke-SqliteQuery -Query "SELECT exe_name FROM games WHERE name = 'Editable Game'" `
            -DataBase (Join-Path $TestDrive "GamingGaiden.db")

        ($row.exe_name -is [System.DBNull]) | Should Be $true
    }

    It "Keeps exe_name NULL through a rename edit (delete + re-add path)" {
        SaveGame -GameName "Old Name" -GameExeName "" -GameIconPath $script:iconPath `
            -GamePlayTime 90 -GameLastPlayDate "" -GameCompleteStatus "FALSE" -GameSessionCount 0

        UpdateGameOnEdit -OriginalGameName "Old Name" -GameName "New Name" -GameExeName "" `
            -GameIconPath $script:iconPath -GamePlayTime 90 -GameCompleteStatus "FALSE" -GameStatus ""

        $row = Invoke-SqliteQuery -Query "SELECT exe_name FROM games WHERE name = 'New Name'" `
            -DataBase (Join-Path $TestDrive "GamingGaiden.db")

        ($row.exe_name -is [System.DBNull]) | Should Be $true
    }

    It "A backfilled (NULL exe) game never yields a matchable exe for the tracker" {
        # A tracked game and a backfilled game with no exe.
        SaveGame -GameName "Tracked" -GameExeName "runnable" -GameIconPath $script:iconPath `
            -GamePlayTime 10 -GameLastPlayDate "1700000000" -GameCompleteStatus "FALSE" -GameSessionCount 0
        SaveGame -GameName "Backfilled" -GameExeName "" -GameIconPath $script:iconPath `
            -GamePlayTime 10 -GameLastPlayDate "" -GameCompleteStatus "FALSE" -GameSessionCount 0

        # Mirror DetectGame's query and its guard predicate.
        $exeList = [string[]] @((Invoke-SqliteQuery -Query "SELECT exe_name FROM games ORDER BY last_play_date DESC" `
            -DataBase (Join-Path $TestDrive "GamingGaiden.db")).exe_name)

        $matchable = @($exeList | Where-Object { $null -ne $_ -and $_ -ne "" })

        $matchable | Should Be @("runnable")
    }
}
