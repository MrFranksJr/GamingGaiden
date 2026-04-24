$modulePath = Join-Path $PSScriptRoot "..\..\modules\DataExport.psm1"
Import-Module $modulePath -Force

Describe "DataExport Module" {
    Context "Export-GameDataToJson" {
        It "Should exist" {
            Get-Command Export-GameDataToJson -ErrorAction SilentlyContinue | Should Not BeNullOrEmpty
        }
    }
}
