import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { useOnlineStatus } from '../lib/useOnlineStatus'
import BottomNav from '../components/BottomNav'

export default function Profile() {
  const { session, coupleId } = useAuth()
  const isOnline = useOnlineStatus()
  const userId = session.user.id

  const [displayName, setDisplayName] = useState('')
  const [savedName, setSavedName]     = useState('')
  const [partnerName, setPartnerName] = useState('')
  const [streak, setStreak]           = useState(null)
  const [coupleCode, setCoupleCode]   = useState(null)
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [saveError, setSaveError]     = useState('')

  useEffect(() => {
    async function load() {
      const [profilesRes, streakRes, codeRes] = await Promise.all([
        supabase.from('profiles').select('user_id, display_name'),
        supabase.rpc('get_streak', { p_couple_id: coupleId }),
        supabase
          .from('codes')
          .select('code')
          .eq('used', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])

      if (profilesRes.data) {
        const mine   = profilesRes.data.find(p => p.user_id === userId)
        const theirs = profilesRes.data.find(p => p.user_id !== userId)
        const myName = mine?.display_name ?? ''
        setDisplayName(myName)
        setSavedName(myName)
        setPartnerName(theirs?.display_name ?? '')
      }

      if (streakRes.data !== null && streakRes.data !== undefined) {
        setStreak(streakRes.data)
      }

      if (codeRes.data) setCoupleCode(codeRes.data.code)

      setLoading(false)
    }
    load()
  }, [coupleId, userId])

  async function handleSave() {
    if (!isOnline) {
      setSaveError("You're offline. Reconnect to save your name.")
      return
    }
    setSaveError('')
    setSaving(true)
    const trimmed = displayName.trim()
    const { error } = await supabase.from('profiles').upsert({
      user_id:      userId,
      display_name: trimmed,
      updated_at:   new Date().toISOString(),
    })
    if (error) {
      setSaveError(error.message)
    } else {
      setSavedName(trimmed)
      setDisplayName(trimmed)
    }
    setSaving(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  const isDirty = displayName !== savedName

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-cream-300 border-t-blush-300 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col">

      <header
        className="px-5 pb-4 flex items-center"
        style={{ paddingTop: 'max(1.5rem, calc(env(safe-area-inset-top) + 0.75rem))' }}
      >
        <svg className="w-5 h-5 text-blush-300 mr-2" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
        <span className="font-serif text-lg text-warm-800">Wins</span>
      </header>

      <main
        className="flex-1 px-5 pt-1 space-y-4"
        style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}
      >
        <h2 className="text-2xl font-serif text-warm-800 mb-2">Profile</h2>

        {/* Display name */}
        <div className="card p-5 space-y-3">
          <p className="text-xs uppercase tracking-wider text-warm-700/50 font-medium">Your name</p>
          <input
            type="text"
            className="input-field"
            placeholder="Add a display name…"
            value={displayName}
            onChange={e => setDisplayName(e.target.value.slice(0, 40))}
          />
          {saveError && (
            <p className="text-sm text-blush-500 bg-blush-100/60 rounded-xl px-3 py-2">
              {saveError}
            </p>
          )}
          {isDirty && (
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : 'Save name'}
            </button>
          )}
        </div>

        {/* Paired with */}
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wider text-warm-700/50 font-medium mb-3">Paired with</p>
          <p className="font-serif text-warm-800 text-lg leading-snug">
            {partnerName || 'Your partner'}
          </p>
          {coupleCode && (
            <p className="text-xs text-warm-700/30 font-mono tracking-[0.25em] mt-2">
              {coupleCode}
            </p>
          )}
        </div>

        {/* Streak */}
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-blush-100 rounded-2xl flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-blush-300" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
          <div>
            <p className="font-serif text-warm-800 leading-none">
              <span className="text-3xl">{streak ?? '—'}</span>
              <span className="text-sm text-warm-700/50 ml-2">day streak</span>
            </p>
            <p className="text-xs text-warm-700/40 mt-1">Consecutive days you both submitted</p>
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-full py-3.5 px-4 rounded-2xl border border-cream-200 text-warm-700/60
                     text-sm font-medium hover:bg-cream-100 active:scale-[0.98]
                     transition-all duration-200"
          style={{ minHeight: '48px', touchAction: 'manipulation' }}
        >
          Sign out
        </button>
      </main>

      <BottomNav />
    </div>
  )
}
