import { useState } from 'react'
import { supabase } from '../lib/supabase'

const MAX_CHARS = 500

function timeAgo(ts) {
  const secs = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (secs < 60) return 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function CommentSection({
  entryId,
  coupleId,
  comments,
  myUserId,
  myName,
  partnerName,
  onAdded,
  onDeleted,
}) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  async function handleSend(e) {
    e.preventDefault()
    const content = text.trim()
    if (!content || sending) return

    setError('')
    setSending(true)

    const { data, error: insertError } = await supabase
      .from('comments')
      .insert({
        entry_id:       entryId,
        author_user_id: myUserId,
        couple_id:      coupleId,
        content,
      })
      .select()
      .single()

    if (insertError) {
      setError("Couldn't send — try again.")
    } else {
      onAdded(data)
      setText('')
    }
    setSending(false)
  }

  async function handleDelete(id) {
    const { error: deleteError } = await supabase
      .from('comments')
      .delete()
      .eq('id', id)
    if (!deleteError) onDeleted(id)
  }

  return (
    <div className="ml-4 mt-2 space-y-1.5">
      {comments.map(c => (
        <div key={c.id} className="bg-cream-100 rounded-xl px-3 py-2">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-xs font-medium text-blush-300">
              {c.author_user_id === myUserId ? (myName || 'You') : (partnerName || 'Your partner')}
              <span className="ml-1.5 font-normal text-warm-700/30">{timeAgo(c.created_at)}</span>
            </p>
            {c.author_user_id === myUserId && (
              <button
                onClick={() => handleDelete(c.id)}
                className="text-warm-700/25 hover:text-blush-400 text-xs leading-none p-1 -m-1 transition-colors"
                aria-label="Delete comment"
              >
                ✕
              </button>
            )}
          </div>
          <p className="text-sm text-warm-800 leading-relaxed mt-0.5">{c.content}</p>
        </div>
      ))}

      <form onSubmit={handleSend} className="flex items-center gap-2">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value.slice(0, MAX_CHARS))}
          maxLength={MAX_CHARS}
          placeholder="Leave a note…"
          className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-cream-100 border border-cream-200
                     text-base text-warm-800 placeholder-warm-700/40
                     focus:outline-none focus:ring-2 focus:ring-blush-200 focus:border-blush-200
                     transition-all duration-200"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          aria-label="Send comment"
          className="w-10 h-10 shrink-0 rounded-full bg-blush-300 text-white flex items-center justify-center
                     disabled:opacity-40 active:scale-95 transition-all duration-200"
        >
          <svg className="w-4 h-4 translate-x-px" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </form>

      {error && <p className="text-xs text-blush-500 px-1">{error}</p>}
    </div>
  )
}
