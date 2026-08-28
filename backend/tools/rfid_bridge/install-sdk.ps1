$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$downloadDir = Join-Path $scriptDir 'downloads'
$venvDir = Join-Path $scriptDir '.venv'
$sdkZip = Join-Path $downloadDir 'PythonSDK_V1.5_20260123.zip'
$sdkUrl = 'https://drive.google.com/uc?export=download&id=1HyENcbEJZM7xzocI3YW7_-wx7kjWoMaz'

function Resolve-PythonCommand {
  $commands = @(
    'py',
    'python',
    (Join-Path $env:LOCALAPPDATA 'Programs\Python\Python312\python.exe'),
    (Join-Path $env:LOCALAPPDATA 'Programs\Python\Python311\python.exe'),
    (Join-Path $env:LOCALAPPDATA 'Programs\Python\Python310\python.exe')
  )
  foreach ($command in $commands) {
    $resolved = Get-Command $command -ErrorAction SilentlyContinue
    if (!$resolved -and !(Test-Path $command)) {
      continue
    }

    if ($resolved) {
      try {
        $versionOutput = & $command --version 2>&1
        if ($LASTEXITCODE -eq 0 -and "$versionOutput" -match 'Python 3\.') {
          return $command
        }
      } catch {
        continue
      }
    }

    if (Test-Path $command) {
      try {
        $versionOutput = & $command --version 2>&1
        if ($LASTEXITCODE -eq 0 -and "$versionOutput" -match 'Python 3\.') {
          return $command
        }
      } catch {
        continue
      }
    }
  }

  throw 'Python was not found. Install Python 3.10+ first, then run this script again.'
}

New-Item -ItemType Directory -Path $downloadDir -Force | Out-Null

if (!(Test-Path $sdkZip)) {
  Write-Host 'Downloading Hopeland Python SDK...'
  Invoke-WebRequest -Uri $sdkUrl -OutFile $sdkZip -UseBasicParsing -MaximumRedirection 10
}

if (!(Get-ChildItem -LiteralPath $downloadDir -Recurse -Filter 'RFIDReaderAPI-*.whl' -ErrorAction SilentlyContinue | Select-Object -First 1)) {
  Write-Host 'Extracting Hopeland Python SDK...'
  Expand-Archive -LiteralPath $sdkZip -DestinationPath $downloadDir -Force
}

$wheel = Get-ChildItem -LiteralPath $downloadDir -Recurse -Filter 'RFIDReaderAPI-*.whl' -ErrorAction SilentlyContinue |
  Select-Object -First 1

if (!$wheel) {
  throw "SDK wheel was not found under $downloadDir"
}

$python = Resolve-PythonCommand
if (!(Test-Path $venvDir)) {
  & $python -m venv $venvDir
}

$venvPython = Join-Path $venvDir 'Scripts\python.exe'
& $venvPython -m pip install --upgrade pip
& $venvPython -m pip install --force-reinstall $wheel.FullName
& $venvPython -m pip install pyusb pyserial hidapi six gmssl

Write-Host ''
Write-Host "SDK installed into $venvDir"
Write-Host 'Next: copy .env.example to .env and set RFID_DEVICE_KEY.'
