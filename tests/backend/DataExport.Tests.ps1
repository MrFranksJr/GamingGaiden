# Import dependencies first
$sqliteModulePath = Join-Path $PSScriptRoot "..\..\modules\PSSQLite\1.1.0\PSSQLite.psd1"
$helperPath = Join-Path $PSScriptRoot "..\..\modules\HelperFunctions.psm1"
$modulePath = Join-Path $PSScriptRoot "..\..\modules\DataExport.psm1"

Import-Module $sqliteModulePath -Force
Import-Module $helperPath -Force
Import-Module $modulePath -Force

Describe "DataExport Module" {
    Context "Save-IconToCache" {
        InModuleScope DataExport {
            It "Should avoid filename collisions for names with the same sanitized form" {
                $firstPath = Save-IconToCache -Bytes ([byte[]](0xFF, 0xD8, 1)) -Name "Game: One" -CacheDir $TestDrive
                $secondPath = Save-IconToCache -Bytes ([byte[]](0xFF, 0xD8, 2)) -Name "Game? One" -CacheDir $TestDrive

                $firstPath | Should Not Be $secondPath
            }

            It "Should refresh cached bytes even when the file length is unchanged" {
                $relativePath = Save-IconToCache -Bytes ([byte[]](0xFF, 0xD8, 1)) -Name "Changing Game" -CacheDir $TestDrive
                $fileName = Split-Path $relativePath -Leaf

                Save-IconToCache -Bytes ([byte[]](0xFF, 0xD8, 2)) -Name "Changing Game" -CacheDir $TestDrive | Out-Null

                [System.IO.File]::ReadAllBytes((Join-Path $TestDrive $fileName))[2] | Should Be 2
            }

            It "Should preserve recognized PNG extensions" {
                $relativePath = Save-IconToCache -Bytes ([byte[]](0x89, 0x50, 0x4E, 0x47)) -Name "PNG Game" -CacheDir $TestDrive

                [System.IO.Path]::GetExtension($relativePath) | Should Be ".png"
            }
        }
    }

    Context "Export-GameDataToJson" {
        BeforeAll {
            # Mock Log and RunDBQuery within the module scope if possible, or just globally
            Mock Log {} -ModuleName DataExport
            Mock RunDBQuery {
                param($Query)
                if ($Query -like "*FROM games*") {
                    return @(
                        [PSCustomObject]@{ name = "Game 1"; icon = [byte[]](255, 216, 255); play_time = 100; session_count = 5; completed = "TRUE"; last_play_date = "2023-01-01"; status = "finished"; gaming_pc_name = "PC1" },
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
                        [PSCustomObject]@{ name = "PC1"; in_use = "TRUE"; icon = [byte[]](255, 216, 255) },
                        [PSCustomObject]@{ name = "PC2"; in_use = "FALSE" }
                    )
                }
                return @()
            } -ModuleName DataExport
        }

        It "Should exist" {
            Get-Command Export-GameDataToJson -ErrorAction SilentlyContinue | Should Not BeNullOrEmpty
        }

        It "Should reject an output path that is not JSON" {
            $didThrow = $false
            try
            {
                Export-GameDataToJson -OutputPath (Join-Path $TestDrive "invalid-output.txt") -ErrorAction Stop
            }
            catch
            {
                $didThrow = $true
            }
            $didThrow | Should Be $true
        }

        It "Should export data to data.json" {
            $outputPath = Join-Path $TestDrive "test_data.json"
            $lastHashFile = "$outputPath.last"
            if (Test-Path $outputPath) { Remove-Item $outputPath }
            if (Test-Path $lastHashFile) { Remove-Item $lastHashFile }

            Export-GameDataToJson -OutputPath $outputPath

            Test-Path $outputPath | Should Be $true
            # Check if data.js also exists
            $jsPath = $outputPath -replace "\.json$", ".js"
            Test-Path $jsPath | Should Be $true

            $content = Get-Content $outputPath | ConvertFrom-Json
            $jsContent = Get-Content $jsPath -Raw
            $jsJson = $jsContent -replace '^window\.gamingGaidenData\s*=\s*', '' -replace ';\s*$', ''
            $jsData = $jsJson | ConvertFrom-Json

            $content.schema_version | Should Be 1
            $jsData.schema_version | Should Be $content.schema_version
            $jsData.hash | Should Be $content.hash
            $content.games.Count | Should Be 2
            $content.games[0].name | Should Be "Game 1"
            $content.session_history.Count | Should Be 2
            $content.gaming_pcs.Count | Should Be 2

            Remove-Item $outputPath
            Remove-Item $jsPath
            Remove-Item $lastHashFile
        }

        It "Should skip export if no changes detected" {
            $outputPath = Join-Path $TestDrive "test_data_skip.json"
            $lastHashFile = "$outputPath.last"
            $jsPath = $outputPath -replace "\.json$", ".js"
            if (Test-Path $outputPath) { Remove-Item $outputPath }
            if (Test-Path $lastHashFile) { Remove-Item $lastHashFile }
            if (Test-Path $jsPath)
            {
                Remove-Item $jsPath
            }

            # First export
            Export-GameDataToJson -OutputPath $outputPath
            $firstJsonWriteTime = (Get-Item $outputPath).LastWriteTimeUtc.Ticks
            $firstJsWriteTime = (Get-Item $jsPath).LastWriteTimeUtc.Ticks

            # Second export (should skip)
            $firstHashBefore = Get-Content $lastHashFile -Raw
            Start-Sleep -Milliseconds 1100
            Export-GameDataToJson -OutputPath $outputPath
            $secondHashAfter = Get-Content $lastHashFile -Raw

            $secondHashAfter | Should Be $firstHashBefore
            (Get-Item $outputPath).LastWriteTimeUtc.Ticks | Should Be $firstJsonWriteTime
            (Get-Item $jsPath).LastWriteTimeUtc.Ticks | Should Be $firstJsWriteTime

            Remove-Item $outputPath
            Remove-Item $jsPath
            Remove-Item $lastHashFile
        }

        It "Should recreate data.js when JSON and hash are current but JS is missing" {
            $outputPath = Join-Path $TestDrive "test_data_missing_js.json"
            $lastHashFile = "$outputPath.last"
            $jsPath = $outputPath -replace "\.json$", ".js"

            @($outputPath, $lastHashFile, $jsPath) | ForEach-Object {
                if (Test-Path $_)
                {
                    Remove-Item $_
                }
            }

            Export-GameDataToJson -OutputPath $outputPath
            Remove-Item $jsPath

            Export-GameDataToJson -OutputPath $outputPath

            Test-Path $jsPath | Should Be $true
            (Get-Content $jsPath -Raw) | Should Match '^window\.gamingGaidenData\s*='

            Remove-Item $outputPath
            Remove-Item $jsPath
            Remove-Item $lastHashFile
        }
    }
    Context "Real Data Export" {
        It "Should export data from the provided DB copy" {
            $dbPath = Join-Path $PSScriptRoot "..\..\frontend\resources\GamingGaidenCopy.db"; $outputPath = Join-Path $TestDrive "data_from_copy.json"; $jsPath = $outputPath -replace "\.json$", ".js"; if (Test-Path $outputPath)
            {
                Remove-Item $outputPath
            }; if (Test-Path "$outputPath.last")
            {
                Remove-Item "$outputPath.last"
            }; if (Test-Path $dbPath)
            {
                Export-GameDataToJson -DatabasePath $dbPath -OutputPath $outputPath -Force; Test-Path $outputPath | Should Be $true; $content = Get-Content $outputPath | ConvertFrom-Json; $content.games.Count | Should BeGreaterThan 0; Remove-Item $outputPath; Remove-Item $jsPath; Remove-Item "$outputPath.last"
            }
        }
    }
}

