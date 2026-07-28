import { z } from 'zod'

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9_-]{1,30}[a-z0-9]$/, 'Use 3–32 lowercase letters, numbers, hyphens, or underscores.')

export const passwordSchema = z.string().min(12, 'Use a password with at least 12 characters.').max(128)

export const loginSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
})

export const signupSchema = loginSchema.extend({
  confirmPassword: z.string(),
}).refine((value) => value.password === value.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
})

export type LoginValues = z.infer<typeof loginSchema>
export type SignUpValues = z.infer<typeof signupSchema>
