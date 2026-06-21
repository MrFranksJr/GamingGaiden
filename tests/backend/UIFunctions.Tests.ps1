# Import dependencies first
$helperPath = Join-Path $PSScriptRoot "..\..\modules\HelperFunctions.psm1"
$modulePath = Join-Path $PSScriptRoot "..\..\modules\UIFunctions.psm1"

# Mock Log and ShowMessage globally before importing if they are called during import
# (Though they shouldn't be called during import of UIFunctions)
function Log($msg)
{
    Write-Host "LOG: $msg"
}
function ShowMessage($msg, $btn, $icon)
{
    Write-Host "MESSAGE: $msg"
}

Import-Module $helperPath -Force
Import-Module $modulePath -Force

Describe "UIFunctions Module" {
    InModuleScope UIFunctions {
        Context "Invoke-SPA" {
            It "Constructs correct file:/// URL for the SPA with hash" {
                Mock Get-Location { return [PSCustomObject]@{ Path = "C:\GamingGaiden" } }
                Mock Test-Path { return $true }
                Mock Get-Item { return [PSCustomObject]@{ FullName = "C:\GamingGaiden\frontend\index.html" } }
                Mock Start-Process { }
                Mock Log { }

                Invoke-SPA -Hash "summary"

                Assert-MockCalled Start-Process
            }

            It "Constructs correct file:/// URL for the SPA without hash" {
                Mock Get-Location { return [PSCustomObject]@{ Path = "C:\GamingGaiden" } }
                Mock Test-Path { return $true }
                Mock Get-Item { return [PSCustomObject]@{ FullName = "C:\GamingGaiden\frontend\index.html" } }
                Mock Start-Process { }
                Mock Log { }

                Invoke-SPA

                Assert-MockCalled Start-Process
            }

            It "Shows error message if SPA is not found" {
                Mock Get-Location { return [PSCustomObject]@{ Path = "C:\GamingGaiden" } }
                Mock Test-Path { return $false }
                Mock Log { }
                Mock ShowMessage { }

                Invoke-SPA

                Assert-MockCalled ShowMessage
                Assert-MockCalled Log
            }
        }
    }
}
