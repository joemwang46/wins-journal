import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import CommentSection from './CommentSection'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function pad(n) {
  return String(n).padStart(2, '0')
}

function toDateString(year, month, day) {
  return `${year}-${pad(month + 1)}-${pad(day)}`
}

function getLocalDateString() {
  const d = new Date()
  return toDateString(d.getFullYear(), d.getMonth(), d.getDate())
}

function formatSheetDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
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

function EntryBlock({ entry, name, coupleId, comments, myUserId, myName, partnerName, onAdded, onDeleted }) {
  return (
    <div>
      <div className="card p-4 flex flex-col">
        <p className="text-xs uppercase tracking-wider text-blush-300 font-medium mb-2">
          {name}
        </p>
        <p className="font-serif text-warm-800 leading-relaxed text-sm flex-1">
          {entry.content}
        </p>
        <p className="text-xs text-warm-700/30 mt-3">
          {formatTime(entry.submitted_at)}
        </p>
      </div>
      <CommentSection
        entryId={entry.id}
        coupleId={coupleId}
        comments={comments.filter(c => c.entry_id === entry.id)}
        myUserId={myUserId}
        myName={myName}
        partnerName={partnerName}
        onAdded={onAdded}
        onDeleted={onDeleted}
      />
    </div>
  )
}

// ── Day detail sheet ─────────────────────────────────────────
function DaySheet({ date, coupleId, myUserId, myName, partnerName, onClose }) {
  const [loading, setLoading]   = useState(true)
  const [mine, setMine]         = useState(null)
  const [theirs, setTheirs]     = useState(null)
  const [comments, setComments] = useState([])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: entries } = await supabase
        .from('entries')
        .select('*')
        .eq('couple_id', coupleId)
        .eq('entry_date', date)

      if (entries) {
        setMine(entries.find(e => e.user_id === myUserId) ?? null)
        setTheirs(entries.find(e => e.user_id !== myUserId) ?? null)

        const entryIds = entries.map(e => e.id)
        if (entryIds.length) {
          const { data: commentRows } = await supabase
            .from('comments')
            .select('*')
            .in('entry_id', entryIds)
            .order('created_at')
          if (commentRows) setComments(commentRows)
        }
      }
      setLoading(false)
    }
    load()
  }, [date, coupleId, myUserId])

  function handleCommentAdded(comment) {
    setComments(prev => prev.some(c => c.id === comment.id) ? prev : [...prev, comment])
  }

  function handleCommentDeleted(id) {
    setComments(prev => prev.filter(c => c.id !== id))
  }

  const entryBlockProps = {
    coupleId,
    comments,
    myUserId,
    myName,
    partnerName,
    onAdded: handleCommentAdded,
    onDeleted: handleCommentDeleted,
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-warm-900/30 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="absolute inset-x-0 bottom-0 max-h-[85vh] bg-cream-50 rounded-t-3xl shadow-xl animate-sheet-up flex flex-col">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-cream-300" />
        </div>

        <div className="flex items-center justify-between px-5 pb-3">
          <h3 className="font-serif text-lg text-warm-800">
            {formatSheetDate(date)}
          </h3>
          <button
            onClick={onClose}
            className="w-9 h-9 -mr-1 rounded-full flex items-center justify-center text-warm-700/50
                       hover:bg-cream-200 active:scale-95 transition-all duration-200"
            aria-label="Close"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div
          className="overflow-y-auto px-5"
          style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
        >
          {loading && (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 rounded-full border-2 border-cream-300 border-t-blush-300 animate-spin" />
            </div>
          )}

          {!loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              {mine   && <EntryBlock entry={mine}   name={myName || 'You'} {...entryBlockProps} />}
              {theirs && <EntryBlock entry={theirs} name={partnerName || 'Your partner'} {...entryBlockProps} />}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Calendar view ────────────────────────────────────────────
export default function HistoryCalendar({ coupleId, myUserId, myName, partnerName }) {
  const now = new Date()
  const todayStr = getLocalDateString()

  const [month, setMonth]               = useState(new Date(now.getFullYear(), now.getMonth(), 1))
  const [markedDays, setMarkedDays]     = useState(new Set())
  const [loadingMonth, setLoadingMonth] = useState(true)
  const [selectedDate, setSelectedDate] = useState(null)

  const year = month.getFullYear()
  const monthIdx = month.getMonth()
  const isCurrentMonth = year === now.getFullYear() && monthIdx === now.getMonth()

  useEffect(() => {
    async function loadMonth() {
      setLoadingMonth(true)
      const start = toDateString(year, monthIdx, 1)
      const end = toDateString(year, monthIdx, new Date(year, monthIdx + 1, 0).getDate())

      const { data } = await supabase
        .from('entries')
        .select('entry_date, user_id')
        .eq('couple_id', coupleId)
        .gte('entry_date', start)
        .lte('entry_date', end)

      const usersByDate = {}
      for (const row of data ?? []) {
        (usersByDate[row.entry_date] ??= new Set()).add(row.user_id)
      }
      setMarkedDays(new Set(
        Object.entries(usersByDate)
          .filter(([, users]) => users.size >= 2)
          .map(([date]) => date)
      ))
      setLoadingMonth(false)
    }
    loadMonth()
  }, [coupleId, year, monthIdx])

  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate()
  const firstWeekday = new Date(year, monthIdx, 1).getDay()
  const cells = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div className="animate-fade-in">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setMonth(new Date(year, monthIdx - 1, 1))}
          className="w-10 h-10 rounded-full flex items-center justify-center text-warm-700/60
                     hover:bg-cream-200 active:scale-95 transition-all duration-200"
          aria-label="Previous month"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <p className="font-serif text-warm-800">
          {month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </p>

        <button
          onClick={() => setMonth(new Date(year, monthIdx + 1, 1))}
          disabled={isCurrentMonth}
          className="w-10 h-10 rounded-full flex items-center justify-center text-warm-700/60
                     hover:bg-cream-200 active:scale-95 transition-all duration-200
                     disabled:opacity-30 disabled:pointer-events-none"
          aria-label="Next month"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d, i) => (
          <p key={i} className="text-center text-xs text-warm-700/40 font-medium py-1">
            {d}
          </p>
        ))}
      </div>

      {/* Day grid */}
      <div className={`grid grid-cols-7 transition-opacity duration-200 ${loadingMonth ? 'opacity-50 pointer-events-none' : ''}`}>
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />

          const dateStr = toDateString(year, monthIdx, day)
          const isMarked = markedDays.has(dateStr)
          const isToday = dateStr === todayStr

          return (
            <div key={i} className="flex items-center justify-center aspect-square">
              {isMarked ? (
                <button
                  onClick={() => setSelectedDate(dateStr)}
                  className="w-10 h-10 rounded-full bg-blush-200/70 text-warm-800 text-sm font-medium
                             flex items-center justify-center
                             hover:bg-blush-200 active:scale-95 transition-all duration-200"
                >
                  {day}
                </button>
              ) : (
                <span
                  className={`w-10 h-10 flex items-center justify-center text-sm ${
                    isToday ? 'text-blush-400 font-medium' : 'text-warm-700/40'
                  }`}
                >
                  {day}
                </span>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-xs text-warm-700/40 text-center mt-5">
        Highlighted days have wins from both of you — tap one to revisit it.
      </p>

      {selectedDate && (
        <DaySheet
          date={selectedDate}
          coupleId={coupleId}
          myUserId={myUserId}
          myName={myName}
          partnerName={partnerName}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  )
}
