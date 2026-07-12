import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import BottomNav from '../components/BottomNav'
import CommentSection from '../components/CommentSection'

function getLocalDateString() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatMemoryDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const opts = { weekday: 'long', month: 'long', day: 'numeric' }
  if (y !== new Date().getFullYear()) opts.year = 'numeric'
  return date.toLocaleDateString('en-US', opts)
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function pickRandom(list, exclude) {
  const pool = exclude ? list.filter(d => d !== exclude) : list
  return pool[Math.floor(Math.random() * pool.length)]
}

function SparkleIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
      <path d="M18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9z" />
    </svg>
  )
}

export default function Memories() {
  const { session, coupleId } = useAuth()
  const todayDate = getLocalDateString()

  const [dates, setDates]             = useState(null) // null = loading
  const [current, setCurrent]         = useState(null)
  const [dayLoading, setDayLoading]   = useState(true)
  const [mine, setMine]               = useState(null)
  const [theirs, setTheirs]           = useState(null)
  const [comments, setComments]       = useState([])
  const [myName, setMyName]           = useState('')
  const [partnerName, setPartnerName] = useState('')

  useEffect(() => {
    supabase.from('profiles').select('user_id, display_name').then(({ data }) => {
      if (!data) return
      setMyName(data.find(p => p.user_id === session.user.id)?.display_name ?? '')
      setPartnerName(data.find(p => p.user_id !== session.user.id)?.display_name ?? '')
    })
  }, [coupleId, session.user.id])

  useEffect(() => {
    async function loadDates() {
      const { data } = await supabase
        .from('entries')
        .select('entry_date, user_id')
        .eq('couple_id', coupleId)
        .lt('entry_date', todayDate)

      const usersByDate = {}
      for (const row of data ?? []) {
        (usersByDate[row.entry_date] ??= new Set()).add(row.user_id)
      }
      const completed = Object.entries(usersByDate)
        .filter(([, users]) => users.size >= 2)
        .map(([date]) => date)

      setDates(completed)
      if (completed.length >= 2) setCurrent(pickRandom(completed, null))
    }
    loadDates()
  }, [coupleId, todayDate])

  useEffect(() => {
    if (!current) return
    let cancelled = false

    async function loadDay() {
      setDayLoading(true)
      const { data: entries } = await supabase
        .from('entries')
        .select('*')
        .eq('couple_id', coupleId)
        .eq('entry_date', current)

      const entryIds = (entries ?? []).map(e => e.id)
      let commentRows = []
      if (entryIds.length) {
        const { data } = await supabase
          .from('comments')
          .select('*')
          .in('entry_id', entryIds)
          .order('created_at')
        commentRows = data ?? []
      }

      if (cancelled) return
      setMine(entries?.find(e => e.user_id === session.user.id) ?? null)
      setTheirs(entries?.find(e => e.user_id !== session.user.id) ?? null)
      setComments(commentRows)
      setDayLoading(false)
    }
    loadDay()

    return () => { cancelled = true }
  }, [current, coupleId, session.user.id])

  function handleCommentAdded(comment) {
    setComments(prev => prev.some(c => c.id === comment.id) ? prev : [...prev, comment])
  }

  function handleCommentDeleted(id) {
    setComments(prev => prev.filter(c => c.id !== id))
  }

  const loading = dates === null || (current && dayLoading)
  const tooFew = dates !== null && dates.length < 2

  return (
    <div className="min-h-screen bg-gradient-to-b from-blush-100/40 via-cream-50 to-cream-50 flex flex-col">

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
        className="flex-1 px-6 pt-4"
        style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}
      >
        {/* ── Loading ──────────────────────────────────────── */}
        {loading && !tooFew && (
          <div className="flex justify-center py-24">
            <div className="w-6 h-6 rounded-full border-2 border-cream-300 border-t-blush-300 animate-spin" />
          </div>
        )}

        {/* ── Empty state ──────────────────────────────────── */}
        {tooFew && (
          <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
            <SparkleIcon className="w-10 h-10 text-blush-200 mb-5" />
            <p className="text-warm-700/50 text-sm leading-relaxed max-w-[16rem]">
              Keep logging your wins — memories will show up here soon.
            </p>
          </div>
        )}

        {/* ── Memory ───────────────────────────────────────── */}
        {!loading && !tooFew && mine && theirs && (
          <div key={current} className="animate-fade-in space-y-8">
            <div className="text-center pt-4 space-y-2">
              <SparkleIcon className="w-6 h-6 text-blush-300 mx-auto" />
              <h2 className="text-2xl font-serif text-warm-800 leading-snug">
                Remember {formatMemoryDate(current)}?
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-start">
              <div>
                <div className="card p-6 flex flex-col">
                  <p className="text-xs uppercase tracking-wider text-blush-300 font-medium mb-3">
                    {myName || 'You'}
                  </p>
                  <p className="font-serif text-warm-800 leading-loose flex-1 text-base">
                    {mine.content}
                  </p>
                  <p className="text-xs text-warm-700/30 mt-4">
                    {formatTime(mine.submitted_at)}
                  </p>
                </div>
                <CommentSection
                  entryId={mine.id}
                  coupleId={coupleId}
                  comments={comments.filter(c => c.entry_id === mine.id)}
                  myUserId={session.user.id}
                  myName={myName}
                  partnerName={partnerName}
                  onAdded={handleCommentAdded}
                  onDeleted={handleCommentDeleted}
                />
              </div>

              <div>
                <div className="card p-6 flex flex-col">
                  <p className="text-xs uppercase tracking-wider text-blush-300 font-medium mb-3">
                    {partnerName || 'Your partner'}
                  </p>
                  <p className="font-serif text-warm-800 leading-loose flex-1 text-base">
                    {theirs.content}
                  </p>
                  <p className="text-xs text-warm-700/30 mt-4">
                    {formatTime(theirs.submitted_at)}
                  </p>
                </div>
                <CommentSection
                  entryId={theirs.id}
                  coupleId={coupleId}
                  comments={comments.filter(c => c.entry_id === theirs.id)}
                  myUserId={session.user.id}
                  myName={myName}
                  partnerName={partnerName}
                  onAdded={handleCommentAdded}
                  onDeleted={handleCommentDeleted}
                />
              </div>
            </div>

            <div className="flex justify-center pt-2">
              <button
                onClick={() => setCurrent(prev => pickRandom(dates, prev))}
                disabled={dayLoading}
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/70 border border-blush-200
                           text-blush-500 text-sm font-medium shadow-sm
                           hover:bg-blush-100/60 active:scale-[0.98] transition-all duration-200
                           disabled:opacity-50"
              >
                <SparkleIcon className="w-4 h-4" />
                Another memory
              </button>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
