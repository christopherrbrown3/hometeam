import type {
  ClaimedNotificationDelivery,
  DeliveryRpcClient,
  PushDeliveryAdapter,
  VapidCredentials,
} from "./types.ts";

export type DeliveryBatchResult = Readonly<{
  claimed: number;
  failed: number;
  retried: number;
  sent: number;
}>;

function isClaimedDelivery(
  value: unknown,
): value is ClaimedNotificationDelivery {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<ClaimedNotificationDelivery>;
  return typeof candidate.attempt_id === "string" &&
    typeof candidate.auth_key === "string" &&
    typeof candidate.endpoint === "string" &&
    typeof candidate.outbox_id === "string" &&
    typeof candidate.p256dh_key === "string" &&
    typeof candidate.payload === "object" && candidate.payload !== null &&
    typeof (candidate.payload as { title?: unknown }).title === "string";
}

export async function runDeliveryBatch(
  client: DeliveryRpcClient,
  deliver: PushDeliveryAdapter,
  vapid: VapidCredentials,
  options: Readonly<{
    limit: number;
    now: Date;
    staleAfterSeconds?: number;
  }>,
): Promise<DeliveryBatchResult> {
  const claim = await client.rpc<unknown[]>("claim_notification_deliveries", {
    input_limit: options.limit,
    input_now: options.now.toISOString(),
    input_stale_after_seconds: options.staleAfterSeconds ?? 300,
  });

  if (
    claim.error || !Array.isArray(claim.data) ||
    !claim.data.every(isClaimedDelivery)
  ) {
    throw new Error("notification_delivery_claim_failed");
  }

  let failed = 0;
  let retried = 0;
  let sent = 0;

  for (const delivery of claim.data) {
    const result = await deliver(delivery, vapid);
    const recorded = await client.rpc<null>(
      "record_notification_delivery_result",
      {
        input_attempt_id: delivery.attempt_id,
        input_error_code: result.errorCode ?? null,
        input_now: options.now.toISOString(),
        input_outcome: result.outcome,
        input_response_status: result.responseStatus ?? null,
        input_retry_after_seconds: result.retryAfterSeconds ?? null,
      },
    );

    if (recorded.error) throw new Error("notification_delivery_result_failed");

    if (result.outcome === "sent") sent += 1;
    else if (result.outcome === "retryable") retried += 1;
    else failed += 1;
  }

  return { claimed: claim.data.length, failed, retried, sent };
}
