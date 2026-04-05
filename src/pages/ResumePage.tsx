import { useState } from 'react'
import { Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { useAuth } from '../context/AuthContext'
import { apiGenerateResume } from '../lib/api'

export function ResumePage() {
  const { me, profile, token, logout } = useAuth()
  const [resumeText, setResumeText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    if (!token || !profile) return
    setLoading(true)
    setError(null)
    setResumeText('')
    try {
      const result = await apiGenerateResume(token, {
        goal: profile.clientGoal || 'General Tech Role',
        skills: profile.skills ? profile.skills.map(s => typeof s === 'string' ? s : s.name) : [],
        name: me?.name || 'User',
        experienceStage: profile.experienceStage || 'Beginner'
      })
      setResumeText(result.resumeMarkdown)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error generating resume')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-svh bg-[#09090b] text-zinc-100 flex flex-col font-sans relative pb-10">
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#09090b]">
        <div className="text-cyan-500 font-bold text-xl tracking-tight">Cynosure Learning</div>
        <nav className="hidden md:flex items-center gap-6 text-sm text-zinc-400">
          <Link to="/dashboard" className="hover:text-white">Dashboard</Link>
          <Link to="/learn" className="hover:text-white">Roadmap</Link>
          <Link to="/mentor" className="hover:text-white">Mentor</Link>
          <Link to="/reports" className="hover:text-white">Reports</Link>
          <Link to="/jobs" className="hover:text-white">Jobs</Link>
          <Link to="/resume" className="text-zinc-200 hover:text-white">Resume</Link>
          <Link to="/settings" className="hover:text-white">Settings</Link>
          <div className="text-zinc-500 ml-4">{me?.email || 'user@example.com'}</div>
          <button onClick={() => logout()} className="text-red-400 hover:text-red-300 ml-2 font-medium">
            Logout
          </button>
        </nav>
      </header>

      <main className="flex-1 max-w-[900px] w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-zinc-200 mb-2">ATS-Friendly Resume Builder</h1>
          <p className="text-zinc-400">Generate a professional, fully-formatted ATS resume tailored to your specific goals and skills.</p>
        </div>

        <div className="flex justify-center mt-2">
          <button 
            onClick={handleGenerate}
            disabled={loading}
            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-sm font-bold text-zinc-950 shadow-lg transition hover:from-amber-400 hover:to-orange-400 disabled:opacity-50"
          >
            {loading ? 'Generating Resume with AI...' : 'Generate New Resume'}
          </button>
        </div>

        {error && (
          <div className="mt-4 border border-red-500/20 bg-red-500/10 text-red-400 px-4 py-3 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        {resumeText && (
          <div className="mt-8 relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/40 shadow-2xl backdrop-blur-xl">
            <div className="flex justify-between items-center bg-zinc-900/80 px-6 py-3 border-b border-white/5">
              <span className="text-xs font-medium uppercase tracking-wider text-emerald-400">ATS Optimized Result</span>
              <button 
                onClick={() => navigator.clipboard.writeText(resumeText)}
                className="text-xs text-zinc-400 hover:text-zinc-200"
              >
                Copy Markdown
              </button>
            </div>
            <div className="p-8 prose prose-invert prose-zinc max-w-none text-zinc-300 marker:text-amber-500 
              prose-h1:text-amber-500 prose-h1:text-2xl prose-h1:border-b prose-h1:border-white/10 prose-h1:pb-2
              prose-h2:text-orange-400 prose-h2:text-xl prose-h2:mt-6
              prose-h3:text-cyan-400 prose-h3:text-lg
              prose-strong:text-zinc-200">
              <ReactMarkdown>{resumeText}</ReactMarkdown>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
