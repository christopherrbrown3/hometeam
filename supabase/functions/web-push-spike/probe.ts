import { sendPushNotification } from "@mmmike/web-push/send";
import {
  generateVapidKeys,
  uint8ArrayToUrlBase64,
} from "@mmmike/web-push/vapid";

type CapturedRequest = Readonly<{
  body: Uint8Array;
  headers: Headers;
  method: string;
  url: string;
}>;

export type CompatibilityReport = Readonly<{
  checks: Readonly<{
    aes128gcm: boolean;
    encryptedPayload: boolean;
    invalidEndpointRejected: boolean;
    vapidAuthorization: boolean;
  }>;
  denoVersion: string;
  package: "@mmmike/web-push@1.3.0";
  passed: boolean;
}>;

async function createSubscriptionKeys() {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  );
  const publicKey = new Uint8Array(
    await crypto.subtle.exportKey("raw", keyPair.publicKey),
  );
  const authSecret = crypto.getRandomValues(new Uint8Array(16));

  return {
    auth: uint8ArrayToUrlBase64(authSecret),
    p256dh: uint8ArrayToUrlBase64(publicKey),
  };
}

export async function runCompatibilityProbe(): Promise<CompatibilityReport> {
  const subscriptionKeys = await createSubscriptionKeys();
  const vapid = await generateVapidKeys();
  const endpoint = "https://push.example.test/web-push-spike";
  const originalFetch = globalThis.fetch;
  const capture: { request?: CapturedRequest } = {};

  globalThis.fetch =
    (async (input: string | URL | Request, init?: RequestInit) => {
      const body = init?.body instanceof Uint8Array
        ? init.body
        : new Uint8Array();
      capture.request = {
        body,
        headers: new Headers(init?.headers),
        method: init?.method ?? "GET",
        url: String(input),
      };
      return new Response(null, { status: 201 });
    }) as typeof fetch;

  try {
    const delivered = await sendPushNotification(
      { endpoint, keys: subscriptionKeys },
      {
        title: "HomeTeam compatibility probe",
        body: "Encrypted Web Push payload",
        url: "/#/occurrences/probe",
        tag: "web-push-spike",
      },
      {
        publicKey: vapid.publicKey,
        privateKey: vapid.privateKey,
        subject: "https://example.test/contact",
      },
      { ttl: 60, urgency: "normal" },
    );

    if (!delivered || !capture.request) {
      throw new Error(
        "the mock push service did not accept the compatibility request",
      );
    }

    let invalidEndpointRejected = false;
    try {
      await sendPushNotification(
        {
          endpoint: "http://push.example.test/insecure",
          keys: subscriptionKeys,
        },
        { title: "Invalid endpoint probe" },
        {
          publicKey: vapid.publicKey,
          privateKey: vapid.privateKey,
          subject: "https://example.test/contact",
        },
      );
    } catch (error) {
      invalidEndpointRejected = error instanceof Error &&
        error.message.includes("https:");
    }

    const request = capture.request;
    const checks = {
      aes128gcm: request.headers.get("content-encoding") === "aes128gcm",
      encryptedPayload: request.body.byteLength > 86,
      invalidEndpointRejected,
      vapidAuthorization:
        request.headers.get("authorization")?.startsWith("vapid t=") ?? false,
    };

    return {
      checks,
      denoVersion: Deno.version.deno,
      package: "@mmmike/web-push@1.3.0",
      passed: request.method === "POST" && request.url === endpoint &&
        Object.values(checks).every(Boolean),
    };
  } finally {
    globalThis.fetch = originalFetch;
  }
}
