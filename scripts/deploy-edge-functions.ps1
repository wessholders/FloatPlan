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

Push-Location $root
try {
  Write-Host "Using Supabase CLI:"
  supabase --version

  $deployArgs = @("functions", "deploy", "--project-ref", $ProjectRef, "--use-api") + $Functions

  if ($PrintOnly) {
    if (-not $SkipDeliverySecret) {
      Write-Host "Would run: supabase secrets set DELIVERY_ENABLED=$deliveryEnabled --project-ref $ProjectRef"
    }
    Write-Host "Would run: supabase $($deployArgs -join ' ')"
    return
  }

  if (-not $SkipDeliverySecret) {
    Write-Host "Setting DELIVERY_ENABLED=$deliveryEnabled for project $ProjectRef..."
    supabase secrets set "DELIVERY_ENABLED=$deliveryEnabled" --project-ref $ProjectRef
  }

  Write-Host "Deploying Edge Functions to project $ProjectRef..."
  supabase @deployArgs

  Write-Host "Edge Function deployment command completed."
} finally {
  Pop-Location
}
