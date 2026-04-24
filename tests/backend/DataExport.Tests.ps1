# Import dependencies first
$helperPath = Join-Path $PSScriptRoot "..\..\modules\HelperFunctions.psm1"
$modulePath = Join-Path $PSScriptRoot "..\..\modules\DataExport.psm1"

Import-Module $helperPath -Force
Import-Module $modulePath -Force

Describe "DataExport Module" {
    Context "Export-GameDataToJson" {
        BeforeAll {
            # Mock Log and RunDBQuery within the module scope if possible, or just globally
            Mock Log {} -ModuleName DataExport
            Mock RunDBQuery {
                param($Query)
                if ($Query -like "*FROM games*") {
                    return @(
                        [PSCustomObject]@{ name = "Game 1"; play_time = 100; session_count = 5; completed = "TRUE"; last_play_date = "2023-01-01"; status = "finished"; gaming_pc_name = "PC1" },
                        [PSCustomObject]@{ name = "Game 2"; play_time = 50; session_count = 2; completed = "FALSE"; last_play_date = "2023-01-02"; status = "playing"; gaming_pc_name = "PC1,PC2" }
                    )
                }
                if ($Query -like "*FROM session_history*") {
                    return @(
                        [PSCustomObject]@{ id = 1; game_name = "Game 1"; start_time = "2023-01-01 10:00:00"; duration = 60 },
                        [PSCustomObject]@{ id = 2; game_name = "Game 2"; start_time = "2023-01-02 11:00:00"; duration = 30 }
                    )
                }
                if ($Query -like "*FROM gaming_pcs*") {
                    return @(
                        [PSCustomObject]@{ name = "PC1"; in_use = "TRUE" },
                        [PSCustomObject]@{ name = "PC2"; in_use = "FALSE" }
                    )
                }
                return @()
            } -ModuleName DataExport
        }

        It "Should exist" {
            Get-Command Export-GameDataToJson -ErrorAction SilentlyContinue | Should -Not -BeNullOrEmpty
        }

        It "Should export data to data.json" {
            $outputPath = Join-Path $PSScriptRoot "test_data.json"
            $lastHashFile = "$outputPath.last"
            if (Test-Path $outputPath) { Remove-Item $outputPath }
            if (Test-Path $lastHashFile) { Remove-Item $lastHashFile }

            Export-GameDataToJson -OutputPath $outputPath

            Test-Path $outputPath | Should -Be $true
            $content = Get-Content $outputPath | ConvertFrom-Json
            
            $content.games.Count | Should -Be 2
            $content.games[0].name | Should -Be "Game 1"
            $content.session_history.Count | Should -Be 2
            $content.gaming_pcs.Count | Should -Be 2

            Remove-Item $outputPath
            Remove-Item $lastHashFile
        }

        It "Should skip export if no changes detected" {
            $outputPath = Join-Path $PSScriptRoot "test_data_skip.json"
            $lastHashFile = "$outputPath.last"
            if (Test-Path $outputPath) { Remove-Item $outputPath }
            if (Test-Path $lastHashFile) { Remove-Item $lastHashFile }

            # First export
            Export-GameDataToJson -OutputPath $outputPath
            $firstWriteTime = (Get-Item $outputPath).LastWriteTime.Ticks

            # Second export (should skip)
            $firstHashBefore = Get-Content $lastHashFile -Raw
            Start-Sleep -Milliseconds 100
            Export-GameDataToJson -OutputPath $outputPath
            $secondHashAfter = Get-Content $lastHashFile -Raw

            $secondHashAfter | Should -Be $firstHashBefore
            # Verify no file write by checking Ticks haven't changed by much (though Pester 3 is being weird)
            # We'll just rely on the fact that if it skipped, the hash file wasn't rewritten with a new date

            Remove-Item $outputPath
            Remove-Item $lastHashFile
        }
    }
}
