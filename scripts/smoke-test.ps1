$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$indexPath = Join-Path $root "index.html"
$schemaPath = Join-Path $root "supabase/migrations/20260630190000_initial_schema.sql"
$sendFunctionPath = Join-Path $root "supabase/functions/send-float-plan/index.ts"
$sendFunctionPayloadPath = Join-Path $root "supabase/functions/send-float-plan/sample-payload.json"

if (-not (Test-Path -LiteralPath $indexPath)) {
  throw "index.html was not found at $indexPath"
}

if (-not (Test-Path -LiteralPath $schemaPath)) {
  throw "Initial Supabase schema was not found at $schemaPath"
}

if (-not (Test-Path -LiteralPath $sendFunctionPath)) {
  throw "send-float-plan function was not found at $sendFunctionPath"
}

if (-not (Test-Path -LiteralPath $sendFunctionPayloadPath)) {
  throw "send-float-plan sample payload was not found at $sendFunctionPayloadPath"
}

$html = Get-Content -LiteralPath $indexPath -Raw
$schema = Get-Content -LiteralPath $schemaPath -Raw
$sendFunction = Get-Content -LiteralPath $sendFunctionPath -Raw
$sendFunctionPayload = Get-Content -LiteralPath $sendFunctionPayloadPath -Raw
$failures = New-Object System.Collections.Generic.List[string]

function Assert-Contains {
  param(
    [string] $Name,
    [string] $Needle
  )

  if (-not $html.Contains($Needle)) {
    $script:failures.Add($Name)
  }
}

function Assert-DoesNotContain {
  param(
    [string] $Name,
    [string] $Needle
  )

  if ($html.Contains($Needle)) {
    $script:failures.Add($Name)
  }
}

Assert-Contains "mobile viewport" '<meta name="viewport" content="width=device-width, initial-scale=1">'
Assert-Contains "float plan form" '<form id="floatPlanForm">'
Assert-Contains "operator name field" 'name="operatorName"'
Assert-Contains "operator phone field" 'name="operatorPhone"'
Assert-Contains "activity field" 'name="activity"'
Assert-Contains "people count field" 'name="peopleCount"'
Assert-Contains "Launch Location description field" 'name="launchSite"'
Assert-Contains "Launch Location coordinate storage" 'name="launchCoords" type="hidden"'
Assert-Contains "out-and-back trip shape" 'name="tripShape" value="roundTrip"'
Assert-Contains "different Pull Out Location trip shape" 'name="tripShape" value="differentPullOut"'
Assert-Contains "Pull Out Location description field" 'name="returnSite"'
Assert-Contains "Pull Out Location coordinate storage" 'name="returnCoords" type="hidden"'
Assert-Contains "destination field" 'name="destination"'
Assert-Contains "departure date field" 'name="departureDate" type="date"'
Assert-Contains "departure time field" 'name="departureClock" type="time"'
Assert-Contains "return date field" 'name="returnDate" type="date"'
Assert-Contains "return time field" 'name="returnClock" type="time"'
Assert-Contains "generated plan preview" 'id="generatedPlanPreview"'
Assert-Contains "generated plan text storage" 'id="generatedPlan"'
Assert-Contains "generated payload storage" 'id="generatedPayload"'
Assert-Contains "email-all handoff" 'id="emailAll"'
Assert-Contains "safe-return action" 'id="safeButton"'
Assert-Contains "clear-plan action" 'id="clearPlan"'
Assert-Contains "map modal" 'id="mapModal"'
Assert-Contains "map picker surface" 'id="pinMap"'
Assert-Contains "hybrid imagery layer" 'World_Imagery'
Assert-Contains "hybrid road layer" 'World_Transportation'
Assert-Contains "hybrid label layer" 'World_Boundaries_and_Places'
Assert-Contains "browser draft save" 'localStorage.setItem'
Assert-Contains "browser draft clear" 'localStorage.removeItem'
Assert-Contains "US phone formatting" 'function formatPhoneInput(input)'
Assert-Contains "backend payload builder" 'function buildFloatPlanPayload(data, plan)'
Assert-Contains "backend payload schema version" 'schemaVersion: "float-plan.static.v1"'
Assert-Contains "backend payload launch location" 'launchLocation: {'
Assert-Contains "backend payload pull out location" 'pullOutLocation: {'
Assert-Contains "backend payload departure ISO" 'departureIso: dateTimeIso(data.departureTime)'
Assert-Contains "backend payload return ISO" 'expectedReturnIso: dateTimeIso(data.returnTime)'
Assert-Contains "backend payload generated message" 'generatedMessage: plan'
Assert-Contains "Launch Location generated output" 'Launch Location: ${formatLocationPlan(data.launchSite, data.launchCoords)}'
Assert-Contains "Pull Out Location generated output" 'Pull Out Location: ${formatLocationPlan(data.returnSite || data.launchSite, data.returnCoords || data.launchCoords)}'
Assert-Contains "out-and-back coordinate fallback" 'returnCoords || data.launchCoords'
Assert-Contains "conditional Pull Out Location requirement" 'form.elements.returnSite.required = showingReturn;'
Assert-Contains "SMS handoff" 'sms:${encodeURIComponent'
Assert-Contains "email handoff" 'mailto:'
Assert-Contains "home-safe message" 'I am home safe from my ${data.activity || "water"} trip'

Assert-DoesNotContain "removed USCG warning copy" "The Coast Guard does not accept float plans"
Assert-DoesNotContain "old visible GPS label" "GPS "
Assert-DoesNotContain "old Depart Location wording" "Depart Location"
Assert-DoesNotContain "old Return Location wording" "Return Location"

foreach ($table in @(
  "profiles",
  "emergency_contacts",
  "saved_people",
  "vessels",
  "float_plans",
  "float_plan_recipients",
  "delivery_events",
  "checkins",
  "notification_jobs"
)) {
  if (-not $schema.Contains("create table public.$table")) {
    $failures.Add("schema table $table")
  }
  if (-not $schema.Contains("alter table public.$table enable row level security")) {
    $failures.Add("schema RLS $table")
  }
}

foreach ($needle in @(
  "buildFloatPlanRow",
  "buildRecipientRows",
  "buildDeliveryEventRows",
  "validatePayload",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_SECRET_KEYS",
  "delivery_events",
  "float_plan_recipients",
  "float_plans"
)) {
  if (-not $sendFunction.Contains($needle)) {
    $failures.Add("send-float-plan function $needle")
  }
}

try {
  $payload = $sendFunctionPayload | ConvertFrom-Json
  if ($payload.schemaVersion -ne "float-plan.static.v1") {
    $failures.Add("send-float-plan sample payload schemaVersion")
  }
  if (-not $payload.recipients -or $payload.recipients.Count -lt 1) {
    $failures.Add("send-float-plan sample payload recipients")
  }
} catch {
  $failures.Add("send-float-plan sample payload valid JSON")
}

if ($failures.Count -gt 0) {
  Write-Host "Static prototype smoke test failed:"
  foreach ($failure in $failures) {
    Write-Host "- $failure"
  }
  exit 1
}

Write-Host "Static prototype smoke test passed."
