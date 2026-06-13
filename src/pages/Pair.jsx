import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export default function Pair() {
  const { refreshCouple } = useAuth()
  const [tab, setTab] = useState('create')

  // Create tab
  const [code, setCode] = useState(null)
  const [codeLoading, setCodeLoading] = useState(false)
  const [codeError, setCodeError] = useState('')
  const [copied, setCopied] = useState(false)

  // Join tab
  const [inputCode, setInputCode] = useState('')
  const [joinLoading, setJoinLoading] = useState(false)
  const [joinError, setJoinError] = useState('')

  useEffect(() => {
    if (tab === 'create' && !code && !codeLoading) {
      fetchCode()
    }
  }, [tab])

  async function fetchCode() {
    setCodeLoading(true)
    setCodeError('')
    const { data, error } = await supabase.rpc('create_invite_code')
    if (error) {
      setCodeError('Could not generate a code. Please try again.')
    } else {
      setCode(data)
    }
    setCodeLoading(false)
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard unavailable — user can select manually
    }
  }

  async function handleJoin(e) {
    e.preventDefault()
    setJoinError('')
    setJoinLoading(true)

    const { data, error } = await supabase.rpc('join_couple_with_code', {
      p_code: inputCode.trim().toUpperCase(),
    })

    if (error || data?.error) {
      setJoinError(data?.error ?? 'Something went wrong. Please try again.')
      setJoinLoading(false)
      return
    }

    const newCoupleId = await refreshCouple()
    if (!newCoupleId) {
      // Extremely unlikely — DB said ok but query returned nothing. Hard reload as fallback.
      window.location.replace('/')
    }
    // AuthRoute re-renders with new coupleId and redirects to /
  }

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm animate-slide-up">

        {/* Header */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-14 h-14 bg-blush-100 rounded-3xl flex items-center justify-center mb-4 shadow-sm">
            <svg className="w-7 h-7 text-blush-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
          <h1 className="text-2xl font-serif text-warm-800">Connect with your partner</h1>
          <p className="text-sm text-warm-700/60 mt-1">Share a code to start journaling together</p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-cream-100 rounded-2xl p-1 mb-5">
          <button
            type="button"
            onClick={() => setTab('create')}
            className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
              tab === 'create'
                ? 'bg-white shadow-sm text-warm-800'
                : 'text-warm-700/60 hover:text-warm-700'
            }`}
          >
            Create a code
          </button>
          <button
            type="button"
            onClick={() => setTab('join')}
            className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
              tab === 'join'
                ? 'bg-white shadow-sm text-warm-800'
                : 'text-warm-700/60 hover:text-warm-700'
            }`}
          >
            Enter a code
          </button>
        </div>

        {/* Create tab */}
        {tab === 'create' && (
          <div className="card p-6 space-y-5 animate-fade-in">
            <p className="text-sm text-warm-700/60 text-center leading-relaxed">
              Share this code with your partner. It can only be used once.
            </p>

            {codeLoading && (
              <div className="flex justify-center py-6">
                <div className="w-6 h-6 rounded-full border-2 border-cream-300 border-t-blush-300 animate-spin" />
              </div>
            )}

            {codeError && !codeLoading && (
              <div className="text-center space-y-3 py-2">
                <p className="text-sm text-blush-500">{codeError}</p>
                <button type="button" onClick={fetchCode} className="text-sm text-blush-400 underline underline-offset-2">
                  Try again
                </button>
              </div>
            )}

            {code && !codeLoading && (
              <>
                <div className="bg-cream-100 rounded-2xl py-6 px-4 text-center select-all">
                  <span className="font-mono text-4xl font-bold tracking-[0.3em] text-warm-800">
                    {code}
                  </span>
                </div>
                <button type="button" onClick={handleCopy} className="btn-primary">
                  {copied ? '✓  Copied!' : 'Copy code'}
                </button>
              </>
            )}
          </div>
        )}

        {/* Join tab */}
        {tab === 'join' && (
          <form onSubmit={handleJoin} className="card p-6 space-y-4 animate-fade-in">
            <p className="text-sm text-warm-700/60 text-center leading-relaxed">
              Enter the 6-character code your partner shared with you.
            </p>

            <input
              type="text"
              className="input-field text-center font-mono text-2xl tracking-[0.3em] uppercase"
              placeholder="XXXXXX"
              value={inputCode}
              onChange={e =>
                setInputCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))
              }
              maxLength={6}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              required
            />

            {joinError && (
              <p className="text-sm text-blush-500 bg-blush-100/60 rounded-xl px-3 py-2 text-center">
                {joinError}
              </p>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={joinLoading || inputCode.length !== 6}
            >
              {joinLoading ? 'Connecting…' : 'Connect with partner'}
            </button>
          </form>
        )}

      </div>
    </div>
  )
}
