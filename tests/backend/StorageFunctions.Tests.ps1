# Tests for StorageFunctions: game persistence, including optional exe (backfilled games).
#
# SaveGame / UpdateGameOnEdit call RunDBQuery without an explicit -DatabasePath, so they
# default to ".\GamingGaiden.db" relative to the current working directory. Each test runs
# from its OWN fresh directory + database (created in BeforeEach) so tests never share state
# and the real database is never touched.

$sqliteModulePath = Join-Path $PSScriptRoot "..\..\modules\PSSQLite\1.1.0\PSSQLite.psd1"
$helperPath = Join-Path $PSScriptRoot "..\..\modules\HelperFunctions.psm1"
$storagePath = Join-Path $PSScriptRoot "..\..\modules\StorageFunctions.psm1"

# PSSQLite bundles a native (Windows) System.Data.SQLite provider. On platforms where it
# cannot load (e.g. macOS/Linux dev machines) these tests can't touch a real database, so
# skip them rather than fail spuriously. The canonical run is on Windows.
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

        # A UNIQUE working directory per test guarantees a fresh ".\GamingGaiden.db" with no
        # rows carried over from a previous test.
        $script:originalLocation = Get-Location
        $script:workDir = Join-Path $TestDrive ([System.Guid]::NewGuid().ToString("N"))
        New-Item -ItemType Directory -Path $script:workDir -Force | Out-Null
        Set-Location $script:workDir
        $script:dbPath = Join-Path $script:workDir "GamingGaiden.db"

        # Full-enough schema: games plus session_history (the rename path in UpdateGameOnEdit
        # rewrites session_history references).
        $createGamesTable = @"
CREATE TABLE games (
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
        $createSessionHistoryTable = @"
CREATE TABLE session_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_name TEXT NOT NULL,
    start_time INTEGER NOT NULL,
    duration INTEGER NOT NULL
)
"@
        Invoke-SqliteQuery -Query $createGamesTable -DataBase $script:dbPath | Out-Null
        Invoke-SqliteQuery -Query $createSessionHistoryTable -DataBase $script:dbPath | Out-Null

        # A throwaway icon file so SaveGame's byte-read of the icon path succeeds.
        $script:iconPath = Join-Path $script:workDir "icon.png"
        [System.IO.File]::WriteAllBytes($script:iconPath, [byte[]](0x89, 0x50, 0x4E, 0x47))
    }

    AfterEach {
        Set-Location $script:originalLocation
    }

    It "Stores SQL NULL for exe_name when the exe is blank (backfilled game)" {
        SaveGame -GameName "Legacy Game" -GameExeName "" -GameIconPath $script:iconPath `
            -GamePlayTime 600 -GameLastPlayDate "" -GameCompleteStatus "FALSE" -GameSessionCount 0

        # Ask SQLite directly whether the stored value is a true NULL (1) vs an empty
        # string (0). This is unambiguous and independent of how the PSSQLite reader
        # surfaces NULLs (its DBNullScrubber returns $null, not [System.DBNull]).
        $row = Invoke-SqliteQuery -Query "SELECT (exe_name IS NULL) AS is_null FROM games WHERE name = 'Legacy Game'" `
            -DataBase $script:dbPath

        $row.is_null | Should -Be 1
    }

    It "Stores the exe_name verbatim when provided (normal tracked game)" {
        SaveGame -GameName "Tracked Game" -GameExeName "coolgame" -GameIconPath $script:iconPath `
            -GamePlayTime 120 -GameLastPlayDate "1700000000" -GameCompleteStatus "FALSE" -GameSessionCount 0

        $row = Invoke-SqliteQuery -Query "SELECT exe_name FROM games WHERE name = 'Tracked Game'" `
            -DataBase $script:dbPath

        $row.exe_name | Should -Be "coolgame"
    }

    It "Stores SQL NULL for last_play_date when it is blank (backfilled game)" {
        SaveGame -GameName "No Date Game" -GameExeName "" -GameIconPath $script:iconPath `
            -GamePlayTime 300 -GameLastPlayDate "" -GameCompleteStatus "FALSE" -GameSessionCount 0

        $row = Invoke-SqliteQuery -Query "SELECT (last_play_date IS NULL) AS is_null FROM games WHERE name = 'No Date Game'" `
            -DataBase $script:dbPath

        $row.is_null | Should -Be 1
    }

    It "Clears exe_name to SQL NULL when an edit blanks the exe (same name)" {
        SaveGame -GameName "Editable Game" -GameExeName "oldexe" -GameIconPath $script:iconPath `
            -GamePlayTime 60 -GameLastPlayDate "1700000000" -GameCompleteStatus "FALSE" -GameSessionCount 0

        UpdateGameOnEdit -OriginalGameName "Editable Game" -GameName "Editable Game" -GameExeName "" `
            -GameIconPath $script:iconPath -GamePlayTime 60 -GameCompleteStatus "FALSE" -GameStatus ""

        $row = Invoke-SqliteQuery -Query "SELECT (exe_name IS NULL) AS is_null FROM games WHERE name = 'Editable Game'" `
            -DataBase $script:dbPath

        $row.is_null | Should -Be 1
    }

    It "Keeps exe_name NULL through a rename edit (delete + re-add path)" {
        SaveGame -GameName "Old Name" -GameExeName "" -GameIconPath $script:iconPath `
            -GamePlayTime 90 -GameLastPlayDate "" -GameCompleteStatus "FALSE" -GameSessionCount 0

        UpdateGameOnEdit -OriginalGameName "Old Name" -GameName "New Name" -GameExeName "" `
            -GameIconPath $script:iconPath -GamePlayTime 90 -GameCompleteStatus "FALSE" -GameStatus ""

        $row = Invoke-SqliteQuery -Query "SELECT (exe_name IS NULL) AS is_null FROM games WHERE name = 'New Name'" `
            -DataBase $script:dbPath

        $row.is_null | Should -Be 1
    }

    It "A backfilled (NULL exe) game never yields a matchable exe for the tracker" {
        # A tracked game and a backfilled game with no exe.
        SaveGame -GameName "Tracked" -GameExeName "runnable" -GameIconPath $script:iconPath `
            -GamePlayTime 10 -GameLastPlayDate "1700000000" -GameCompleteStatus "FALSE" -GameSessionCount 0
        SaveGame -GameName "Backfilled" -GameExeName "" -GameIconPath $script:iconPath `
            -GamePlayTime 10 -GameLastPlayDate "" -GameCompleteStatus "FALSE" -GameSessionCount 0

        # Mirror DetectGame's query and its guard predicate.
        $exeList = [string[]] @((Invoke-SqliteQuery -Query "SELECT exe_name FROM games ORDER BY last_play_date DESC" `
            -DataBase $script:dbPath).exe_name)

        $matchable = @($exeList | Where-Object { $null -ne $_ -and $_ -ne "" })

        $matchable | Should -Be @("runnable")
    }

    # NOTE: the other optional columns (status, gaming_pc_name, release_date, finish_date)
    # still use the original [System.DBNull]::Value parameter pattern, which only coerces to a
    # real SQL NULL on Windows PowerShell 5.1 (the app's runtime), not PowerShell 7. Only the
    # exe_name and last_play_date writes were switched to the PS7-safe literal `SET = NULL`, so
    # only those are asserted strictly here. See modules/StorageFunctions.psm1 for details.
}
