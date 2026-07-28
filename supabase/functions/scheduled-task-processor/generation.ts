// Called by the scheduled processor with a service-role database client. The
// database function owns recurrence parsing, timezone conversion, and conflict
// safety; this adapter only supplies a bounded horizon.
export type GenerationRpcClient = Readonly<{
  rpc: (name: 'apply_missed_policies' | 'generate_calendar_occurrences', input?: Record<string, string>) => Promise<{ error: { message: string } | null }>
}>

export async function runGenerationPhase(client: GenerationRpcClient, today: string, through: string) {
  const missed = await client.rpc('apply_missed_policies', { input_now: new Date().toISOString() })
  if (missed.error) throw new Error(missed.error.message)
  const generated = await client.rpc('generate_calendar_occurrences', { input_from: today, input_through: through })
  if (generated.error) throw new Error(generated.error.message)
}
