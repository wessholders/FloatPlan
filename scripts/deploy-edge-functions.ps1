param(
  [string] $ProjectRef = "zrcmwlfabypxqlqtnjom",
  [switch] $EnableDelivery,
  [switch] $SkipDeliverySecret,
  [switch] $PrintOnly,
  [string[]] $Functions = @("send-float-plan", "close-float-plan")
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$deliveryEnabled = if ($EnableDelivery) { "true" } else { "false" }
$supabaseCli = Join-Path $PSScriptRoot "supabase-cli.ps1"

Push-Location $root
try {
  Write-Host "Using Supabase CLI:"
  & $supabaseCli --version

  $deployArgs = @("functions", "deploy", "--project-ref", $ProjectRef, "--use-api") + $Functions

  if ($PrintOnly) {
    if (-not $SkipDeliverySecret) {
      Write-Host "Would run: .\scripts\supabase-cli.ps1 secrets set DELIVERY_ENABLED=$deliveryEnabled --project-ref $ProjectRef"
    }
    Write-Host "Would run: .\scripts\supabase-cli.ps1 $($deployArgs -join ' ')"
    return
  }

  if (-not $SkipDeliverySecret) {
    Write-Host "Setting DELIVERY_ENABLED=$deliveryEnabled for project $ProjectRef..."
    & $supabaseCli secrets set "DELIVERY_ENABLED=$deliveryEnabled" --project-ref $ProjectRef
  }

  Write-Host "Deploying Edge Functions to project $ProjectRef..."
  & $supabaseCli @deployArgs

  Write-Host "Edge Function deployment command completed."
} finally {
  Pop-Location
}
