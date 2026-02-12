import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tpdschpdaledmphfyqlw.supabase.co'
// Luu y: Ma nay dang giong khoa cua Stripe. Hay kiem tra lai trong Supabase (Anon Key)
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwZHNjaHBkYWxlZG1waGZ5cWx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MzAyMzQsImV4cCI6MjA4NjQwNjIzNH0.RzYRCOJpDPFe6Er8rWbGJIvcgu7dH5hTfcwVk_bqnGc'

// Ma Service Role (Admin)
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwZHNjaHBkYWxlZG1waGZ5cWx3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDgzMDIzNCwiZXhwIjoyMDg2NDA2MjM0fQ.bk8zzju6ZpPX9zGoAFjj-AaD4Uv6QUJl__83tzckQbY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Client Admin de quan ly User (Tao/Xoa)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})
