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
  userNumber: number | null
  avatarUrl: string | null
  admissionType: 'susi' | 'jeongsi' | null
  avgGrade: string | null
  targetUniversity: string | null
  acceptanceRate: number | null
  nameVisibility: 'all' | 'friend' | 'none'
  majorType: '전공자' | '비전공자' | null
  schoolName: string | null
  majorName: string | null
  careerInterest: string | null
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
      userNumber: data?.user_number ?? null,
      avatarUrl: data?.avatar_url ?? null,
      admissionType: data?.admission_type ?? null,
      avgGrade: data?.avg_grade ?? null,
      targetUniversity: data?.target_university ?? null,
      acceptanceRate: data?.acceptance_rate ?? null,
      nameVisibility: data?.name_visibility ?? 'friend',
      majorType: data?.major_type ?? null,
      schoolName: data?.school_name ?? null,
      majorName: data?.major_name ?? null,
      careerInterest: data?.career_interest ?? null,
    })
  }

  useEffect(() => {
    let currentUserId: string | null = null

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        currentUserId = session.user.id
        await loadProfile(session.user)
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        currentUserId = session.user.id
        loadProfile(session.user)
      } else {
        currentUserId = null
        setUser(null)
      }
    })

    // 프로필 실시간 구독 — 추방/프리미엄 해제 즉시 반영
    const profileSub = supabase
      .channel('profile-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        async (payload) => {
          if (payload.new.id !== currentUserId) return
          const updated = payload.new as Record<string, unknown>

          // 추방 → 즉시 로그아웃
          if (updated.is_banned) {
            await supabase.auth.signOut()
            setUser(null)
            alert('관리자에 의해 계정이 제한되었습니다.')
            window.location.href = '/login'
            return
          }

          // 프로필 변경사항 즉시 반영 (프리미엄 해제 포함)
          const { data: supabaseUser } = await supabase.auth.getUser()
          if (supabaseUser.user) await loadProfile(supabaseUser.user)
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
      supabase.removeChannel(profileSub)
    }
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
