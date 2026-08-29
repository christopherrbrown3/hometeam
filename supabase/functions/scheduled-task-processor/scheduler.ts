import type { DeliveryBatchResult } from "../process-notifications/worker.ts";
import { runDeliveryBatch } from "../process-notifications/worker.ts";
import type {
  DeliveryRpcClient,
  PushDeliveryAdapter,
  VapidCredentials,
} from "../process-notifications/types.ts";
import { runGenerationPhase } from "./generation.ts";

export type SchedulerRpcClient = DeliveryRpcClient;

type ClaimedRun = Readonly<{
  acquired: boolean;
  generation_through: string | null;
  run_token: string | null;
}>;

export type ScheduledProcessorResult = Readonly<{
  delivery?: DeliveryBatchResult;
  generated?: number;
  missedPoliciesApplied?: number;
  notificationsProduced?: number;
  status: "completed" | "locked";
  through?: string;
}>;

function isClaimedRun(value: unknown): value is ClaimedRun {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Partial<ClaimedRun>;
  return typeof row.acquired === "boolean" &&
    (row.run_token === null || typeof row.run_token === "string") &&
    (row.generation_through === null ||
      typeof row.generation_through === "string");
}

function count(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : 0;
}

function safePhaseError(error: unknown): string {
  if (
    error instanceof Error && [
      "calendar_generation_failed",
      "missed_policy_processing_failed",
      "notification_delivery_claim_failed",
      "notification_delivery_result_failed",
      "scheduled_notification_production_failed",
    ].includes(error.message)
  ) return error.message;
  return "scheduled_processor_failed";
}

export async function runScheduledProcessor(
  client: SchedulerRpcClient,
  deliver: PushDeliveryAdapter,
  vapid: VapidCredentials,
  options: Readonly<{
    clock?: () => number;
    deliveryLimit: number;
    generationHorizonDays: number;
    leaseSeconds: number;
    notificationLimit: number;
    now: Date;
    timeBudgetMs: number;
  }>,
): Promise<ScheduledProcessorResult> {
  const clock = options.clock ?? Date.now;
  const startedAt = clock();
  const claim = await client.rpc<unknown[]>("claim_scheduled_task_run", {
    input_lease_seconds: options.leaseSeconds,
    input_now: options.now.toISOString(),
  });
  const claimedRun = Array.isArray(claim.data) && claim.data.length === 1 &&
      isClaimedRun(claim.data[0])
    ? claim.data[0]
    : null;
  if (claim.error || !claimedRun) throw new Error("scheduled_run_claim_failed");
  if (!claimedRun.acquired || !claimedRun.run_token) {
    return { status: "locked" };
  }

  let through: string | null = null;
  let completionError: string | null = null;
  try {
    const generation = await runGenerationPhase(
      client,
      options.now,
      options.generationHorizonDays,
    );
    through = generation.through;

    const produced = await client.rpc<number>(
      "produce_scheduled_notifications",
      {
        input_limit: options.notificationLimit,
        input_now: options.now.toISOString(),
      },
    );
    if (produced.error) {
      throw new Error("scheduled_notification_production_failed");
    }

    let delivery: DeliveryBatchResult = {
      claimed: 0,
      failed: 0,
      retried: 0,
      sent: 0,
    };
    if (clock() - startedAt < options.timeBudgetMs) {
      delivery = await runDeliveryBatch(client, deliver, vapid, {
        limit: options.deliveryLimit,
        now: options.now,
        staleAfterSeconds: options.leaseSeconds,
      });
    }

    return {
      delivery,
      generated: generation.generated,
      missedPoliciesApplied: generation.missedPoliciesApplied,
      notificationsProduced: count(produced.data),
      status: "completed",
      through,
    };
  } catch (error) {
    completionError = safePhaseError(error);
    throw error;
  } finally {
    const completed = await client.rpc<boolean>("complete_scheduled_task_run", {
      input_error: completionError,
      input_generation_through: through,
      input_now: new Date(clock()).toISOString(),
      input_run_token: claimedRun.run_token,
    });
    if (completed.error || completed.data !== true) {
      throw new Error("scheduled_run_completion_failed");
    }
  }
}
