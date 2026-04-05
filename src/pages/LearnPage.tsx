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
    <div className="min-h-svh bg-gradient-to-br from-zinc-950 via-violet-950/25 to-zinc-950 px-4 py-6 text-zinc-100">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">{profile.name}</h1>
            <p className="mt-0.5 text-sm text-zinc-400">
              {profile.roadmapTemplateId === 'data-analytics'
                ? 'Data & analytics'
                : `${profile.coreStack} · ${profile.primaryFocus}`}
              {profile.studyLevel ? (
                <span className="text-zinc-300"> · {profile.studyLevel}</span>
              ) : null}
              {isFresherTrack ? (
                <span className="text-emerald-400/90"> · Fresher</span>
              ) : null}
            </p>
            {profile.clientGoal ? (
              <p className="mt-2 max-w-xl text-sm text-zinc-500">
                {profile.clientGoal}
              </p>
            ) : null}
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

        {profile.skills.length ? (
          <div className="mb-4 text-sm text-zinc-400">
            {profile.skills.map((s) => (
              <span key={s.name} className="mr-3 inline-block">
                <span className="text-zinc-200">{s.name}</span>
                <span className="text-zinc-500"> · {s.level}</span>
              </span>
            ))}
          </div>
        ) : null}

        {token ? (
          <LearnProgram
            token={token}
            profile={profile}
            onSyncProfile={() => void refreshMe()}
          />
        ) : null}
      </div>
    </div>
  )
}
