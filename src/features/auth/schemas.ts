import { z } from 'zod'

export const emailSchema = z.string().trim().email().max(320)
export const emailCodeSchema = z.string().trim().regex(/^\d{6}$/)

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.').max(320),
})

export const verifySchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, 'Enter the six-digit code from your email.'),
})

export type LoginValues = z.infer<typeof loginSchema>
export type VerifyValues = z.infer<typeof verifySchema>
