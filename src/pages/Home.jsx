import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { useOnlineStatus } from '../lib/useOnlineStatus'
import BottomNav from '../components/BottomNav'
import CommentSection from '../components/CommentSection'

const MAX_CHARS = 500

function getLocalDateString() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function Home() {
  const { session, coupleId } = useAuth()
  const isOnline = useOnlineStatus()

  const today = new Date()
  const entryDate = getLocalDateString()

  const [pageLoading, setPageLoading]   = useState(true)
  const [myEntry, setMyEntry]           = useState(null)
  const [partnerEntry, setPartnerEntry] = useState(null)
  const [myName, setMyName]             = useState('')
  const [partnerName, setPartnerName]   = useState('')
  const [content, setContent]           = useState('')
  const [submitting, setSubmitting]     = useState(false)
  const [submitError, setSubmitError]   = useState('')
  const [comments, setComments]         = useState([])

  useEffect(() => {
    const userId = session.user.id

    async function load() {
      setPageLoading(true)
      const [entriesRes, profilesRes] = await Promise.all([
        supabase.from('entries').select('*').eq('couple_id', coupleId).eq('entry_date', entryDate),
        supabase.from('profiles').select('user_id, display_name'),
      ])

      if (entriesRes.data) {
        setMyEntry(entriesRes.data.find(e => e.user_id === userId) ?? null)
        setPartnerEntry(entriesRes.data.find(e => e.user_id !== userId) ?? null)
      }
      if (profilesRes.data) {
        setMyName(profilesRes.data.find(p => p.user_id === userId)?.display_name ?? '')
        setPartnerName(profilesRes.data.find(p => p.user_id !== userId)?.display_name ?? '')
      }
      setPageLoading(false)
    }

    load()

    const channel = supabase
      .channel(`entries-${coupleId}-${entryDate}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'entries',
        filter: `couple_id=eq.${coupleId}`,
      }, (payload) => {
        const row = payload.new
        if (row.entry_date !== entryDate) return
        if (row.user_id === userId) setMyEntry(row)
        else setPartnerEntry(row)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [coupleId, entryDate, session.user.id])

  const myEntryId = myEntry?.id
  const partnerEntryId = partnerEntry?.id

  // Comments unlock post-reveal: fetch existing ones and subscribe for the partner's new ones.
  useEffect(() => {
    if (!myEntryId || !partnerEntryId) return
    const entryIds = [myEntryId, partnerEntryId]

    supabase
      .from('comments')
      .select('*')
      .in('entry_id', entryIds)
      .order('created_at')
      .then(({ data }) => { if (data) setComments(data) })

    const channel = supabase
      .channel(`comments-${coupleId}-${entryDate}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'comments',
        filter: `couple_id=eq.${coupleId}`,
      }, (payload) => {
        const row = payload.new
        if (!entryIds.includes(row.entry_id)) return
        setComments(prev => prev.some(c => c.id === row.id) ? prev : [...prev, row])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [myEntryId, partnerEntryId, coupleId, entryDate])

  function handleCommentAdded(comment) {
    setComments(prev => prev.some(c => c.id === comment.id) ? prev : [...prev, comment])
  }

  function handleCommentDeleted(id) {
    setComments(prev => prev.filter(c => c.id !== id))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!content.trim() || submitting) return

    if (!isOnline) {
      setSubmitError("You're offline. Reconnect to submit your win.")
      return
    }

    setSubmitError('')
    setSubmitting(true)

    const { data: newEntry, error } = await supabase
      .from('entries')
      .insert({
        user_id:    session.user.id,
        couple_id:  coupleId,
        entry_date: entryDate,
        content:    content.trim(),
      })
      .select()
      .single()

    if (error) {
      setSubmitError(error.message)
      setSubmitting(false)
      return
    }

    setMyEntry(newEntry)

    // Re-query: RLS now unlocks partner's entry if they already submitted.
    const { data: entries } = await supabase
      .from('entries')
      .select('*')
      .eq('couple_id', coupleId)
      .eq('entry_date', entryDate)

    if (entries) {
      setPartnerEntry(entries.find(e => e.user_id !== session.user.id) ?? null)
    }

    setSubmitting(false)
  }

  const bothSubmitted = !!myEntry && !!partnerEntry

  // ── Loading ──────────────────────────────────────────────────
  if (pageLoading) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-cream-300 border-t-blush-300 animate-spin" />
      </div>
    )
  }

  // ── Main render ──────────────────────────────────────────────
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
        className="flex-1 px-5 pt-1"
        style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}
      >
        <p className="text-sm text-warm-700/50 mb-5 tracking-wide">
          {formatDate(today)}
        </p>

        {/* ── STATE 1: Not yet submitted ───────────────────── */}
        {!myEntry && (
          <div className="animate-slide-up">
            <h2 className="text-2xl font-serif text-warm-800 mb-6">
              What was your win today?
            </h2>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <textarea
                  className="w-full px-4 pt-4 pb-8 rounded-2xl bg-cream-100 border border-cream-200
                             text-warm-800 placeholder-warm-700/40 leading-relaxed
                             focus:outline-none focus:ring-2 focus:ring-blush-200 focus:border-blush-200
                             transition-all duration-200 resize-none min-h-[180px] font-serif text-base"
                  placeholder="Something good happened today…"
                  value={content}
                  onChange={e => setContent(e.target.value.slice(0, MAX_CHARS))}
                  maxLength={MAX_CHARS}
                />
                <span
                  className={`absolute bottom-3 right-4 text-xs tabular-nums pointer-events-none transition-colors ${
                    content.length >= MAX_CHARS ? 'text-blush-400' : 'text-warm-700/30'
                  }`}
                >
                  {content.length}/{MAX_CHARS}
                </span>
              </div>

              {submitError && (
                <p className="text-sm text-blush-500 bg-blush-100/60 rounded-xl px-3 py-2">
                  {submitError}
                </p>
              )}

              <button
                type="submit"
                className="btn-primary"
                disabled={submitting || !content.trim()}
              >
                {submitting ? 'Saving…' : 'Lock it in'}
              </button>
            </form>
          </div>
        )}

        {/* ── STATE 2a: Submitted, waiting ─────────────────── */}
        {myEntry && !bothSubmitted && (
          <div className="animate-slide-up space-y-5">
            <h2 className="text-2xl font-serif text-warm-800">
              Your win is locked ✓
            </h2>

            <div className="card p-5">
              <p className="font-serif text-warm-800 leading-relaxed text-base">{myEntry.content}</p>
              <p className="text-xs text-warm-700/30 mt-4">{formatTime(myEntry.submitted_at)}</p>
            </div>

            <div className="flex flex-col items-center gap-3 pt-4">
              <p className="text-sm text-warm-700/50">Waiting for theirs…</p>
              <div className="flex gap-2">
                <div className="w-2 h-2 rounded-full bg-blush-200 animate-pulse" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-blush-200 animate-pulse" style={{ animationDelay: '300ms' }} />
                <div className="w-2 h-2 rounded-full bg-blush-200 animate-pulse" style={{ animationDelay: '600ms' }} />
              </div>
            </div>
          </div>
        )}

        {/* ── STATE 2b: Both submitted — reveal ────────────── */}
        {bothSubmitted && (
          <div className="animate-fade-in space-y-5">
            <h2 className="text-2xl font-serif text-warm-800">
              Today's wins ♡
            </h2>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <div className="card p-5 flex flex-col">
                  <p className="text-xs uppercase tracking-wider text-blush-300 font-medium mb-3">
                    {myName || 'You'}
                  </p>
                  <p className="font-serif text-warm-800 leading-relaxed flex-1 text-base">
                    {myEntry.content}
                  </p>
                  <p className="text-xs text-warm-700/30 mt-4">
                    {formatTime(myEntry.submitted_at)}
                  </p>
                </div>
                <CommentSection
                  entryId={myEntry.id}
                  coupleId={coupleId}
                  comments={comments.filter(c => c.entry_id === myEntry.id)}
                  myUserId={session.user.id}
                  myName={myName}
                  partnerName={partnerName}
                  onAdded={handleCommentAdded}
                  onDeleted={handleCommentDeleted}
                />
              </div>

              <div>
                <div className="card p-5 flex flex-col">
                  <p className="text-xs uppercase tracking-wider text-blush-300 font-medium mb-3">
                    {partnerName || 'Your partner'}
                  </p>
                  <p className="font-serif text-warm-800 leading-relaxed flex-1 text-base">
                    {partnerEntry.content}
                  </p>
                  <p className="text-xs text-warm-700/30 mt-4">
                    {formatTime(partnerEntry.submitted_at)}
                  </p>
                </div>
                <CommentSection
                  entryId={partnerEntry.id}
                  coupleId={coupleId}
                  comments={comments.filter(c => c.entry_id === partnerEntry.id)}
                  myUserId={session.user.id}
                  myName={myName}
                  partnerName={partnerName}
                  onAdded={handleCommentAdded}
                  onDeleted={handleCommentDeleted}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
