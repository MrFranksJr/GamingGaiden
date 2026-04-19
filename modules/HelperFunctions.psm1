function Log($MSG) {
    $mutex = New-Object System.Threading.Mutex($false, "LogFileLock")

    if ($mutex.WaitOne(500)) {
        Write-Output "$(Get-date -f s) : $MSG" >> ".\GamingGaiden.log"
        [void]$mutex.ReleaseMutex()
    }
}

function SQLEscapedMatchPattern($pattern) {
    if ($null -eq $pattern) { return "" }
    return $pattern -replace "'", "''"
}

function ToBase64($String) {
    return [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($String))
}

function PlayTimeMinsToString($PlayTime) {
    $minutes = $null; $hours = [math]::divrem($PlayTime, 60, [ref]$minutes);
    return ("{0} Hr {1} Min" -f $hours, $minutes)
}

function ResizeImage() {

    param(
        [string]$ImagePath,
        [string]$EntityName,
        [bool]$HD = $false
    )

    $imageFileName = ToBase64 $EntityName
    $WIA = New-Object -com wia.imagefile
    $WIA.LoadFile($ImagePath)
    $WIP = New-Object -ComObject wia.imageprocess
    $scale = $WIP.FilterInfos.Item("Scale").FilterId
    $WIP.Filters.Add($scale)

    $WIP.Filters[1].Properties("PreserveAspectRatio") = $true

    if ($HD) {
        if ($WIA.Width -gt 720 -or $WIA.Height -gt 720) {
            $WIP.Filters[1].Properties("MaximumWidth") = 720
            $WIP.Filters[1].Properties("MaximumHeight") = 720
        }
        else {
            $WIP.Filters[1].Properties("MaximumWidth") = $WIA.Width
            $WIP.Filters[1].Properties("MaximumHeight") = $WIA.Height
        }
    }
    else {
        $WIP.Filters[1].Properties("MaximumWidth") = 140
        $WIP.Filters[1].Properties("MaximumHeight") = 140
    }

    $scaledImage = $WIP.Apply($WIA)
    $scaledImagePath = $null
    if ($ImagePath -like '*.png') {
        $scaledImagePath = "$env:TEMP\GmGdn-{0}-$imageFileName.png" -f $(Get-Random)
    }
    else {
        $scaledImagePath = "$env:TEMP\GmGdn-{0}-$imageFileName.jpg" -f $(Get-Random)
    }

    $scaledImage.SaveFile($scaledImagePath)
    return $scaledImagePath
}

function CreateMenuItem($Text) {
    $menuItem = New-Object System.Windows.Forms.ToolStripmenuItem
    $menuItem.Text = "$Text"

    return $menuItem
}

function OpenFileDialog($Title, $Filters, $DirectoryPath = [Environment]::GetFolderPath('Desktop')) {
    $fileBrowser = New-Object System.Windows.Forms.OpenFileDialog -Property @{
        'InitialDirectory' = $DirectoryPath
        'Filter'           = $Filters
        'Title'            = $Title
    }
    return $fileBrowser
}

function ShowMessage($Msg, $Buttons, $Type) {
    [System.Windows.Forms.MessageBox]::Show($Msg, 'Gaming Gaiden', $Buttons, $Type) | Out-Null
}

function CalculateFileHash ($FilePath) {
    $fileStream = $null
    try {
        $resolvedPath = (Resolve-Path $FilePath).Path
        $fileStream = [System.IO.File]::OpenRead($resolvedPath)
        $sha256 = [System.Security.Cryptography.SHA256]::Create()
        $hashBytes = $sha256.ComputeHash($fileStream)
        $hashString = [System.BitConverter]::ToString($hashBytes) -replace '-'
        return $hashString
    } catch {
        Log "Error calculating hash for $FilePath : $($_.Exception.Message)"
        return ""
    } finally {
        if ($null -ne $fileStream) {
            $fileStream.Close()
            $fileStream.Dispose()
        }
    }
}

function BackupDatabase {
    Log "Backing up database"

    $workingDirectory = (Get-Location).Path
    mkdir -f $workingDirectory\backups | Out-Null
    $timestamp = Get-Date -f "dd-MM-yyyy-HH.mm.ss"

    Copy-Item ".\GamingGaiden.db" "$env:TEMP\"
    Compress-Archive "$env:TEMP\GamingGaiden.db" ".\backups\GamingGaiden-$timestamp.zip"
    Remove-Item "$env:TEMP\GamingGaiden.db"

    Get-ChildItem -Path .\backups -File | Sort-Object -Property CreationTime | Select-Object -SkipLast 5 | Remove-Item
}

