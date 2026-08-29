import type {
  ClaimedNotificationDelivery,
  DeliveryResult,
  PushDeliveryAdapter,
  PushNotificationPayload,
  PushSubscriptionRecord,
  VapidCredentials,
} from "./types.ts";

export type SendPushNotification = (
  subscription: PushSubscriptionRecord,
  payload: PushNotificationPayload,
  vapid: VapidCredentials,
  options: Readonly<{
    topic: string;
    ttl: number;
    urgency: "high" | "low" | "normal" | "very-low";
  }>,
) => Promise<boolean>;

type WebPushErrorShape = Readonly<{
  retryAfterMs?: unknown;
  statusCode?: unknown;
}>;

function webPushErrorShape(error: unknown): WebPushErrorShape | null {
  if (typeof error !== "object" || error === null) return null;
  return error as WebPushErrorShape;
}

export function classifyWebPushError(error: unknown): DeliveryResult {
  const shape = webPushErrorShape(error);
  const status = typeof shape?.statusCode === "number"
    ? shape.statusCode
    : undefined;
  const retryAfterMs = typeof shape?.retryAfterMs === "number"
    ? shape.retryAfterMs
    : undefined;

  if (status === 404 || status === 410) {
    return {
      errorCode: "push_subscription_gone",
      outcome: "permanent_failure",
      responseStatus: status,
    };
  }

  if (
    status === 408 || status === 425 || status === 429 ||
    (status !== undefined && status >= 500)
  ) {
    return {
      errorCode: status === 429
        ? "push_rate_limited"
        : "push_transient_http_error",
      outcome: "retryable",
      responseStatus: status,
      retryAfterSeconds: retryAfterMs === undefined
        ? undefined
        : Math.max(0, Math.ceil(retryAfterMs / 1_000)),
    };
  }

  if (status !== undefined && status >= 400) {
    return {
      errorCode: "push_permanent_http_error",
      outcome: "permanent_failure",
      responseStatus: status,
    };
  }

  return {
    errorCode: "push_network_error",
    outcome: "retryable",
  };
}

export function createWebPushAdapter(
  sendPushNotification: SendPushNotification,
): PushDeliveryAdapter {
  return async (delivery, vapid) => {
    try {
      const accepted = await sendPushNotification(
        {
          endpoint: delivery.endpoint,
          keys: {
            auth: delivery.auth_key,
            p256dh: delivery.p256dh_key,
          },
        },
        delivery.payload,
        vapid,
        {
          topic: `hometeam-${
            delivery.outbox_id.replaceAll("-", "").slice(0, 24)
          }`,
          ttl: 3_600,
          urgency: "normal",
        },
      );

      return accepted ? { outcome: "sent" } : {
        errorCode: "push_subscription_gone",
        outcome: "permanent_failure",
        responseStatus: 410,
      };
    } catch (error) {
      return classifyWebPushError(error);
    }
  };
}
