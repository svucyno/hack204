import { useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { LearnProgram } from '../components/LearnProgram'
import { useAuth } from '../context/AuthContext'
import { apiSuggestJobs } from '../lib/api'

export function LearnPage() {
  const { token, me, profile, loading, logout, refreshMe } = useAuth()
  
  const [jobsData, setJobsData] = useState<{ title: string; explanation: string }[] | null>(null)
  const [jobsLoading, setJobsLoading] = useState(false)

  const handleSuggestJobs = async () => {
    if (!token || !profile) return
    setJobsLoading(true)
    try {
      const skillsArray = profile.skills.map(s => s.name)
      const res = await apiSuggestJobs(token, { goal: profile.clientGoal || '', skills: skillsArray })
      setJobsData(res.jobs)
    } catch (e) {
      console.error(e)
    } finally {
      setJobsLoading(false)
    }
  }

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
            <Link
              to="/dashboard"
              className="rounded-lg border border-cyan-600/50 bg-cyan-950/30 px-3 py-1.5 text-xs font-semibold text-cyan-400 hover:bg-cyan-900/40 hover:text-cyan-300"
            >
              Dashboard
            </Link>
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
        
        <div className="mb-6 rounded-xl border border-white/10 bg-zinc-900/40 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-200">Career Outlook</h2>
            <button
              type="button"
              disabled={jobsLoading}
              onClick={() => void handleSuggestJobs()}
              className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
            >
              {jobsLoading ? 'Loading...' : 'Suggest Jobs'}
            </button>
          </div>
          {jobsData && (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {jobsData.map((job, i) => (
                <div key={i} className="rounded-lg border border-violet-500/20 bg-violet-950/20 p-3">
                  <h3 className="text-sm font-semibold text-violet-200">{job.title}</h3>
                  <p className="mt-1 text-xs text-zinc-400">{job.explanation}</p>
                </div>
              ))}
            </div>
          )}
        </div>

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
