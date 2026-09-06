$ErrorActionPreference = "Stop"
$manifestUrl = if ($env:AUDIO_MARGIN_MANIFEST_URL) { $env:AUDIO_MARGIN_MANIFEST_URL } else { "https://github.com/B-Divyesh/sf-spanish-audio-notes/releases/latest/download/latest.json" }
$manifest = Invoke-RestMethod -Uri $manifestUrl
$asset = $manifest.platforms.windows
if (-not $asset.url -or -not $asset.sha256) { throw "Release manifest is incomplete." }
$destinationRoot = if ($env:AUDIO_MARGIN_INSTALL_DIR) { $env:AUDIO_MARGIN_INSTALL_DIR } else { $env:TEMP }
New-Item -ItemType Directory -Force -Path $destinationRoot | Out-Null
$destination = Join-Path $destinationRoot ([IO.Path]::GetFileName($asset.url))
Invoke-WebRequest -Uri $asset.url -OutFile $destination
$actual = (Get-FileHash -Algorithm SHA256 $destination).Hash.ToLowerInvariant()
if ($actual -ne $asset.sha256.ToLowerInvariant()) { Remove-Item $destination; throw "SHA-256 mismatch; refusing to install." }
Write-Host "Verified Audio Margin at $destination"
Write-Host "Opening the unsigned installer. Windows may ask you to choose More info -> Run anyway."
if ($env:AUDIO_MARGIN_NO_LAUNCH -ne "1") { Start-Process -FilePath $destination }