function RunDBQuery ($Query, $SQLParameters = $null) {
    if ($null -eq $SQLParameters) {
        $result = Invoke-SqliteQuery -Query $Query -DataBase ".\GamingGaiden.db"
    }
    else {
        $result = Invoke-SqliteQuery -Query $Query -DataBase ".\GamingGaiden.db" -SqlParameters $SQLParameters
    }
    return $result
}

function CreateForm($Text, $SizeX, $SizeY, $IconPath) {
    $form = New-Object System.Windows.Forms.Form
    $form.Text = $Text
    $form.Size = New-Object Drawing.Size($SizeX, $SizeY)
    $form.StartPosition = 'CenterScreen'
    $form.FormBorderStyle = 'FixedDialog'
    $form.Icon = [System.Drawing.Icon]::new($IconPath)
    $form.Topmost = $true
    $form.ShowInTaskbar = $false

    return $form
}

function Createlabel($Text, $DrawX, $DrawY) {
    $label = New-Object System.Windows.Forms.Label
    $label.AutoSize = $true
    $label.Location = New-Object Drawing.Point($DrawX, $DrawY)
    $label.Text = $Text

    return $label
}

function CreateTextBox($Text, $DrawX, $DrawY, $SizeX, $SizeY) {
    $textBox = New-Object System.Windows.Forms.TextBox
    $textBox.Text = $Text
    $textBox.Location = New-Object Drawing.Point($DrawX, $DrawY)
    $textBox.Size = New-Object System.Drawing.Size($SizeX, $SizeY)

    return $textBox
}

function CreateButton($Text, $DrawX, $DrawY) {
    $button = New-Object System.Windows.Forms.Button
    $button.Location = New-Object Drawing.Point($DrawX, $DrawY)
    $button.Text = $Text

    return $button
}

function CreatePictureBox() {
    param(
        [string]$ImagePath,
        [int]$DrawX,
        [int]$DrawY,
        [int]$SizeX,
        [int]$SizeY,
        [string]$SizeMode = "center"
    )

    $pictureBox = New-Object Windows.Forms.PictureBox
    $pictureBox.Location = New-Object Drawing.Point($DrawX, $DrawY)
    $pictureBox.Size = New-Object Drawing.Size($SizeX, $SizeY)
    $pictureBox.SizeMode = [System.Windows.Forms.PictureBoxSizeMode]::CenterImage
    if ($SizeMode -eq "zoom") {
        $pictureBox.SizeMode = [System.Windows.Forms.PictureBoxSizeMode]::Zoom
    }
    $pictureBox.Image = [System.Drawing.Image]::FromFile($ImagePath)

    return $pictureBox
}

function Get-AppVersion {
    $exePath = [System.Diagnostics.Process]::GetCurrentProcess().MainModule.FileName
    $versionInfo = [System.Diagnostics.FileVersionInfo]::GetVersionInfo($exePath)
    $version = "{0}.{1}.{2}" -f $versionInfo.FileMajorPart, $versionInfo.FileMinorPart, $versionInfo.FileBuildPart
    return "v" + $version + "-F"
}

function Get-SessionSplits {
    param($StartTime, $Duration)
    
    $endTime = $StartTime.AddMinutes($Duration)
    $splits = @()

    $currentStart = $StartTime
    while ($currentStart.Date -lt $endTime.Date) {
        $midnight = $currentStart.Date.AddDays(1)
        
        $diff = $midnight - $currentStart
        $dayDuration = [int]$diff.TotalMinutes
        
        if ($dayDuration -gt 0) {
            $split = New-Object PSObject
            $split | Add-Member -MemberType NoteProperty -Name "StartTime" -Value $currentStart
            $split | Add-Member -MemberType NoteProperty -Name "Duration" -Value $dayDuration
            $split | Add-Member -MemberType NoteProperty -Name "Date" -Value $currentStart.Date
            $splits += $split
        }
        
        $currentStart = $midnight
    }

    $diff = $endTime - $currentStart
    $remainingDuration = [int]$diff.TotalMinutes
    if ($remainingDuration -gt 0) {
        $split = New-Object PSObject
        $split | Add-Member -MemberType NoteProperty -Name "StartTime" -Value $currentStart
        $split | Add-Member -MemberType NoteProperty -Name "Duration" -Value $remainingDuration
        $split | Add-Member -MemberType NoteProperty -Name "Date" -Value $currentStart.Date
        $splits += $split
    }

    return $splits
}
