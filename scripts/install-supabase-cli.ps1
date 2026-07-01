param(
  [string] $Version = "2.109.0"
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$toolsDir = Join-Path $root ".tools"
$cliDir = Join-Path $toolsDir "supabase-cli"
$tag = "v$Version"
$assetName = "supabase_${Version}_windows_amd64.zip"
$zipPath = Join-Path $toolsDir $assetName
$checksumPath = Join-Path $toolsDir "checksums.txt"
$assetUrl = "https://github.com/supabase/cli/releases/download/$tag/$assetName"
$checksumUrl = "https://github.com/supabase/cli/releases/download/$tag/checksums.txt"

New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null

Write-Host "Downloading Supabase CLI $Version..."
curl.exe --ssl-no-revoke -L -o $zipPath $assetUrl
curl.exe --ssl-no-revoke -L -o $checksumPath $checksumUrl

$checksumLine = Select-String -LiteralPath $checksumPath -Pattern ([regex]::Escape($assetName)) | Select-Object -First 1
if (-not $checksumLine) {
  throw "Could not find $assetName in checksums.txt"
}

$expectedHash = ($checksumLine.Line -split "\s+")[0].Trim().ToLowerInvariant()
$actualHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $zipPath).Hash.ToLowerInvariant()

if ($actualHash -ne $expectedHash) {
  throw "Supabase CLI checksum mismatch. Expected $expectedHash but got $actualHash."
}

Write-Host "Extracting Supabase CLI..."
Expand-Archive -LiteralPath $zipPath -DestinationPath $cliDir -Force

Write-Host "Supabase CLI installed:"
& (Join-Path $cliDir "supabase.exe") --version
