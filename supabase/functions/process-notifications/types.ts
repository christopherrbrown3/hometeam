export type PushSubscriptionRecord = Readonly<{
  endpoint: string;
  keys: Readonly<{
    auth: string;
    p256dh: string;
  }>;
}>;

export type VapidCredentials = Readonly<{
  privateKey: string;
  publicKey: string;
  subject: string;
}>;

export type PushNotificationPayload = Readonly<{
  body?: string;
  title: string;
  url?: string;
}>;

export type ClaimedNotificationDelivery = Readonly<{
  attempt_id: string;
  auth_key: string;
  endpoint: string;
  outbox_id: string;
  p256dh_key: string;
  payload: PushNotificationPayload;
}>;

export type DeliveryResult = Readonly<{
  errorCode?: string;
  outcome: "permanent_failure" | "retryable" | "sent";
  responseStatus?: number;
  retryAfterSeconds?: number;
}>;

export type DeliveryRpcClient = Readonly<{
  rpc: <T>(
    name: string,
    input: Readonly<Record<string, unknown>>,
  ) => Promise<Readonly<{ data: T | null; error: unknown | null }>>;
}>;

export type PushDeliveryAdapter = (
  delivery: ClaimedNotificationDelivery,
  vapid: VapidCredentials,
) => Promise<DeliveryResult>;
