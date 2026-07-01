const TWILIO_MESSAGE_URL_BASE = "https://api.twilio.com/2010-04-01/Accounts";
const POSTMARK_EMAIL_URL = "https://api.postmarkapp.com/email";
const MAX_SMS_BODY_LENGTH = 1600;

type JsonRecord = Record<string, unknown>;

export type DeliveryEventType = "float_plan" | "safe_return" | "return_reminder" | "delay_update";
export type DeliveryChannel = "sms" | "email" | "push";
export type DeliveryStatus = "queued" | "sent" | "delivered" | "failed" | "cancelled";

export type DeliveryRecipient = {
  id: string;
  name?: string | null;
  phone: string | null;
  email: string | null;
};

export type DeliveryContent = {
  eventType: DeliveryEventType;
  smsBody: string;
  emailSubject: string;
  emailText: string;
};

export type DeliveryEventRow = {
  float_plan_id: string;
  recipient_id: string;
  event_type: DeliveryEventType;
  channel: "sms" | "email";
  provider: string;
  provider_message_id?: string | null;
  status: DeliveryStatus;
  error_message?: string | null;
  provider_payload: JsonRecord;
};

export type StoredDeliveryEvent = {
  id: string;
  float_plan_id: string;
  recipient_id: string | null;
  event_type: DeliveryEventType;
  channel: "sms" | "email";
  provider: string | null;
  status: DeliveryStatus;
};

export type DeliveryUpdateValues = {
  provider: string;
  provider_message_id: string | null;
  status: DeliveryStatus;
  error_message: string | null;
  provider_payload: JsonRecord;
};

export type DeliveryAttemptUpdate = {
  eventId: string;
  values: DeliveryUpdateValues;
};

export type DeliverySummary = {
  deliveryEnabled: boolean;
  eventCount: number;
  queuedCount: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  cancelledCount: number;
};

type SupabaseDeliveryClient = {
  from: (table: "delivery_events") => {
    update: (values: DeliveryUpdateValues) => {
      eq: (column: "id", value: string) => PromiseLike<{ error: { message: string } | null }>;
    };
  };
};

export function isDeliveryEnabled() {
  return envFlag("DELIVERY_ENABLED", false);
}

export function buildDeliveryEventRows(
  floatPlanId: string,
  recipients: DeliveryRecipient[],
  content: DeliveryContent,
): DeliveryEventRow[] {
  const deliveryEnabled = isDeliveryEnabled();
  const createdAt = new Date().toISOString();

  return recipients.flatMap((recipient) => {
    const rows: DeliveryEventRow[] = [];
    if (recipient.phone) {
      rows.push(buildQueuedDeliveryEventRow({
        floatPlanId,
        recipientId: recipient.id,
        eventType: content.eventType,
        channel: "sms",
        provider: deliveryEnabled ? "twilio" : "pending_provider",
        deliveryEnabled,
        createdAt,
      }));
    }
    if (recipient.email) {
      rows.push(buildQueuedDeliveryEventRow({
        floatPlanId,
        recipientId: recipient.id,
        eventType: content.eventType,
        channel: "email",
        provider: deliveryEnabled ? "postmark" : "pending_provider",
        deliveryEnabled,
        createdAt,
      }));
    }
    return rows;
  });
}

export async function deliverToStoredEvents(
  events: StoredDeliveryEvent[],
  recipients: DeliveryRecipient[],
  content: DeliveryContent,
): Promise<DeliveryAttemptUpdate[]> {
  if (!isDeliveryEnabled()) return [];

  const recipientsById = new Map(recipients.map((recipient) => [recipient.id, recipient]));
  const updates: DeliveryAttemptUpdate[] = [];

  for (const event of events) {
    const recipient = event.recipient_id ? recipientsById.get(event.recipient_id) : undefined;
    if (!recipient) {
      updates.push(failedUpdate(event.id, event.channel, event.provider, "Recipient was not found"));
      continue;
    }

    if (event.channel === "sms") {
      updates.push({
        eventId: event.id,
        values: await sendTwilioSms(recipient, content.smsBody),
      });
      continue;
    }

    if (event.channel === "email") {
      updates.push({
        eventId: event.id,
        values: await sendPostmarkEmail(recipient, content),
      });
    }
  }

  return updates;
}

export async function persistDeliveryUpdates(
  supabase: SupabaseDeliveryClient,
  updates: DeliveryAttemptUpdate[],
) {
  const errors: string[] = [];

  for (const update of updates) {
    const { error } = await supabase
      .from("delivery_events")
      .update(update.values)
      .eq("id", update.eventId);

    if (error) {
      errors.push(`${update.eventId}: ${error.message}`);
    }
  }

  return errors;
}

