import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined)  // undefined = still loading
  const [coupleId, setCoupleId] = useState(undefined) // undefined = still loading

  async function loadCouple(userId) {
    const { data } = await supabase
      .from('couple_members')
      .select('couple_id')
      .eq('user_id', userId)
      .maybeSingle()
    setCoupleId(data?.couple_id ?? null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) loadCouple(session.user.id)
      else setCoupleId(null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) loadCouple(session.user.id)
      else setCoupleId(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function refreshCouple() {
    if (!session) return null
    const { data } = await supabase
      .from('couple_members')
      .select('couple_id')
      .eq('user_id', session.user.id)
      .maybeSingle()
    const id = data?.couple_id ?? null
    setCoupleId(id)
    return id
  }

  // loading = true until both session and couple status are resolved
  const loading = session === undefined || (session !== null && coupleId === undefined)

  return (
    <AuthContext.Provider value={{ session, coupleId, loading, refreshCouple }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
