import { createClient } from "npm:@supabase/supabase-js@2";

const MAX_RECIPIENTS = 10;
const MAX_MESSAGE_LENGTH = 12000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type JsonRecord = Record<string, unknown>;

type Coordinate = {
  latitude: number;
  longitude: number;
};

type Recipient = {
  name: string | null;
  relationship: string | null;
  phone: string | null;
  email: string | null;
};

type ValidatedPayload = {
  raw: JsonRecord;
  schemaVersion: string;
  source: string;
  operatorName: string;
  operatorPhone: string;
  activity: string;
  peopleCount: number;
  departureAt: string;
  expectedReturnAt: string;
  timezone: string | null;
  tripShape: "out_and_back" | "different_pull_out";
  destination: string;
  route: string | null;
  conditions: string | null;
  launchDescription: string;
  launchCoordinates: Coordinate | null;
  pullOutDescription: string;
  pullOutCoordinates: Coordinate | null;
  people: JsonRecord[];
  vessel: JsonRecord;
  recipients: Recipient[];
  generatedMessage: string;
};

export default {
  fetch: async (request: Request): Promise<Response> => {
    if (request.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
    }

    const payload = await readJson(request);
    if (!payload.ok) {
      return jsonResponse({ ok: false, error: payload.error }, 400);
    }

    const validation = validatePayload(payload.value);
    if (validation.errors.length) {
      return jsonResponse({
        ok: false,
        error: "Validation failed",
        details: validation.errors,
      }, 422);
    }

    const config = getSupabaseConfig();
    if (!config.ok) {
      return jsonResponse({ ok: false, error: config.error }, 500);
    }

    const supabase = createClient(config.url, config.serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const data = validation.value;
    const { data: plan, error: planError } = await supabase
      .from("float_plans")
      .insert(buildFloatPlanRow(data))
      .select("id")
      .single();

    if (planError || !plan?.id) {
      return jsonResponse({
        ok: false,
        error: "Could not create float plan",
        details: planError?.message,
      }, 500);
    }

    const floatPlanId = String(plan.id);
    const { data: recipients, error: recipientsError } = await supabase
      .from("float_plan_recipients")
      .insert(buildRecipientRows(floatPlanId, data.recipients))
      .select("id, phone, email");

    if (recipientsError || !recipients) {
      await cleanupFloatPlan(supabase, floatPlanId);
      return jsonResponse({
        ok: false,
        error: "Could not create recipients",
        details: recipientsError?.message,
      }, 500);
    }

    const deliveryRows = buildDeliveryEventRows(floatPlanId, recipients);
    if (deliveryRows.length) {
      const { error: deliveryError } = await supabase
        .from("delivery_events")
        .insert(deliveryRows);

      if (deliveryError) {
        await cleanupFloatPlan(supabase, floatPlanId);
        return jsonResponse({
          ok: false,
          error: "Could not create delivery events",
          details: deliveryError.message,
        }, 500);
      }
    }

    return jsonResponse({
      ok: true,
      floatPlanId,
      status: "queued_for_delivery",
      deliveryEnabled: false,
      recipientCount: recipients.length,
      deliveryEventCount: deliveryRows.length,
    });
  },
};

async function readJson(request: Request): Promise<
  { ok: true; value: unknown } | { ok: false; error: string }
> {
  try {
    return { ok: true, value: await request.json() };
  } catch {
    return { ok: false, error: "Request body must be valid JSON" };
  }
}

function validatePayload(payload: unknown): { errors: string[]; value: ValidatedPayload } {
  const errors: string[] = [];
  const root = recordValue(payload, "payload", errors);
  const operator = recordValue(root.operator, "operator", errors);
  const schedule = recordValue(root.schedule, "schedule", errors);
  const trip = recordValue(root.trip, "trip", errors);
  const launchLocation = recordValue(trip.launchLocation, "trip.launchLocation", errors);
  const pullOutLocation = recordValue(trip.pullOutLocation, "trip.pullOutLocation", errors);

  const schemaVersion = optionalText(root.schemaVersion) || "float-plan.static.v1";
  if (schemaVersion !== "float-plan.static.v1") {
    errors.push("schemaVersion must be float-plan.static.v1");
  }

  const generatedMessage = requiredText(root.generatedMessage, "generatedMessage", errors);
  if (generatedMessage.length > MAX_MESSAGE_LENGTH) {
    errors.push(`generatedMessage must be ${MAX_MESSAGE_LENGTH} characters or fewer`);
  }

  const departureAt = requiredDate(
    schedule.departureIso ?? schedule.departureLocal,
    "schedule.departureIso",
    errors,
  );
  const expectedReturnAt = requiredDate(
    schedule.expectedReturnIso ?? schedule.expectedReturnLocal,
    "schedule.expectedReturnIso",
    errors,
  );
  if (departureAt && expectedReturnAt && new Date(expectedReturnAt) <= new Date(departureAt)) {
    errors.push("schedule.expectedReturnIso must be after schedule.departureIso");
  }

  const tripShape = optionalText(trip.shape) === "different_pull_out"
    ? "different_pull_out"
    : "out_and_back";

  const recipients = normalizeRecipients(root.recipients, errors);
  if (!recipients.length) {
    errors.push("recipients must include at least one contact with phone or email");
  }
  if (recipients.length > MAX_RECIPIENTS) {
    errors.push(`recipients cannot include more than ${MAX_RECIPIENTS} contacts`);
  }

  return {
    errors,
    value: {
      raw: root,
      schemaVersion,
      source: optionalText(root.source) || "static-prototype",
      operatorName: requiredText(operator.name, "operator.name", errors),
      operatorPhone: requiredText(operator.phone, "operator.phone", errors),
      activity: requiredText(root.activity, "activity", errors),
      peopleCount: requiredPositiveInteger(root.peopleCount, "peopleCount", errors),
      departureAt,
      expectedReturnAt,
      timezone: optionalText(schedule.timezone),
      tripShape,
      destination: requiredText(trip.destination, "trip.destination", errors),
      route: optionalText(trip.route),
      conditions: optionalText(trip.conditions),
      launchDescription: requiredText(
        launchLocation.description,
        "trip.launchLocation.description",
        errors,
      ),
      launchCoordinates: optionalCoordinate(launchLocation.coordinates, "trip.launchLocation.coordinates", errors),
      pullOutDescription: requiredText(
        pullOutLocation.description,
        "trip.pullOutLocation.description",
        errors,
      ),
      pullOutCoordinates: optionalCoordinate(
        pullOutLocation.coordinates,
        "trip.pullOutLocation.coordinates",
        errors,
      ),
      people: normalizeRecords(root.people),
      vessel: recordValue(root.vessel ?? {}, "vessel", errors),
      recipients,
      generatedMessage,
    },
  };
}

function buildFloatPlanRow(data: ValidatedPayload) {
  return {
    owner_id: null,
    schema_version: data.schemaVersion,
    source: data.source,
    status: "sent",
    operator_name: data.operatorName,
    operator_phone: data.operatorPhone,
    activity: data.activity,
    people_count: data.peopleCount,
    departure_at: data.departureAt,
    expected_return_at: data.expectedReturnAt,
    timezone: data.timezone,
    trip_shape: data.tripShape,
    destination: data.destination,
    route: data.route,
    conditions: data.conditions,
    launch_description: data.launchDescription,
    launch_lat: data.launchCoordinates?.latitude ?? null,
    launch_lon: data.launchCoordinates?.longitude ?? null,
    pull_out_description: data.pullOutDescription,
    pull_out_lat: data.pullOutCoordinates?.latitude ?? null,
    pull_out_lon: data.pullOutCoordinates?.longitude ?? null,
    people: data.people,
    vessel: data.vessel,
    generated_message: data.generatedMessage,
    client_payload: data.raw,
    sent_at: new Date().toISOString(),
  };
}

function buildRecipientRows(floatPlanId: string, recipients: Recipient[]) {
  return recipients.map((recipient) => ({
    float_plan_id: floatPlanId,
    name: recipient.name,
    relationship: recipient.relationship,
    phone: recipient.phone,
    email: recipient.email,
    send_initial_plan: true,
    send_safe_return: true,
  }));
}

function buildDeliveryEventRows(
  floatPlanId: string,
  recipients: Array<{ id: string; phone: string | null; email: string | null }>,
) {
  return recipients.flatMap((recipient) => {
    const channels: Array<"sms" | "email"> = [];
    if (recipient.phone) channels.push("sms");
    if (recipient.email) channels.push("email");
    return channels.map((channel) => ({
      float_plan_id: floatPlanId,
      recipient_id: recipient.id,
      event_type: "float_plan",
      channel,
      provider: "pending_provider",
      status: "queued",
      provider_payload: {
        deliveryEnabled: false,
        reason: "Provider delivery is not enabled in the first backend slice",
      },
    }));
  });
}

async function cleanupFloatPlan(
  supabase: ReturnType<typeof createClient>,
  floatPlanId: string,
) {
  await supabase.from("float_plans").delete().eq("id", floatPlanId);
}

function getSupabaseConfig():
  | { ok: true; url: string; serviceKey: string }
  | { ok: false; error: string } {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = getServiceKey();

  if (!url) {
    return { ok: false, error: "SUPABASE_URL is not configured" };
  }
  if (!serviceKey) {
    return { ok: false, error: "SUPABASE service role or secret key is not configured" };
  }

  return { ok: true, url, serviceKey };
}

function getServiceKey() {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;

  const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!secretKeys) return "";

  try {
    const parsed = JSON.parse(secretKeys) as Record<string, unknown>;
    if (typeof parsed.default === "string") return parsed.default;
    const firstKey = Object.values(parsed).find((value) => typeof value === "string");
    return typeof firstKey === "string" ? firstKey : "";
  } catch {
    return "";
  }
}

