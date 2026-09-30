# Gaming Gaiden URI protocol handler.
#
# Registered as the shell handler for the "gaminggaiden://" scheme. Windows launches this
# with the full URI as the single argument, e.g.:
#     gaminggaiden://add-game
#     gaminggaiden://edit-game?name=Cyberpunk%202077
#
# It parses the URI, writes a one-shot command to %TEMP%\GmGdn-Command.txt, and exits. The
# already-running Gaming Gaiden tray app polls that file (its existing 1-second timer) and
# opens the matching native dialog. This script deliberately does NOT import the app modules,
# touch the database, or start the tray app — it is a thin, fast, standalone shim.
#
# Why standalone (not GamingGaiden.exe): the main app has boot guards (single-instance and a
# fixed working directory) that a protocol launch would trip. See
# docs/adr/0003-frontend-initiated-data-entry-via-uri-protocol-and-command-trigger.md.

param(
    [Parameter(Position = 0)]
    [string]$Uri
)

$ErrorActionPreference = 'Stop'

# Diagnostic log so we can see exactly what the handler was invoked with. Written next to the
# trigger file. Safe to leave in; it is tiny and only this handler writes it.
$diagLog = Join-Path $env:TEMP 'GmGdn-Handler.log'
try {
    "$(Get-Date -Format s) : RAW Uri = [$Uri]" | Add-Content -Path $diagLog -Encoding UTF8
}
catch {
    # ignore diagnostic failures
}

try {
    if ([string]::IsNullOrWhiteSpace($Uri)) {
        exit 0
    }

    # Length-bound the raw input before doing anything with it.
    if ($Uri.Length -gt 2048) {
        exit 1
    }

    Add-Type -AssemblyName System.Web -ErrorAction SilentlyContinue

    # Strip the scheme, tolerating "gaminggaiden://" and "gaminggaiden:".
    $withoutScheme = $Uri -replace '(?i)^gaminggaiden:(//)?', ''
    # Trailing slash browsers sometimes append.
    $withoutScheme = $withoutScheme.TrimEnd('/')

    # Split "action" from an optional "?query".
    $action = $withoutScheme
    $query = ''
    $qIndex = $withoutScheme.IndexOf('?')
    if ($qIndex -ge 0) {
        $action = $withoutScheme.Substring(0, $qIndex)
        $query = $withoutScheme.Substring($qIndex + 1)
    }
    $action = $action.Trim().ToLowerInvariant()

    $command = $null
    switch ($action) {
        'add-game' {
            $command = 'add-game'
        }
        'edit-game' {
            # Expect name=<url-encoded PK>.
            $name = ''
            foreach ($pair in ($query -split '&')) {
                $kv = $pair -split '=', 2
                if ($kv.Length -eq 2 -and $kv[0].ToLowerInvariant() -eq 'name') {
                    $name = [System.Web.HttpUtility]::UrlDecode($kv[1])
                }
            }
            $name = $name.Trim()
            if (-not [string]::IsNullOrWhiteSpace($name)) {
                # Newlines would corrupt the single-line trigger file; collapse them.
                $name = ($name -replace '[\r\n]', ' ').Trim()
                if ($name.Length -gt 512) {
                    $name = $name.Substring(0, 512)
                }
                $command = "edit-game:$name"
            }
        }
        default {
            # Unknown action: ignore silently.
            exit 0
        }
    }

    try {
        "$(Get-Date -Format s) : action=[$action] query=[$query] command=[$command]" | Add-Content -Path $diagLog -Encoding UTF8
    }
    catch { }

    if ($null -eq $command) {
        exit 0
    }

    $triggerPath = Join-Path $env:TEMP 'GmGdn-Command.txt'
    # UTF-8 without BOM; single line. Set-Content is fine for a short one-shot payload.
    Set-Content -Path $triggerPath -Value $command -Encoding UTF8 -NoNewline
}
catch {
    try {
        "$(Get-Date -Format s) : EXCEPTION $($_.Exception.Message)" | Add-Content -Path (Join-Path $env:TEMP 'GmGdn-Handler.log') -Encoding UTF8
    }
    catch { }
    # Best-effort: a protocol handler must never pop errors at the user.
    exit 1
}
