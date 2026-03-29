import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface UserProfile {
  id: string
  name: string       // 닉네임 (표시용)
  realName: string | null
  email: string
  role: string
  isPremium: boolean
  location: string | null
}

interface AuthContextType {
  user: UserProfile | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (nickname: string, realName: string, email: string, password: string, location: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>(null!)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(supabaseUser: SupabaseUser) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', supabaseUser.id)
      .single()

    if (error) {
      console.error('프로필 로드 오류:', error)
    }

    if (data?.is_banned) {
      await supabase.auth.signOut()
      setUser(null)
      alert('이용이 제한된 계정입니다.')
      return
    }

    const role = (supabaseUser.app_metadata?.role as string)
      ?? data?.role
      ?? 'user'

    setUser({
      id: supabaseUser.id,
      name: data?.name ?? supabaseUser.email!.split('@')[0],
      realName: data?.real_name ?? null,
      email: supabaseUser.email!,
      role,
      isPremium: data?.is_premium ?? false,
      location: data?.location ?? null,
    })
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
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
    if (data.user) await loadProfile(data.user)
  }

  async function register(nickname: string, realName: string, email: string, password: string, location: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nickname, real_name: realName, location } },
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