export function summarizeDelivery(
  events: StoredDeliveryEvent[],
  updates: DeliveryAttemptUpdate[] = [],
): DeliverySummary {
  const updatedStatuses = new Map(updates.map((update) => [update.eventId, update.values.status]));
  const counts: Record<DeliveryStatus, number> = {
    queued: 0,
    sent: 0,
    delivered: 0,
    failed: 0,
    cancelled: 0,
  };

  for (const event of events) {
    const status = updatedStatuses.get(event.id) || event.status;
    counts[status] += 1;
  }

  return {
    deliveryEnabled: isDeliveryEnabled(),
    eventCount: events.length,
    queuedCount: counts.queued,
    sentCount: counts.sent,
    deliveredCount: counts.delivered,
    failedCount: counts.failed,
    cancelledCount: counts.cancelled,
  };
}

function buildQueuedDeliveryEventRow(options: {
  floatPlanId: string;
  recipientId: string;
  eventType: DeliveryEventType;
  channel: "sms" | "email";
  provider: string;
  deliveryEnabled: boolean;
  createdAt: string;
}): DeliveryEventRow {
  return {
    float_plan_id: options.floatPlanId,
    recipient_id: options.recipientId,
    event_type: options.eventType,
    channel: options.channel,
    provider: options.provider,
    provider_message_id: null,
    status: "queued",
    error_message: null,
    provider_payload: options.deliveryEnabled
      ? {
        deliveryEnabled: true,
        queuedAt: options.createdAt,
        reason: "Delivery event recorded before provider attempt",
      }
      : {
        deliveryEnabled: false,
        reason: "Provider delivery is disabled by DELIVERY_ENABLED",
      },
  };
}

