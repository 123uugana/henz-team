$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$venvPython = Join-Path $scriptDir '.venv\Scripts\python.exe'

if (!(Test-Path $venvPython)) {
  throw 'Bridge virtualenv not found. Run tools/rfid_bridge/install-sdk.ps1 first.'
}

& $venvPython (Join-Path $scriptDir 'hh100_cloudflare_bridge.py') @args
