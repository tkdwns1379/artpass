import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qbkalbnehrmxjxzlftlu.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFia2FsYm5laHJteGp4emxmdGx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1ODk4NTYsImV4cCI6MjA5MDE2NTg1Nn0.F2KtRznr-epHQyVmk64BJSiwsbA_C8HrtvdfQ4EkByg'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
