import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const BTN =
  'w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 text-sm font-semibold text-zinc-950 shadow-lg hover:from-amber-400 hover:to-orange-400'
const INPUT =
  'mt-1.5 w-full rounded-xl border border-zinc-600/80 bg-zinc-950/80 px-4 py-2.5 text-zinc-100 outline-none focus:border-amber-500/50 focus:ring-2 ring-amber-500/30'

export function LoginPage() {
  const { token, me, loading, login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)

  if (!loading && token && me) {
    if (me.onboardingComplete) return <Navigate to="/dashboard" replace />
    return <Navigate to="/signup" replace />
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    try {
      await login(email.trim().toLowerCase(), password)
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Login failed')
    }
  }

  return (
    <div className="min-h-svh bg-gradient-to-br from-zinc-950 via-violet-950/35 to-zinc-950 px-4 py-16 text-zinc-100">
      <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-zinc-900/40 p-8 shadow-2xl backdrop-blur-xl">
        <h1 className="text-xl font-semibold text-white">Log in</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Enforced learning · Fresher track has no daily exams
        </p>
        <form className="mt-8 space-y-4 text-left" onSubmit={onSubmit}>
          <label className="block text-sm text-zinc-300">
            Email
            <input
              type="email"
              required
              autoComplete="email"
              className={INPUT}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="block text-sm text-zinc-300">
            Password
            <input
              type="password"
              required
              autoComplete="current-password"
              className={INPUT}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {err ? (
            <p className="text-sm text-red-400">{err}</p>
          ) : null}
          <button type="submit" className={BTN}>
            Continue
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-zinc-500">
          No account?{' '}
          <Link className="text-amber-400 underline" to="/signup">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
