$helperPath = Join-Path $PSScriptRoot "..\..\modules\HelperFunctions.psm1"
Import-Module $helperPath -Force

Describe "HelperFunctions Module" {
    Context "ResizeImage" {
        BeforeAll {
            Add-Type -AssemblyName System.Drawing
        }

        It "Should resize an image with HD enabled (up to 720x720 bounding box) by default" {
            # Create a test bitmap of 1200x1800 (2:3 aspect ratio)
            $sourceBmp = New-Object System.Drawing.Bitmap 1200, 1800
            $graphics = [System.Drawing.Graphics]::FromImage($sourceBmp)
            $graphics.Clear([System.Drawing.Color]::Blue)
            $graphics.Dispose()

            $sourcePath = Join-Path $TestDrive "test_poster.jpg"
            $sourceBmp.Save($sourcePath, [System.Drawing.Imaging.ImageFormat]::Jpeg)
            $sourceBmp.Dispose()

            $resizedPath = ResizeImage -ImagePath $sourcePath -EntityName "Test HD Game"

            Test-Path $resizedPath | Should Be $true

            $resizedImg = [System.Drawing.Image]::FromFile($resizedPath)
            try
            {
                # Aspect ratio 2:3 scaled with max bounding box 720 gives 480x720
                $resizedImg.Width | Should Be 480
                $resizedImg.Height | Should Be 720
            }
            finally
            {
                $resizedImg.Dispose()
                if (Test-Path $resizedPath)
                {
                    Remove-Item $resizedPath -Force
                }
                if (Test-Path $sourcePath)
                {
                    Remove-Item $sourcePath -Force
                }
            }
        }

        It "Should resize an image to 140x140 bounding box when HD is false" {
            $sourceBmp = New-Object System.Drawing.Bitmap 1200, 1800
            $graphics = [System.Drawing.Graphics]::FromImage($sourceBmp)
            $graphics.Clear([System.Drawing.Color]::Red)
            $graphics.Dispose()

            $sourcePath = Join-Path $TestDrive "test_poster_sd.jpg"
            $sourceBmp.Save($sourcePath, [System.Drawing.Imaging.ImageFormat]::Jpeg)
            $sourceBmp.Dispose()

            $resizedPath = ResizeImage -ImagePath $sourcePath -EntityName "Test SD Game" -HD $false

            Test-Path $resizedPath | Should Be $true

            $resizedImg = [System.Drawing.Image]::FromFile($resizedPath)
            try
            {
                # Aspect ratio 2:3 scaled with max bounding box 140 gives 93x140 (or 93-94)
                $resizedImg.Height | Should Be 140
                $resizedImg.Width | Should BeLessThan 140
            }
            finally
            {
                $resizedImg.Dispose()
                if (Test-Path $resizedPath)
                {
                    Remove-Item $resizedPath -Force
                }
                if (Test-Path $sourcePath)
                {
                    Remove-Item $sourcePath -Force
                }
            }
        }

        It "Should preserve PNG extension when resizing PNG images" {
            $sourceBmp = New-Object System.Drawing.Bitmap 800, 800
            $sourcePath = Join-Path $TestDrive "test_square.png"
            $sourceBmp.Save($sourcePath, [System.Drawing.Imaging.ImageFormat]::Png)
            $sourceBmp.Dispose()

            $resizedPath = ResizeImage -ImagePath $sourcePath -EntityName "Test PNG Game"

            [System.IO.Path]::GetExtension($resizedPath) | Should Be ".png"

            if (Test-Path $resizedPath)
            {
                Remove-Item $resizedPath -Force
            }
            if (Test-Path $sourcePath)
            {
                Remove-Item $sourcePath -Force
            }
        }
    }
}
