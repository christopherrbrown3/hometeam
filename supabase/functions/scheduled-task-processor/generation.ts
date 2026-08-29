export type GenerationRpcClient = Readonly<{
  rpc: <T>(
    name: "apply_missed_policies" | "generate_calendar_occurrences",
    input: Readonly<Record<string, unknown>>,
  ) => Promise<Readonly<{ data: T | null; error: unknown | null }>>;
}>;

export type GenerationPhaseResult = Readonly<{
  generated: number;
  missedPoliciesApplied: number;
  through: string;
}>;

function utcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addUtcDays(date: Date, days: number): string {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return utcDate(result);
}

function rpcCount(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : 0;
}

export async function runGenerationPhase(
  client: GenerationRpcClient,
  now: Date,
  horizonDays: number,
): Promise<GenerationPhaseResult> {
  if (!Number.isInteger(horizonDays) || horizonDays < 1 || horizonDays > 90) {
    throw new Error("invalid_generation_horizon");
  }

  // Cover every IANA offset around the UTC date boundary. Re-generation is
  // conflict-safe, so looking back one UTC day cannot duplicate occurrences.
  const today = addUtcDays(now, -1);
  const through = addUtcDays(now, horizonDays);
  const generated = await client.rpc<number>("generate_calendar_occurrences", {
    input_from: today,
    input_through: through,
  });
  if (generated.error) throw new Error("calendar_generation_failed");

  // Generate first so keep-newest and skip-when-next-begins policies can see
  // the occurrence that determines whether an older task is now missed.
  const missed = await client.rpc<number>("apply_missed_policies", {
    input_now: now.toISOString(),
  });
  if (missed.error) throw new Error("missed_policy_processing_failed");

  return {
    generated: rpcCount(generated.data),
    missedPoliciesApplied: rpcCount(missed.data),
    through,
  };
}
