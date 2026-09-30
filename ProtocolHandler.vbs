' Gaming Gaiden URI protocol handler shim.
'
' Registered as the shell command for the "gaminggaiden://" scheme. Its only job is to run
' ProtocolHandler.ps1 HIDDEN (no console flash) and pass along the URI argument. The scheme
' points here rather than at powershell.exe directly so the user never sees a console window.
'
' Windows invokes:  wscript.exe "<install>\ProtocolHandler.vbs" "gaminggaiden://..."

Option Explicit

Dim args, uri, scriptDir, ps1Path, shell, cmd

Set args = WScript.Arguments
If args.Count < 1 Then
    WScript.Quit 0
End If
uri = args(0)

' Resolve ProtocolHandler.ps1 sitting next to this .vbs.
scriptDir = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\"))
ps1Path = scriptDir & "ProtocolHandler.ps1"

Set shell = CreateObject("WScript.Shell")

' -WindowStyle Hidden + run mode 0 keeps it invisible. Quotes guard paths/URI with spaces.
cmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & ps1Path & """ """ & uri & """"

' Run hidden (0), do not wait (False).
shell.Run cmd, 0, False

WScript.Quit 0
