function UpdateAllStatsInBackground() {
    # The SPA renders from the JSON export; the legacy per-page HTML renderers
    # were removed in the Legacy Frontend Sunset. Keeping the data export.
    Export-GameDataToJson
}

function Invoke-SPA
{
    param([string]$Hash)
    $workingDirectory = (Get-Location).Path
    $spaPath = Join-Path $workingDirectory "frontend\index.html"
    $routeJsPath = Join-Path $workingDirectory "frontend\resources\route.js"
    $normalizedHash = if ($Hash)
    {
        if ( $Hash.StartsWith("#"))
        {
            $Hash
        }
        else
        {
            "#$Hash"
        }
    }
    else
    {
        "#summary"
    }

    try
    {
        "window.gamingGaidenInitialRoute = '$normalizedHash';" | Set-Content -Path $routeJsPath -Encoding UTF8 -ErrorAction SilentlyContinue
    }
    catch
    {
        # Best effort writing route.js
    }

    if (Test-Path $spaPath)
    {
        $fullPath = (Get-Item $spaPath).FullName
        $url = "file:///$($fullPath.Replace('\', '/') )"
        if ($Hash)
        {
            $url += if ( $Hash.StartsWith("#"))
            {
                $Hash
            }
            else
            {
                "#$Hash"
            }
        }
        Start-Process $url
    }
    else
    {
        Log "Error: SPA not found at $spaPath"
        ShowMessage "Error: SPA not found at $spaPath" "Ok" "Error"
    }
}

function RenderAboutDialog() {
    $aboutForm = CreateForm "About" 350 360 ".\icons\running.ico"

    $pictureBox = CreatePictureBox "./icons/banner.png" 0 10 345 70
    $aboutForm.Controls.Add($pictureBox)

    $labelVersion = CreateLabel (Get-AppVersion) 145 90
    $aboutForm.Controls.Add($labelVersion)

    $textCopyRight = [char]::ConvertFromUtf32(0x000000A9) + " 2023 Kulvinder Singh"
    $labelCopyRight = CreateLabel $textCopyRight 112 120
    $aboutForm.Controls.Add($labelCopyRight)

    $textContributions = "contributions " + [char]::ConvertFromUtf32(0x000000A9) + " 2026 Franky Blondeel"
    $labelContributions = CreateLabel $textContributions 90 140
    $aboutForm.Controls.Add($labelContributions)

    $labelHome = New-Object Windows.Forms.LinkLabel
    $labelHome.Text = "Kulvinder's GitHub"
    $labelHome.Location = New-Object Drawing.Point(130, 170)
    $labelHome.AutoSize = $true
    $labelHome.Add_LinkClicked({
            Start-Process "https://github.com/kulvind3r/GamingGaiden"
        })
    $aboutForm.Controls.Add($labelHome)

    $labelFrankyGitHub = New-Object Windows.Forms.LinkLabel
    $labelFrankyGitHub.Text = "Franky's GitHub"
    $labelFrankyGitHub.Location = New-Object Drawing.Point(135, 190)
    $labelFrankyGitHub.AutoSize = $true
    $labelFrankyGitHub.Add_LinkClicked({
            Start-Process "https://github.com/MrFranksJr/GamingGaiden"
        })
    $aboutForm.Controls.Add($labelFrankyGitHub)

    $labelAttributions = New-Object Windows.Forms.LinkLabel
    $labelAttributions.Text = "Open Source And Original Art Attributions"
    $labelAttributions.Location = New-Object Drawing.Point(70, 220)
    $labelAttributions.AutoSize = $true
    $labelAttributions.Add_LinkClicked({
            Start-Process "https://github.com/kulvind3r/GamingGaiden#attributions"
        })
    $aboutForm.Controls.Add($labelAttributions)

    $buttonClose = CreateButton "Close" 140 260; $buttonClose.Add_Click({ $pictureBox.Image.Dispose(); $pictureBox.Dispose(); $aboutForm.Dispose() }); $aboutForm.Controls.Add($buttonClose)

    $aboutForm.ShowDialog()
    $pictureBox.Image.Dispose(); $pictureBox.Dispose();
    $aboutForm.Dispose()
}
