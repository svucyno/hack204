import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiSuggestJobs } from '../lib/api'

type JobSuggestion = {
  title: string
  explanation: string
}

export function JobsPage() {
  const { me, profile, token, logout } = useAuth()
  const [jobs, setJobs] = useState<JobSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadJobs() {
      if (!token || !profile) return
      try {
        setLoading(true)
        const skills = profile.skills ? profile.skills.map(s => typeof s === 'string' ? s : s.name) : []
        const data = await apiSuggestJobs(token, { goal: profile.clientGoal || '', skills })
        setJobs(data.jobs || [])
      } catch (err) {
        setError('Failed to load job suggestions.')
      } finally {
        setLoading(false)
      }
    }
    loadJobs()
  }, [token, profile])

  return (
    <div className="min-h-svh bg-[#09090b] text-zinc-100 flex flex-col font-sans relative pb-10">
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#09090b]">
        <div className="text-cyan-500 font-bold text-xl tracking-tight">Cynosure Learning</div>
        <nav className="hidden md:flex items-center gap-6 text-sm text-zinc-400">
          <Link to="/dashboard" className="hover:text-white">Dashboard</Link>
          <Link to="/learn" className="hover:text-white">Roadmap</Link>
          <Link to="/mentor" className="hover:text-white">Mentor</Link>
          <Link to="/reports" className="hover:text-white">Reports</Link>
          <Link to="/jobs" className="text-zinc-200 hover:text-white">Jobs</Link>
          <Link to="/resume" className="hover:text-white">Resume</Link>
          <Link to="/settings" className="hover:text-white">Settings</Link>
          <div className="text-zinc-500 ml-4">{me?.email || 'user@example.com'}</div>
          <button onClick={() => logout()} className="text-red-400 hover:text-red-300 ml-2 font-medium">
            Logout
          </button>
        </nav>
      </header>

      <main className="flex-1 max-w-[1000px] w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-zinc-200">Job Matches</h1>
            <p className="text-zinc-400 mt-2">Personalized career opportunities based on your skills and learning goal.</p>
          </div>
          <Link 
            to="/resume" 
            className="px-6 py-2.5 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/30 hover:bg-orange-500/20 font-bold text-sm shadow-lg transition-colors text-center"
          >
            ATS Resume Builder
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        ) : error ? (
          <div className="border border-red-500/20 bg-red-500/10 text-red-400 px-4 py-3 rounded-lg text-sm text-center">
            {error}
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center p-8 border border-white/5 bg-[#121218] rounded-2xl">
            <p className="text-zinc-400">No specific jobs matched your profile yet. Try updating your goal or adding more skills!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {jobs.map((job, idx) => (
              <div key={idx} className="rounded-2xl border border-white/5 bg-[#121218] p-6 shadow-lg hover:shadow-cyan-900/10 hover:border-cyan-500/30 transition-all flex flex-col relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                <h3 className="text-lg font-bold text-zinc-100 mb-3">{job.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed mb-6 flex-1">{job.explanation}</p>
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 text-xs font-semibold rounded-md">High Match</span>
                  <span className="px-3 py-1 bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-md cursor-pointer hover:bg-zinc-700">View Details</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
