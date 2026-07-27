import { z } from 'zod'

const appEnvironmentSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().trim().min(1),
})

export type AppEnvironment = z.infer<typeof appEnvironmentSchema>

export function readAppEnvironment(
  environment: unknown = import.meta.env,
): AppEnvironment {
  const parsed = appEnvironmentSchema.safeParse(environment)

  if (!parsed.success) {
    const invalidNames = parsed.error.issues
      .map((issue) => issue.path.join('.'))
      .filter((name) => name.length > 0)
      .join(', ')

    throw new Error(
      `Invalid HomeTeam browser environment configuration: ${invalidNames}. ` +
        'Set the values shown in .env.example and restart the development server.',
    )
  }

  return parsed.data
}
