import { sendPushNotification } from "@mmmike/web-push/send";
import { createClient } from "@supabase/supabase-js";
import {
  isAuthorizedProcessorRequest,
  resolveSupabaseServerKey,
} from "./auth.ts";
import { createWebPushAdapter } from "./webPushAdapter.ts";
import type { DeliveryRpcClient } from "./types.ts";
import { runDeliveryBatch } from "./worker.ts";
import { readBoundedJsonObject } from "./request.ts";

function positiveInteger(
  value: unknown,
  fallback: number,
  maximum: number,
): number | null {
  if (value === undefined) return fallback;
  return Number.isInteger(value) && Number(value) >= 1 &&
      Number(value) <= maximum
    ? Number(value)
    : null;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return Response.json({ error: "method_not_allowed" }, {
      status: 405,
      headers: { Allow: "POST" },
    });
  }

  if (
    !isAuthorizedProcessorRequest(
      request,
      Deno.env.get("NOTIFICATION_PROCESSOR_SECRET"),
    )
  ) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = await readBoundedJsonObject(request, new Set(["limit"]));
    if (body === null) {
      return Response.json({ error: "invalid_request" }, { status: 400 });
    }
    const limit = positiveInteger((body as { limit?: unknown }).limit, 50, 100);
    if (limit === null) {
      return Response.json({ error: "invalid_request" }, { status: 400 });
    }

    const url = Deno.env.get("SUPABASE_URL");
    const serverKey = resolveSupabaseServerKey(
      Deno.env.get("SUPABASE_SECRET_KEYS"),
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    );
    const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const subject = Deno.env.get("VAPID_SUBJECT");
    if (!url || !serverKey || !publicKey || !privateKey || !subject) {
      return Response.json({ error: "worker_not_configured" }, { status: 503 });
    }

    const client = createClient(url, serverKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    }) as unknown as DeliveryRpcClient;
    const result = await runDeliveryBatch(
      client,
      createWebPushAdapter(sendPushNotification),
      { privateKey, publicKey, subject },
      { limit, now: new Date() },
    );
    return Response.json(result);
  } catch {
    return Response.json({ error: "notification_processing_failed" }, {
      status: 500,
    });
  }
});
