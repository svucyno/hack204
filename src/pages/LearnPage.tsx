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
    <div className="min-h-svh bg-[#09090b] text-zinc-100 flex flex-col font-sans relative pb-10">
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#09090b]">
        <div className="text-cyan-500 font-bold text-xl tracking-tight">Cynosure Learning</div>
        <nav className="hidden md:flex items-center gap-6 text-sm text-zinc-400">
          <Link to="/dashboard" className="hover:text-white">Dashboard</Link>
          <Link to="/learn" className="text-zinc-200 hover:text-white">Roadmap</Link>
          <Link to="/interview" className="hover:text-white">Interview</Link>
          <Link to="/mentor" className="hover:text-white">Mentor</Link>
          <Link to="/reports" className="hover:text-white">Reports</Link>
          <Link to="/jobs" className="hover:text-white">Jobs</Link>
          <Link to="/resume" className="hover:text-white">Resume</Link>
          <Link to="/settings" className="hover:text-white">Settings</Link>
          <div className="text-zinc-500 ml-4">{me?.email || 'user@example.com'}</div>
          <button onClick={() => logout()} className="text-red-400 hover:text-red-300 ml-2 font-medium">
            Logout
          </button>
        </nav>
      </header>

      <main className="flex-1 max-w-[1200px] w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6 mt-4">
        {/* Profile summary */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-zinc-200">{profile.name}'s Roadmap</h1>
            <p className="text-zinc-400 mt-2">
              {profile.roadmapTemplateId === 'data-analytics'
                ? 'Data & analytics'
                : `${profile.coreStack} · ${profile.primaryFocus}`}
              {profile.studyLevel ? (
                <span className="text-zinc-300"> · {profile.studyLevel}</span>
              ) : null}
              {isFresherTrack ? (
                <span className="text-emerald-400/90 ml-1">· Fresher</span>
              ) : null}
            </p>
            {profile.clientGoal ? (
              <p className="mt-1 max-w-xl text-sm text-zinc-500">
                Goal: {profile.clientGoal}
              </p>
            ) : null}
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              className="px-6 py-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-bold text-sm shadow-lg transition-colors text-center hover:bg-cyan-500/20"
              onClick={() => void refreshMe()}
            >
              Sync Progress
            </button>
          </div>
        </div>

        {profile.skills.length ? (
          <div className="flex flex-wrap gap-2 mb-2">
            {profile.skills.map((s) => (
              <span key={s.name} className="px-2.5 py-1 bg-zinc-800 text-zinc-300 text-xs font-medium rounded-md border border-white/5">
                {s.name} <span className="text-zinc-500 ml-1">({s.level})</span>
              </span>
            ))}
          </div>
        ) : null}
        
        <div className="rounded-2xl border border-white/5 bg-[#121218] p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-zinc-100">Career Outlook</h2>
            <button
              type="button"
              disabled={jobsLoading}
              onClick={() => void handleSuggestJobs()}
              className="px-4 py-2 rounded-xl bg-violet-600 text-white font-bold text-sm shadow-lg hover:bg-violet-500 disabled:opacity-50 transition-colors"
            >
              {jobsLoading ? 'Loading Insights...' : 'Suggest Jobs'}
            </button>
          </div>
          {jobsData && (
            <div className="grid gap-4 sm:grid-cols-3">
              {jobsData.map((job, i) => (
                <div key={i} className="rounded-xl border border-violet-500/20 bg-violet-950/20 p-4 transition-colors hover:border-violet-500/40">
                  <h3 className="text-sm font-bold text-violet-200">{job.title}</h3>
                  <p className="mt-2 text-xs text-zinc-400 leading-relaxed">{job.explanation}</p>
                </div>
              ))}
            </div>
          )}
          {!jobsData && (
             <p className="text-sm text-zinc-500">Discover personalized job recommendations matching your current learning focus. Click "Suggest Jobs" to run the AI analysis.</p>
          )}
        </div>

        {token ? (
          <LearnProgram
            token={token}
            profile={profile}
            onSyncProfile={() => void refreshMe()}
          />
        ) : null}
      </main>
    </div>
  )
}
