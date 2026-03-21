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

# 2. Backup the database before deploying
$dbPath = Join-Path $InstallDirectory "GamingGaiden.db"
if (Test-Path $dbPath) {
    Write-Host "Backing up database before deployment..." -ForegroundColor Cyan
    $backupDir = Join-Path $InstallDirectory "backups"
    mkdir -Force $backupDir | Out-Null
    $timestamp = Get-Date -f "dd-MM-yyyy-HH.mm.ss"
    Copy-Item $dbPath "$env:TEMP\"
    Compress-Archive "$env:TEMP\GamingGaiden.db" (Join-Path $backupDir "GamingGaiden-$timestamp.zip")
    Remove-Item "$env:TEMP\GamingGaiden.db"
    # Keep only the 5 most recent backups
    Get-ChildItem -Path $backupDir -File | Sort-Object -Property CreationTime | Select-Object -SkipLast 5 | Remove-Item
    Write-Host "Database backup created successfully." -ForegroundColor Green
} else {
    Write-Host "No database found at $InstallDirectory, skipping backup." -ForegroundColor Gray
}

# 3. Run the Build process (Optional but recommended for consistency)
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

# 4. Copy files to the install directory
Write-Host "Syncing source files (modules, icons, ui)..." -ForegroundColor Cyan

# Sync modules and icons (complete mirror)
robocopy (Join-Path $SourceDirectory "modules") (Join-Path $InstallDirectory "modules") /MIR /R:3 /W:5 /NP /NDL /NJH /NJS | Out-Null
robocopy (Join-Path $SourceDirectory "icons") (Join-Path $InstallDirectory "icons") /MIR /R:3 /W:5 /NP /NDL /NJH /NJS | Out-Null

# Sync UI folder but protect the generated HTML files from being purged!
# We mirror resources but exclude purging of .html files because they are generated in the build step
robocopy (Join-Path $SourceDirectory "ui") (Join-Path $InstallDirectory "ui") /MIR /XF "*.html" /R:3 /W:5 /NP /NDL /NJH /NJS /XD "cache" "templates" | Out-Null

# Now Sync build artifacts (which includes the .exe and the generated .html files)
$buildOutput = Join-Path $SourceDirectory "build\GamingGaiden"
if (Test-Path $buildOutput) {
    Write-Host "Syncing build artifacts (EXE and HTML pages)..." -ForegroundColor Cyan
    # This will copy GamingGaiden.exe and all the HTML files from the build's ui folder
    robocopy $buildOutput $InstallDirectory /S /E /R:3 /W:5 /NP /NDL /NJH /NJS /XF "GamingGaiden.db" "settings.ini" "*.log" /XD "backups" | Out-Null
} else {
    # If no build folder exists (e.g., -NoBuild was used but no previous build exists)
    # We still need to make sure the main script is there
    if (-not (Test-Path (Join-Path $InstallDirectory "GamingGaiden.exe"))) {
        Write-Host "Copying main script (as backup)..." -ForegroundColor Cyan
        Copy-Item (Join-Path $SourceDirectory "GamingGaiden.ps1") (Join-Path $InstallDirectory "GamingGaiden.ps1") -Force
    }
}

# 5. Unblock files (common issue on Windows for downloaded/moved scripts)
Write-Host "Unblocking files..." -ForegroundColor Cyan
Get-ChildItem -Path $InstallDirectory -Recurse | Unblock-File

# 6. Restart Gaming Gaiden
$exePath = Join-Path $InstallDirectory "GamingGaiden.exe"
if (Test-Path $exePath) {
    Write-Host "Restarting Gaming Gaiden..." -ForegroundColor Green
    # Start the process without waiting for it to exit
    Start-Process -FilePath $exePath -WorkingDirectory $InstallDirectory
} else {
    Write-Host "Warning: GamingGaiden.exe not found in $InstallDirectory. Did the build fail?" -ForegroundColor Red
}

Write-Host "Deployment complete!" -ForegroundColor Green
