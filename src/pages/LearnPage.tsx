import { Navigate } from 'react-router-dom'
import { LearnProgram } from '../components/LearnProgram'
import { useAuth } from '../context/AuthContext'

export function LearnPage() {
  const { token, me, profile, loading, logout, refreshMe } = useAuth()

  if (!loading && !token) {
    return <Navigate to="/login" replace />
  }

  if (!loading && me && !me.onboardingComplete) {
    return <Navigate to="/signup" replace />
  }

  if (loading || !profile) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-zinc-950 text-zinc-400">
        Loading your program…
      </div>
    )
  }

  const isFresherTrack = profile.learningPath === 'basic'

  return (
    <div className="min-h-svh bg-gradient-to-br from-zinc-950 via-violet-950/25 to-zinc-950 px-4 py-10 text-zinc-100">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-amber-400/90">
              Program
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white">
              Hi, {profile.name}
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              {profile.roadmapTemplateId === 'data-analytics'
                ? 'Data & analytics track'
                : `${profile.coreStack} · ${profile.primaryFocus}`}
              {profile.studyLevel ? (
                <>
                  {' '}
                  · Student level:{' '}
                  <span className="text-zinc-200">{profile.studyLevel}</span>
                </>
              ) : null}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
              onClick={() => void refreshMe()}
            >
              Refresh
            </button>
            <button
              type="button"
              className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800"
              onClick={() => logout()}
            >
              Log out
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-4 rounded-2xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur">
          <div
            className={`rounded-xl border p-4 ${
              isFresherTrack
                ? 'border-emerald-500/40 bg-emerald-950/20'
                : 'border-amber-500/40 bg-amber-950/20'
            }`}
          >
            <p className="text-sm font-semibold text-white">
              Experience: {profile.experienceStage ?? '—'}
            </p>
            <p className="mt-2 text-sm text-zinc-300">
              {isFresherTrack ? (
                <>
                  <strong className="text-emerald-200">Fresher track</strong> —
                  gentler pacing; complete units with videos + practice below.
                </>
              ) : (
                <>
                  <strong className="text-amber-200">Standard track</strong> —
                  practice quizzes after each unit; milestone certificates every
                  three units.
                </>
              )}
            </p>
          </div>

          {profile.clientGoal ? (
            <div>
              <p className="text-xs font-medium uppercase text-zinc-500">
                Your goal
              </p>
              <p className="mt-1 text-sm text-zinc-300">{profile.clientGoal}</p>
            </div>
          ) : null}

          <div>
            <p className="text-xs font-medium uppercase text-zinc-500">
              Skills (resume / catalog)
            </p>
            {profile.skills.length ? (
              <ul className="mt-2 flex flex-wrap gap-2">
                {profile.skills.map((s) => (
                  <li
                    key={s.name}
                    className="rounded-full border border-zinc-600 bg-zinc-950/60 px-3 py-1 text-xs text-zinc-200"
                  >
                    {s.name}{' '}
                    <span className="text-zinc-500">({s.level})</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-zinc-500">
                None on file (allowed for Fresher).
              </p>
            )}
          </div>
        </div>

        {token ? (
          <LearnProgram
            token={token}
            profile={profile}
            onSyncProfile={() => void refreshMe()}
          />
        ) : null}

        <p className="mt-8 text-center text-xs text-zinc-600">
          Run <code className="text-zinc-500">npm run dev:full</code> for UI + API
          (port 3001). Set <code className="text-zinc-500">OPENAI_API_KEY</code>{' '}
          for live AI answers.
        </p>
      </div>
    </div>
  )
}
