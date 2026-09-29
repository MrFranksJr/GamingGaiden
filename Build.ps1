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

#------------------------------------------
# Build

# Build Frontend
if (Get-Command "npm" -ErrorAction SilentlyContinue)
{
    Write-Host "Building Frontend..." -ForegroundColor Cyan
    Push-Location .\frontend
    npm run build
    Pop-Location
}
else
{
    Write-Warning "npm not found. Skipping Frontend build. Ensure .js files are up to date."
}

# Copy source files
$FilesToCopy = ".\Install.bat", ".\Uninstall.bat"
Copy-Item $FilesToCopy -Destination .\build\GamingGaiden\ -Force
$FoldersToCopy = "modules", "icons", "frontend"
foreach ($folder in $FoldersToCopy)
{
    robocopy ".\$folder" ".\build\GamingGaiden\$folder" /MIR /NP /NDL /NJH /NJS /XD "node_modules" "tests" | Out-Null
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