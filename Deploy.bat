@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\Deploy.ps1" %*
pause