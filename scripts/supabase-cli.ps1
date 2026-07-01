param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]] $SupabaseArgs
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$supabaseExe = Join-Path $root ".tools/supabase-cli/supabase.exe"
$supabaseHome = Join-Path $root ".supabase-home"

if (-not (Test-Path -LiteralPath $supabaseExe)) {
  throw "Supabase CLI was not found at $supabaseExe. Run .\scripts\install-supabase-cli.ps1 first."
}

New-Item -ItemType Directory -Force -Path $supabaseHome | Out-Null

$env:HOME = $root
$env:USERPROFILE = $root
$env:SUPABASE_HOME = $supabaseHome
$env:SUPABASE_TELEMETRY_DISABLED = "1"
$env:DO_NOT_TRACK = "1"

& $supabaseExe @SupabaseArgs
exit $LASTEXITCODE
