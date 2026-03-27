import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface UserProfile {
  id: string
  name: string
  email: string
  role: string
  isPremium: boolean
}

interface AuthContextType {
  user: UserProfile | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>(null!)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(supabaseUser: SupabaseUser) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', supabaseUser.id)
      .single()

    if (data) {
      setUser({
        id: supabaseUser.id,
        name: data.name,
        email: supabaseUser.email!,
        role: data.role,
        isPremium: data.is_premium,
      })
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) await loadProfile(session.user)
      else setUser(null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) loadProfile(session.user)
      else setUser(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function login(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
  }

  async function register(name: string, email: string, password: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })
    if (error) throw new Error(error.message)
  }

  async function logout() {
    await supabase.auth.signOut()
    setUser(null)
  }

  async function refreshUser() {
    const { data: { user: supabaseUser } } = await supabase.auth.getUser()
    if (supabaseUser) await loadProfile(supabaseUser)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