async function sendTwilioSms(
  recipient: DeliveryRecipient,
  rawMessage: string,
): Promise<DeliveryUpdateValues> {
  const provider = "twilio";
  const config = getTwilioConfig();
  if (!config.ok) return failedValues(provider, config.error);

  const to = normalizePhoneForSms(recipient.phone);
  if (!to) {
    return failedValues(provider, "Recipient phone number is not usable for SMS delivery", {
      phonePresent: Boolean(recipient.phone),
    });
  }

  const message = truncateText(rawMessage, MAX_SMS_BODY_LENGTH);
  const params = new URLSearchParams();
  params.set("To", to);
  params.set("Body", message.text);
  if (config.messagingServiceSid) {
    params.set("MessagingServiceSid", config.messagingServiceSid);
  } else {
    params.set("From", config.fromNumber);
  }

  try {
    const response = await fetch(
      `${TWILIO_MESSAGE_URL_BASE}/${encodeURIComponent(config.accountSid)}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${config.accountSid}:${config.authToken}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      },
    );
    const body = await readProviderJson(response);
    const providerStatus = textValue(body.status);
    const status = response.ok ? mapTwilioStatus(providerStatus) : "failed";
    const errorMessage = status === "failed"
      ? providerError(body) || `Twilio request failed with HTTP ${response.status}`
      : null;

    return {
      provider,
      provider_message_id: textValue(body.sid),
      status,
      error_message: errorMessage,
      provider_payload: {
        deliveryEnabled: true,
        provider,
        httpStatus: response.status,
        attemptedAt: new Date().toISOString(),
        providerStatus,
        providerErrorCode: textValue(body.error_code ?? body.code),
        providerErrorMessage: textValue(body.error_message ?? body.message),
        messageLength: message.text.length,
        bodyTruncated: message.truncated,
      },
    };
  } catch (error) {
    return failedValues(provider, errorMessage(error), {
      attemptedAt: new Date().toISOString(),
      messageLength: message.text.length,
      bodyTruncated: message.truncated,
    });
  }
}

async function sendPostmarkEmail(
  recipient: DeliveryRecipient,
  content: DeliveryContent,
): Promise<DeliveryUpdateValues> {
  const provider = "postmark";
  const config = getPostmarkConfig();
  if (!config.ok) return failedValues(provider, config.error);

  if (!recipient.email) {
    return failedValues(provider, "Recipient email is missing");
  }

  const requestBody: JsonRecord = {
    From: config.fromEmail,
    To: recipient.email,
    Subject: content.emailSubject,
    TextBody: content.emailText,
    MessageStream: config.messageStream,
  };
  if (config.replyTo) requestBody.ReplyTo = config.replyTo;

  try {
    const response = await fetch(POSTMARK_EMAIL_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": config.serverToken,
      },
      body: JSON.stringify(requestBody),
    });
    const body = await readProviderJson(response);
    const providerErrorCode = numberValue(body.ErrorCode);
    const isProviderSuccess = response.ok && (providerErrorCode === null || providerErrorCode === 0);
    const status: DeliveryStatus = isProviderSuccess ? "sent" : "failed";

    return {
      provider,
      provider_message_id: textValue(body.MessageID),
      status,
      error_message: isProviderSuccess
        ? null
        : providerError(body) || `Postmark request failed with HTTP ${response.status}`,
      provider_payload: {
        deliveryEnabled: true,
        provider,
        httpStatus: response.status,
        attemptedAt: new Date().toISOString(),
        providerErrorCode,
        providerMessage: textValue(body.Message),
        messageStream: config.messageStream,
      },
    };
  } catch (error) {
    return failedValues(provider, errorMessage(error), {
      attemptedAt: new Date().toISOString(),
      messageStream: config.messageStream,
    });
  }
}

function failedUpdate(
  eventId: string,
  channel: DeliveryChannel,
  provider: string | null,
  message: string,
): DeliveryAttemptUpdate {
  return {
    eventId,
    values: failedValues(provider || channel, message),
  };
}

function failedValues(
  provider: string,
  message: string,
  extraPayload: JsonRecord = {},
): DeliveryUpdateValues {
  return {
    provider,
    provider_message_id: null,
    status: "failed",
    error_message: message,
    provider_payload: {
      deliveryEnabled: true,
      provider,
      attemptedAt: new Date().toISOString(),
      error: message,
      ...extraPayload,
    },
  };
}

function getTwilioConfig():
  | {
    ok: true;
    accountSid: string;
    authToken: string;
    messagingServiceSid: string | null;
    fromNumber: string;
  }
  | { ok: false; error: string } {
  const accountSid = optionalEnv("TWILIO_ACCOUNT_SID");
  const authToken = optionalEnv("TWILIO_AUTH_TOKEN");
  const messagingServiceSid = optionalEnv("TWILIO_MESSAGING_SERVICE_SID");
  const fromNumber = optionalEnv("TWILIO_FROM_NUMBER");

  if (!accountSid || !authToken) {
    return { ok: false, error: "Twilio account SID or auth token is not configured" };
  }
  if (!messagingServiceSid && !fromNumber) {
    return {
      ok: false,
      error: "Twilio messaging service SID or from number is not configured",
    };
  }

  return {
    ok: true,
    accountSid,
    authToken,
    messagingServiceSid,
    fromNumber: fromNumber || "",
  };
}

function getPostmarkConfig():
  | {
    ok: true;
    serverToken: string;
    fromEmail: string;
    replyTo: string | null;
    messageStream: string;
  }
  | { ok: false; error: string } {
  const serverToken = optionalEnv("POSTMARK_SERVER_TOKEN");
  const fromEmail = optionalEnv("POSTMARK_FROM_EMAIL");
  const replyTo = optionalEnv("POSTMARK_REPLY_TO");
  const messageStream = optionalEnv("POSTMARK_MESSAGE_STREAM") || "outbound";

  if (!serverToken) {
    return { ok: false, error: "Postmark server token is not configured" };
  }
  if (!fromEmail) {
    return { ok: false, error: "Postmark from email is not configured" };
  }

  return {
    ok: true,
    serverToken,
    fromEmail,
    replyTo,
    messageStream,
  };
}

function normalizePhoneForSms(phone: string | null) {
  if (!phone) return null;
  const trimmed = phone.trim();
  if (/^\+[1-9]\d{7,14}$/.test(trimmed)) return trimmed;

  const countryCode = (optionalEnv("DEFAULT_SMS_COUNTRY_CODE") || "1").replace(/\D/g, "");
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10 && countryCode) return `+${countryCode}${digits}`;
  if (digits.length === 11 && digits.startsWith(countryCode)) return `+${digits}`;
  return null;
}

function mapTwilioStatus(status: string | null): DeliveryStatus {
  switch ((status || "").toLowerCase()) {
    case "delivered":
      return "delivered";
    case "sent":
      return "sent";
    case "failed":
    case "undelivered":
      return "failed";
    case "canceled":
    case "cancelled":
      return "cancelled";
    default:
      return "queued";
  }
}

function truncateText(value: string, maxLength: number) {
  const suffix = "\n\n[Message truncated. Check email or the saved float plan for full details.]";
  if (value.length <= maxLength) return { text: value, truncated: false };
  return {
    text: `${value.slice(0, Math.max(0, maxLength - suffix.length))}${suffix}`,
    truncated: true,
  };
}

async function readProviderJson(response: Response): Promise<JsonRecord> {
  const text = await response.text();
  if (!text) return {};

  try {
    const parsed = JSON.parse(text);
    return isRecord(parsed) ? parsed : { value: parsed };
  } catch {
    return { rawText: text.slice(0, 1000) };
  }
}

function providerError(body: JsonRecord) {
  return textValue(
    body.error_message ??
      body.message ??
      body.Message ??
      body.ErrorMessage ??
      body.Description,
  );
}

function envFlag(name: string, fallback: boolean) {
  const value = Deno.env.get(name);
  if (value === undefined || value === null || value.trim() === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function optionalEnv(name: string) {
  const value = Deno.env.get(name);
  return value && value.trim() ? value.trim() : null;
}

function textValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
