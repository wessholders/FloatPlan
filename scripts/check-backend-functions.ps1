$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")

Push-Location $root
try {
  Write-Host "Checking Deno..."
  deno --version

  Write-Host "Checking Supabase CLI..."
  supabase --version

  Write-Host "Type-checking Supabase Edge Functions..."
  deno check `
    "supabase/functions/send-float-plan/index.ts" `
    "supabase/functions/close-float-plan/index.ts"

  Write-Host "Running static prototype smoke test..."
  powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\smoke-test.ps1"

  Write-Host "Backend function checks passed."
} finally {
  Pop-Location
}
