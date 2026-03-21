# Gaming Gaiden: Development Deployment Script (Option 1)
# This script automates the process of pushing development changes to the live installation.

$InstallDirectory = "C:\ProgramData\GamingGaiden"
$SourceDirectory = $PSScriptRoot

# 1. Stop Gaming Gaiden if it's running
$process = Get-Process -Name "GamingGaiden" -ErrorAction SilentlyContinue
if ($process) {
    Write-Host "Stopping Gaming Gaiden..." -ForegroundColor Yellow
    Stop-Process -Name "GamingGaiden" -Force
    # Wait until the process is actually gone
    $timeout = 10 # seconds
    $elapsed = 0
    while (Get-Process -Name "GamingGaiden" -ErrorAction SilentlyContinue) {
        if ($elapsed -ge $timeout) {
            Write-Host "Warning: Process did not stop in time. Deployment might fail due to locked files." -ForegroundColor Red
            break
        }
        Start-Sleep -Milliseconds 500
        $elapsed += 0.5
    }
}

# 2. Run the Build process (Optional but recommended for consistency)
if ($args -contains "-NoBuild") {
    Write-Host "Skipping build as requested..." -ForegroundColor Gray
} else {
    Write-Host "Running Build.ps1..." -ForegroundColor Cyan
    & ".\Build.ps1"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Build failed! Deployment aborted." -ForegroundColor Red
        exit $LASTEXITCODE
    }
}

# 3. Copy files to the install directory
# Exclude database and backups to prevent overwriting user data
Write-Host "Syncing files to $InstallDirectory..." -ForegroundColor Cyan

$excludeList = @("GamingGaiden.db", "backups", "settings.ini", "GamingGaiden.log", "build")

# Create the install directory if it doesn't exist (though it should)
if (-not (Test-Path $InstallDirectory)) {
    New-Item -ItemType Directory -Path $InstallDirectory -Force | Out-Null
}

# Important: Use Robocopy for efficient syncing (handles mirrors, exclusions, and is faster than Copy-Item)
# We want to make sure the build outputs are also copied
$buildOutput = Join-Path $SourceDirectory "build\GamingGaiden"
if (Test-Path $buildOutput) {
    Write-Host "Syncing build artifacts..." -ForegroundColor Cyan
    robocopy $buildOutput $InstallDirectory /S /E /R:3 /W:5 /NP /NDL /NJH /NJS /XF "GamingGaiden.db" "settings.ini" "*.log" /XD "backups" | Out-Null
}

Write-Host "Syncing source files (modules, icons, ui)..." -ForegroundColor Cyan
robocopy (Join-Path $SourceDirectory "modules") (Join-Path $InstallDirectory "modules") /MIR /R:3 /W:5 /NP /NDL /NJH /NJS | Out-Null
robocopy (Join-Path $SourceDirectory "icons") (Join-Path $InstallDirectory "icons") /MIR /R:3 /W:5 /NP /NDL /NJH /NJS | Out-Null
robocopy (Join-Path $SourceDirectory "ui") (Join-Path $InstallDirectory "ui") /MIR /R:3 /W:5 /NP /NDL /NJH /NJS /XD "cache" | Out-Null

# Handle the main script if we're not using the EXE-only path
if (-not (Test-Path $buildOutput)) {
    Write-Host "Copying main script..." -ForegroundColor Cyan
    Copy-Item (Join-Path $SourceDirectory "GamingGaiden.ps1") (Join-Path $InstallDirectory "GamingGaiden.ps1") -Force
}

# 4. Unblock files (common issue on Windows for downloaded/moved scripts)
Write-Host "Unblocking files..." -ForegroundColor Cyan
Get-ChildItem -Path $InstallDirectory -Recurse | Unblock-File

# 5. Restart Gaming Gaiden
$exePath = Join-Path $InstallDirectory "GamingGaiden.exe"
if (Test-Path $exePath) {
    Write-Host "Restarting Gaming Gaiden..." -ForegroundColor Green
    # Start the process without waiting for it to exit
    Start-Process -FilePath $exePath -WorkingDirectory $InstallDirectory
} else {
    Write-Host "Warning: GamingGaiden.exe not found in $InstallDirectory. Did the build fail?" -ForegroundColor Red
}

Write-Host "Deployment complete!" -ForegroundColor Green
