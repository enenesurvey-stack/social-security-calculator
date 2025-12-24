import { createClient } from '@supabase/supabase-js'

let clientInstance: ReturnType<typeof createClient> | null = null

export const supabase = new Proxy({} as any, {
  get(target, prop) {
    if (!clientInstance) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!url || !key) {
        throw new Error('Supabase URL and Anon Key are required')
      }

      clientInstance = createClient(url, key)
    }
    return (clientInstance as any)[prop]
  }
})