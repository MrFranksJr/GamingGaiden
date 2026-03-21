[System.Reflection.Assembly]::LoadWithPartialName('System.Web') | out-null

#------------------------------------------
# Pre Build Cleanup
if (Test-Path .\build\GamingGaiden) {
    Remove-Item -Recurse .\build\GamingGaiden
}
if (Test-Path .\build\GamingGaiden.zip) {
    Remove-Item -Recurse .\build\GamingGaiden.zip
}
mkdir -f .\build\GamingGaiden | Out-Null

Get-ChildItem -File .\ui\*.html -Exclude 404.html | Remove-Item
Remove-Item -Recurse .\ui\resources\images\cache -ErrorAction SilentlyContinue

#------------------------------------------
# Build

# Generate Manual
if (Get-Command "pandoc.exe" -ErrorAction SilentlyContinue) {
    pandoc.exe --ascii .\Manual.md -o .\ui\Manual.html
    if (Test-Path .\ui\Manual.html) {
        $ManualHTML = Get-Content .\ui\Manual.html -Raw

        # Wrap each h3 and its following content until next h3
        $ManualHTML = $ManualHTML -replace '<h3[^>]*>([^<]+)</h3>((?:(?!<h3)[\s\S])*?(?=<h3|$))', '<details><summary>$1</summary>$2</details>'

        # Wrap all details in a container for column layout
        $ManualHTML = $ManualHTML -replace '(<details>[\s\S]*</details>)', '<div class="faq-container">$1</div>'

        $ManualTemplate = Get-Content .\ui\templates\Manual.html.template
        $FinalHTML = $ManualTemplate -replace "_MARKDOWN_HTML_", $ManualHTML
        [System.Web.HttpUtility]::HtmlDecode($FinalHTML) | Out-File -encoding UTF8 .\ui\Manual.html
    } else {
        Write-Warning "Failed to generate Manual.html even though pandoc was found."
    }
} else {
    Write-Warning "pandoc.exe not found in PATH. Skipping Manual generation."
    # If Manual.html is missing but needed for the build to not error out elsewhere, create a placeholder
    if (-not (Test-Path .\ui\Manual.html)) {
        "Manual generation skipped (pandoc missing)" | Out-File -encoding UTF8 .\ui\Manual.html
    }
}

# Copy source files
$SourceFiles = ".\Install.bat", ".\Uninstall.bat", ".\modules", ".\icons", ".\ui"
Copy-Item -Recurse -Path $SourceFiles -Destination .\build\GamingGaiden\ -Force

# Add 404 pages
$templateFiles = Get-ChildItem .\ui\templates\*.template -File
foreach ($template in $templateFiles) {
    $htmlFileName = $template.Name -replace '\.template$', ''
    if ($htmlFileName -ne "Manual.html" -and $htmlFileName -ne "IdleTime.html") {
        Copy-Item -Path .\ui\404.html -Destination .\build\GamingGaiden\ui\$htmlFileName -Force
    }
}

# Generate exe
if (Get-Command "ps12exe" -ErrorAction SilentlyContinue) {
    ps12exe -inputFile ".\GamingGaiden.ps1" -outputFile ".\build\GamingGaiden\GamingGaiden.exe"
} else {
    Write-Error "ps12exe not found. Cannot generate executable."
    exit 1
}

# Package
Compress-Archive -Force -Path .\build\GamingGaiden -DestinationPath .\build\GamingGaiden.zip

#------------------------------------------
# Post Build Cleanup
# Note: We keep .\build\GamingGaiden so the Deploy script can use it
# It's cleaned up at the start of the next build anyway