import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setConfirmed(true)
    }
  }

  if (confirmed) {
    return (
      <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm animate-slide-up text-center">
          <div className="w-16 h-16 bg-blush-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
            <svg className="w-8 h-8 text-blush-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h2 className="text-2xl font-serif text-warm-800 mb-2">Check your email</h2>
          <p className="text-warm-700/60 text-sm leading-relaxed">
            We sent a confirmation link to <span className="text-warm-800 font-medium">{email}</span>.
            Click it to activate your account.
          </p>
          <Link to="/login" className="inline-block mt-8 text-sm text-blush-400 font-medium hover:text-blush-500 transition-colors">
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm animate-slide-up">

        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-14 h-14 bg-blush-100 rounded-3xl flex items-center justify-center mb-4 shadow-sm">
            <svg className="w-7 h-7 text-blush-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
          <h1 className="text-2xl font-serif text-warm-800">Start your journal</h1>
          <p className="text-sm text-warm-700/60 mt-1">Capture what matters to you</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="text-xs font-medium text-warm-700/70 uppercase tracking-wider">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="input-field"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-xs font-medium text-warm-700/70 uppercase tracking-wider">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="input-field"
              placeholder="at least 6 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          {error && (
            <p className="text-sm text-blush-500 bg-blush-100/60 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <button type="submit" className="btn-primary mt-2" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-warm-700/60 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-blush-400 font-medium hover:text-blush-500 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
