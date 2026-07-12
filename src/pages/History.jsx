import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import BottomNav from '../components/BottomNav'
import CommentSection from '../components/CommentSection'
import HistoryCalendar from '../components/HistoryCalendar'

const VIEW_STORAGE_KEY = 'wins-history-view'

function parseLocalDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatHistoryDate(dateStr) {
  return parseLocalDate(dateStr).toLocaleDateString('en-US', {
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

function getLocalDateString() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function groupIntoDays(entries, userId) {
  const byDate = {}
  for (const entry of entries) {
    if (!byDate[entry.entry_date]) byDate[entry.entry_date] = {}
    if (entry.user_id === userId) byDate[entry.entry_date].mine = entry
    else byDate[entry.entry_date].theirs = entry
  }
  return Object.entries(byDate)
    .filter(([, pair]) => pair.mine && pair.theirs)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, pair]) => ({ date, mine: pair.mine, theirs: pair.theirs }))
}

// 31 days × 2 entries. lte on cursor + client dedup handles batch-boundary splits.
const BATCH = 62

// ── Skeleton ─────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="card p-4 space-y-3">
      <div className="skeleton h-2.5 w-14 rounded-full" />
      <div className="space-y-2">
        <div className="skeleton h-3 rounded-full" />
        <div className="skeleton h-3 rounded-full w-5/6" />
        <div className="skeleton h-3 rounded-full w-4/6" />
      </div>
      <div className="skeleton h-2 w-14 rounded-full" />
    </div>
  )
}

