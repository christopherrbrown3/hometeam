import { sendPushNotification } from "@mmmike/web-push/send";
import { createClient } from "@supabase/supabase-js";
import {
  isAuthorizedProcessorRequest,
  resolveSupabaseServerKey,
} from "../process-notifications/auth.ts";
import { createWebPushAdapter } from "../process-notifications/webPushAdapter.ts";
import { readBoundedJsonObject } from "../process-notifications/request.ts";
import type { SchedulerRpcClient } from "./scheduler.ts";
import { runScheduledProcessor } from "./scheduler.ts";

function boundedInteger(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
): number | null {
  if (value === undefined) return fallback;
  return Number.isInteger(value) && Number(value) >= minimum &&
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
    const body = await readBoundedJsonObject(
      request,
      new Set([
        "deliveryLimit",
        "generationHorizonDays",
        "notificationLimit",
      ]),
    );
    if (body === null) {
      return Response.json({ error: "invalid_request" }, { status: 400 });
    }
    const deliveryLimit = boundedInteger(body.deliveryLimit, 50, 1, 100);
    const generationHorizonDays = boundedInteger(
      body.generationHorizonDays,
      60,
      1,
      90,
    );
    const notificationLimit = boundedInteger(
      body.notificationLimit,
      200,
      1,
      500,
    );
    if (
      deliveryLimit === null || generationHorizonDays === null ||
      notificationLimit === null
    ) {
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
    }) as unknown as SchedulerRpcClient;
    const result = await runScheduledProcessor(
      client,
      createWebPushAdapter(sendPushNotification),
      { privateKey, publicKey, subject },
      {
        deliveryLimit,
        generationHorizonDays,
        leaseSeconds: 120,
        notificationLimit,
        now: new Date(),
        timeBudgetMs: 45_000,
      },
    );
    return Response.json(result, {
      status: result.status === "locked" ? 202 : 200,
    });
  } catch {
    return Response.json({ error: "scheduled_processing_failed" }, {
      status: 500,
    });
  }
});
