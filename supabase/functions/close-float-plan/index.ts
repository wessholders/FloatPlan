import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default {
  fetch: async (request: Request): Promise<Response> => {
    if (request.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
    }

    const body = await readJson(request);
    if (!body.ok) {
      return jsonResponse({ ok: false, error: body.error }, 400);
    }

    const validation = validatePayload(body.value);
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

    const { data: plan, error: planError } = await supabase
      .from("float_plans")
      .select("id, status, expected_return_at")
      .eq("id", validation.value.floatPlanId)
      .single();

    if (planError || !plan?.id) {
      return jsonResponse({
        ok: false,
        error: "Could not find float plan",
        details: planError?.message,
      }, 500);
    }

    if (plan.status === "closed") {
      return jsonResponse({
        ok: true,
        floatPlanId: validation.value.floatPlanId,
        status: "closed",
        alreadyClosed: true,
        deliveryEnabled: false,
        deliveryEventCount: 0,
      });
    }

    const closedAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("float_plans")
      .update({
        status: "closed",
        closed_at: closedAt,
      })
      .eq("id", validation.value.floatPlanId);

    if (updateError) {
      return jsonResponse({
        ok: false,
        error: "Could not close float plan",
        details: updateError.message,
      }, 500);
    }

    const { error: checkinError } = await supabase
      .from("checkins")
      .insert({
        float_plan_id: validation.value.floatPlanId,
        checkin_type: "safe_return",
        message: validation.value.message,
        previous_expected_return_at: plan.expected_return_at,
      });

    if (checkinError) {
      return jsonResponse({
        ok: false,
        error: "Could not create safe-return checkin",
        details: checkinError.message,
      }, 500);
    }

    const { data: recipients, error: recipientsError } = await supabase
      .from("float_plan_recipients")
      .select("id, phone, email")
      .eq("float_plan_id", validation.value.floatPlanId)
      .eq("send_safe_return", true);

    if (recipientsError) {
      return jsonResponse({
        ok: false,
        error: "Could not read recipients",
        details: recipientsError.message,
      }, 500);
    }

    const deliveryRows = buildDeliveryEventRows(validation.value.floatPlanId, recipients || []);
    if (deliveryRows.length) {
      const { error: deliveryError } = await supabase
        .from("delivery_events")
        .insert(deliveryRows);

      if (deliveryError) {
        return jsonResponse({
          ok: false,
          error: "Could not create safe-return delivery events",
          details: deliveryError.message,
        }, 500);
      }
    }

    return jsonResponse({
      ok: true,
      floatPlanId: validation.value.floatPlanId,
      status: "closed",
      closedAt,
      deliveryEnabled: false,
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

function validatePayload(payload: unknown) {
  const errors: string[] = [];
  const record = isRecord(payload) ? payload : {};
  if (!isRecord(payload)) errors.push("payload must be an object");

  const floatPlanId = optionalText(record.floatPlanId);
  if (!floatPlanId || !uuidPattern.test(floatPlanId)) {
    errors.push("floatPlanId must be a valid UUID");
  }

  const message = optionalText(record.message) || "I am home safe. Please close my float plan.";
  if (message.length > 1000) {
    errors.push("message must be 1000 characters or fewer");
  }

  return {
    errors,
    value: {
      floatPlanId: floatPlanId || "",
      message,
    },
  };
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
      event_type: "safe_return",
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

function optionalText(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
