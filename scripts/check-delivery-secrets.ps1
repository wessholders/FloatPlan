param(
  [string] $ProjectRef = "zrcmwlfabypxqlqtnjom",
  [switch] $FailOnMissing
)

$ErrorActionPreference = "Stop"

$supabaseCli = Join-Path $PSScriptRoot "supabase-cli.ps1"
$requiredForDelivery = @(
  "DELIVERY_ENABLED",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "POSTMARK_SERVER_TOKEN",
  "POSTMARK_FROM_EMAIL"
)
$senderOptions = @(
  "TWILIO_MESSAGING_SERVICE_SID",
  "TWILIO_FROM_NUMBER"
)
$optional = @(
  "DEFAULT_SMS_COUNTRY_CODE",
  "POSTMARK_REPLY_TO",
  "POSTMARK_MESSAGE_STREAM"
)

$raw = & $supabaseCli secrets list --project-ref $ProjectRef --output json
if ($LASTEXITCODE -ne 0) {
  throw "Could not list Supabase secrets for project $ProjectRef."
}
$secrets = $raw | ConvertFrom-Json
$names = @($secrets | ForEach-Object { $_.name })

Write-Host "Supabase delivery secret check for project $ProjectRef"
Write-Host ""

foreach ($name in $requiredForDelivery) {
  $status = if ($names -contains $name) { "present" } else { "missing" }
  Write-Host "$name`: $status"
}

$hasSender = $false
foreach ($name in $senderOptions) {
  $status = if ($names -contains $name) {
    $hasSender = $true
    "present"
  } else {
    "missing"
  }
  Write-Host "$name`: $status"
}

foreach ($name in $optional) {
  $status = if ($names -contains $name) { "present" } else { "missing optional" }
  Write-Host "$name`: $status"
}

$missing = @($requiredForDelivery | Where-Object { $names -notcontains $_ })
if (-not $hasSender) {
  $missing += "TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM_NUMBER"
}

Write-Host ""
if ($missing.Count) {
  Write-Host "Provider delivery is not ready. Missing:"
  foreach ($name in $missing) {
    Write-Host "- $name"
  }
  if ($FailOnMissing) {
    exit 1
  }
} else {
  Write-Host "Provider delivery secrets are present. Keep DELIVERY_ENABLED=false until controlled test recipients are ready."
}
