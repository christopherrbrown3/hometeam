import { createClient } from '@supabase/supabase-js'
import { readAppEnvironment } from './env'
import type { Database } from '../types/database'

const environment = readAppEnvironment()

export const supabase = createClient<Database>(
  environment.VITE_SUPABASE_URL,
  environment.VITE_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
    },
  },
)
