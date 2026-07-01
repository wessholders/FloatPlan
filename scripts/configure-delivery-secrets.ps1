param(
  [string] $ProjectRef = "zrcmwlfabypxqlqtnjom",
  [switch] $SkipTwilio,
  [switch] $SkipPostmark
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$supabaseCli = Join-Path $PSScriptRoot "supabase-cli.ps1"
$tempDir = Join-Path $root ".supabase-home"
$tempEnv = Join-Path $tempDir "delivery-secrets.env"
$lines = @("DELIVERY_ENABLED=false")

function Read-SecretPlain {
  param([string] $Prompt)

  $secure = Read-Host -Prompt $Prompt -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

function Add-SecretLine {
  param(
    [string] $Name,
    [string] $Value
  )

  if ($null -ne $Value -and $Value.Trim()) {
    $script:lines += "$Name=$($Value.Trim())"
  }
}

Write-Host "This script uploads provider secrets to Supabase and leaves DELIVERY_ENABLED=false."
Write-Host "Secrets are written to a temporary ignored file, uploaded, then deleted."
Write-Host ""

if (-not $SkipTwilio) {
  Write-Host "Twilio SMS"
  $twilioAccountSid = Read-Host -Prompt "TWILIO_ACCOUNT_SID"
  $twilioAuthToken = Read-SecretPlain -Prompt "TWILIO_AUTH_TOKEN"
  $twilioMessagingServiceSid = Read-Host -Prompt "TWILIO_MESSAGING_SERVICE_SID (preferred, optional)"
  $twilioFromNumber = Read-Host -Prompt "TWILIO_FROM_NUMBER (required if no messaging service SID)"
  $defaultSmsCountryCode = Read-Host -Prompt "DEFAULT_SMS_COUNTRY_CODE (default 1)"

  if (-not $twilioAccountSid.Trim() -or -not $twilioAuthToken.Trim()) {
    throw "Twilio account SID and auth token are required unless you pass -SkipTwilio."
  }
  if (-not $twilioMessagingServiceSid.Trim() -and -not $twilioFromNumber.Trim()) {
    throw "Provide TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM_NUMBER."
  }

  Add-SecretLine "TWILIO_ACCOUNT_SID" $twilioAccountSid
  Add-SecretLine "TWILIO_AUTH_TOKEN" $twilioAuthToken
  Add-SecretLine "TWILIO_MESSAGING_SERVICE_SID" $twilioMessagingServiceSid
  Add-SecretLine "TWILIO_FROM_NUMBER" $twilioFromNumber
  Add-SecretLine "DEFAULT_SMS_COUNTRY_CODE" ($(if ($defaultSmsCountryCode.Trim()) { $defaultSmsCountryCode } else { "1" }))
  Write-Host ""
}

if (-not $SkipPostmark) {
  Write-Host "Postmark Email"
  $postmarkServerToken = Read-SecretPlain -Prompt "POSTMARK_SERVER_TOKEN"
  $postmarkFromEmail = Read-Host -Prompt "POSTMARK_FROM_EMAIL"
  $postmarkReplyTo = Read-Host -Prompt "POSTMARK_REPLY_TO (optional)"
  $postmarkMessageStream = Read-Host -Prompt "POSTMARK_MESSAGE_STREAM (default outbound)"

  if (-not $postmarkServerToken.Trim() -or -not $postmarkFromEmail.Trim()) {
    throw "Postmark server token and from email are required unless you pass -SkipPostmark."
  }

  Add-SecretLine "POSTMARK_SERVER_TOKEN" $postmarkServerToken
  Add-SecretLine "POSTMARK_FROM_EMAIL" $postmarkFromEmail
  Add-SecretLine "POSTMARK_REPLY_TO" $postmarkReplyTo
  Add-SecretLine "POSTMARK_MESSAGE_STREAM" ($(if ($postmarkMessageStream.Trim()) { $postmarkMessageStream } else { "outbound" }))
  Write-Host ""
}

if ($lines.Count -le 1) {
  throw "No provider secrets were entered."
}

New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

try {
  Set-Content -LiteralPath $tempEnv -Value ($lines -join [Environment]::NewLine) -NoNewline
  & $supabaseCli secrets set --env-file $tempEnv --project-ref $ProjectRef
  if ($LASTEXITCODE -ne 0) {
    throw "Could not upload provider secrets to Supabase project $ProjectRef."
  }
} finally {
  Remove-Item -LiteralPath $tempEnv -Force -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "Provider secrets uploaded with DELIVERY_ENABLED=false."
Write-Host "Run .\scripts\check-delivery-secrets.ps1 to confirm names are present."
Write-Host "Only run .\scripts\deploy-edge-functions.ps1 -EnableDelivery when controlled test recipients are ready."