function HistorySkeleton() {
  return (
    <div className="space-y-7">
      {[0, 1, 2].map(i => (
        <div key={i} className="space-y-3">
          <div className="skeleton h-2.5 w-36 rounded-full" />
          <div className="grid grid-cols-1 gap-3">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function History() {
  const { session, coupleId } = useAuth()
  const todayDate = getLocalDateString()

  const [days, setDays]             = useState([])
  const [loading, setLoading]       = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore]       = useState(true)
  const [cursor, setCursor]         = useState(null)
  const [myName, setMyName]         = useState('')
  const [partnerName, setPartnerName] = useState('')
  const [commentsByEntry, setCommentsByEntry] = useState({})
  const [view, setViewState] = useState(() => sessionStorage.getItem(VIEW_STORAGE_KEY) ?? 'timeline')

  function setView(v) {
    setViewState(v)
    sessionStorage.setItem(VIEW_STORAGE_KEY, v)
  }

  useEffect(() => {
    supabase.from('profiles').select('user_id, display_name').then(({ data }) => {
      if (!data) return
      setMyName(data.find(p => p.user_id === session.user.id)?.display_name ?? '')
      setPartnerName(data.find(p => p.user_id !== session.user.id)?.display_name ?? '')
    })
  }, [coupleId, session.user.id])

  useEffect(() => { fetchPage(null) }, [])

  async function fetchPage(cursorDate) {
    const isInitial = cursorDate === null
    isInitial ? setLoading(true) : setLoadingMore(true)

    let query = supabase
      .from('entries')
      .select('*')
      .eq('couple_id', coupleId)
      .order('entry_date', { ascending: false })
      .limit(BATCH)

    if (isInitial) query = query.lt('entry_date', todayDate)
    else           query = query.lte('entry_date', cursorDate)

    const { data } = await query

    if (data?.length) {
      const paired = groupIntoDays(data, session.user.id)

      const entryIds = paired.flatMap(d => [d.mine.id, d.theirs.id])
      if (entryIds.length) {
        const { data: commentRows } = await supabase
          .from('comments')
          .select('*')
          .in('entry_id', entryIds)
          .order('created_at')
        if (commentRows) {
          const grouped = {}
          for (const c of commentRows) (grouped[c.entry_id] ??= []).push(c)
          setCommentsByEntry(prev => ({ ...prev, ...grouped }))
        }
      }

      setDays(prev => {
        if (isInitial) return paired
        const seen = new Set(prev.map(d => d.date))
        return [...prev, ...paired.filter(d => !seen.has(d.date))]
      })
      setCursor(data[data.length - 1].entry_date)
      if (data.length < BATCH) setHasMore(false)
    } else {
      if (isInitial) setDays([])
      setHasMore(false)
    }

    isInitial ? setLoading(false) : setLoadingMore(false)
  }

  function handleCommentAdded(comment) {
    setCommentsByEntry(prev => {
      const existing = prev[comment.entry_id] ?? []
      if (existing.some(c => c.id === comment.id)) return prev
      return { ...prev, [comment.entry_id]: [...existing, comment] }
    })
  }

  function handleCommentDeleted(entryId, id) {
    setCommentsByEntry(prev => ({
      ...prev,
      [entryId]: (prev[entryId] ?? []).filter(c => c.id !== id),
    }))
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
        className="flex-1 px-5 pt-1 overflow-y-auto"
        style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}
      >
        <h2 className="text-2xl font-serif text-warm-800 mb-4">History</h2>

        {/* ── View toggle ──────────────────────────────────── */}
        <div className="flex bg-cream-100 border border-cream-200 rounded-2xl p-1 mb-5">
          {['timeline', 'calendar'].map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                view === v
                  ? 'bg-white/80 shadow-sm text-warm-800'
                  : 'text-warm-700/50'
              }`}
            >
              {v === 'timeline' ? 'Timeline' : 'Calendar'}
            </button>
          ))}
        </div>

        {/* ── Calendar view ────────────────────────────────── */}
        {view === 'calendar' && (
          <HistoryCalendar
            coupleId={coupleId}
            myUserId={session.user.id}
            myName={myName}
            partnerName={partnerName}
          />
        )}

        {/* ── Skeleton while loading ───────────────────────── */}
        {view === 'timeline' && loading && <HistorySkeleton />}

        {/* ── Empty state ──────────────────────────────────── */}
        {view === 'timeline' && !loading && days.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
            <svg className="w-10 h-10 text-blush-200 mb-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            <p className="text-warm-700/50 text-sm">
              Your shared memories will appear here.
            </p>
          </div>
        )}

        {/* ── Timeline ─────────────────────────────────────── */}
        {view === 'timeline' && !loading && days.length > 0 && (
          <div className="animate-fade-in">
            {days.map(({ date, mine, theirs }, i) => (
              <div key={date}>
                <p className="text-xs font-medium text-warm-700/50 uppercase tracking-wider mb-3">
                  {formatHistoryDate(date)}
                </p>

                <div className="grid grid-cols-1 gap-3 mb-4">
                  <div>
                    <div className="card p-4 flex flex-col">
                      <p className="text-xs uppercase tracking-wider text-blush-300 font-medium mb-2">
                        {myName || 'You'}
                      </p>
                      <p className="font-serif text-warm-800 leading-relaxed text-sm flex-1">
                        {mine.content}
                      </p>
                      <p className="text-xs text-warm-700/30 mt-3">
                        {formatTime(mine.submitted_at)}
                      </p>
                    </div>
                    <CommentSection
                      entryId={mine.id}
                      coupleId={coupleId}
                      comments={commentsByEntry[mine.id] ?? []}
                      myUserId={session.user.id}
                      myName={myName}
                      partnerName={partnerName}
                      onAdded={handleCommentAdded}
                      onDeleted={id => handleCommentDeleted(mine.id, id)}
                    />
                  </div>

                  <div>
                    <div className="card p-4 flex flex-col">
                      <p className="text-xs uppercase tracking-wider text-blush-300 font-medium mb-2">
                        {partnerName || 'Your partner'}
                      </p>
                      <p className="font-serif text-warm-800 leading-relaxed text-sm flex-1">
                        {theirs.content}
                      </p>
                      <p className="text-xs text-warm-700/30 mt-3">
                        {formatTime(theirs.submitted_at)}
                      </p>
                    </div>
                    <CommentSection
                      entryId={theirs.id}
                      coupleId={coupleId}
                      comments={commentsByEntry[theirs.id] ?? []}
                      myUserId={session.user.id}
                      myName={myName}
                      partnerName={partnerName}
                      onAdded={handleCommentAdded}
                      onDeleted={id => handleCommentDeleted(theirs.id, id)}
                    />
                  </div>
                </div>

                {i < days.length - 1 && (
                  <div className="border-t border-cream-200 mb-5" />
                )}
              </div>
            ))}

            {hasMore && (
              <div className="pt-4 pb-2">
                <button
                  onClick={() => fetchPage(cursor)}
                  disabled={loadingMore}
                  className="w-full py-3.5 px-4 rounded-2xl border border-cream-200 text-warm-700/60
                             text-sm font-medium hover:bg-cream-100 active:scale-[0.98]
                             transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