function normalizeRecipients(value: unknown, errors: string[]): Recipient[] {
  if (!Array.isArray(value)) {
    errors.push("recipients must be an array");
    return [];
  }

  return value.flatMap((item, index) => {
    const record = recordValue(item, `recipients[${index}]`, errors);
    const phone = optionalText(record.phone);
    const email = optionalText(record.email);
    if (!phone && !email) return [];
    if (email && !email.includes("@")) {
      errors.push(`recipients[${index}].email must look like an email address`);
    }
    return [{
      name: optionalText(record.name),
      relationship: optionalText(record.relationship),
      phone,
      email,
    }];
  });
}

function normalizeRecords(value: unknown): JsonRecord[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((item) => item);
}

function recordValue(value: unknown, field: string, errors: string[]): JsonRecord {
  if (isRecord(value)) return value;
  errors.push(`${field} must be an object`);
  return {};
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalText(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

function requiredText(value: unknown, field: string, errors: string[]) {
  const text = optionalText(value);
  if (!text) {
    errors.push(`${field} is required`);
    return "";
  }
  return text;
}

function requiredPositiveInteger(value: unknown, field: string, errors: string[]) {
  const number = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isInteger(number) || number < 1) {
    errors.push(`${field} must be a positive integer`);
    return 1;
  }
  return number;
}

function requiredDate(value: unknown, field: string, errors: string[]) {
  const text = requiredText(value, field, errors);
  if (!text) return "";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    errors.push(`${field} must be a valid date/time`);
    return "";
  }
  return date.toISOString();
}

function optionalCoordinate(value: unknown, field: string, errors: string[]): Coordinate | null {
  if (value === null || value === undefined) return null;
  const record = recordValue(value, field, errors);
  const latitude = Number(record.latitude);
  const longitude = Number(record.longitude);

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    errors.push(`${field}.latitude must be between -90 and 90`);
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    errors.push(`${field}.longitude must be between -180 and 180`);
  }

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    latitude: Number(latitude.toFixed(6)),
    longitude: Number(longitude.toFixed(6)),
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
