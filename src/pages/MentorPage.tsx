import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const MOCK_MENTORS = [
  { name: 'Sarah Jenkins', role: 'Staff Software Engineer at Google', rating: 4.9, active: true, tags: ['React', 'System Design', 'Algorithms'], exp: '10 Yrs' },
  { name: 'Marcus Chen', role: 'Senior Data Architect at Amazon', rating: 4.8, active: true, tags: ['Data Engineering', 'Python', 'AWS'], exp: '7 Yrs' },
  { name: 'Elena Rodriguez', role: 'Lead Frontend Developer at Meta', rating: 5.0, active: false, tags: ['UI/UX', 'TypeScript', 'Next.js'], exp: '8 Yrs' },
  { name: 'Dr. James Holt', role: 'AI Researcher at OpenAI', rating: 4.9, active: true, tags: ['Machine Learning', 'PyTorch', 'Data Science'], exp: '12 Yrs' },
]

export function MentorPage() {
  const { me, logout } = useAuth()

  return (
    <div className="min-h-svh bg-[#09090b] text-zinc-100 flex flex-col font-sans relative pb-10">
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#09090b]">
        <div className="text-cyan-500 font-bold text-xl tracking-tight">Cynosure Learning</div>
        <nav className="hidden md:flex items-center gap-6 text-sm text-zinc-400">
          <Link to="/dashboard" className="hover:text-white">Dashboard</Link>
          <Link to="/learn" className="hover:text-white">Roadmap</Link>
          <Link to="/mentor" className="text-zinc-200 hover:text-white">Mentor</Link>
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

      <main className="flex-1 max-w-[1000px] w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-zinc-200">1-on-1 Mentorship</h1>
            <p className="text-zinc-400 mt-2">Connect with industry experts to accelerate your technical growth.</p>
          </div>
          <button className="px-6 py-2.5 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/30 font-bold text-sm shadow-lg transition-colors text-center hover:bg-violet-500/20">
            Apply as Mentor
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {MOCK_MENTORS.map((mentor, idx) => (
            <div key={idx} className="rounded-2xl border border-white/5 bg-[#121218] p-6 shadow-lg flex flex-col h-full hover:border-violet-500/30 transition-colors group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30 flex items-center justify-center">
                    <span className="text-violet-300 font-bold text-lg">{mentor.name.charAt(0)}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                      {mentor.name}
                      {mentor.active && <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>}
                    </h3>
                    <p className="text-xs text-zinc-400">{mentor.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded-lg">
                  <span className="text-amber-400 font-bold text-xs">{mentor.rating}</span>
                  <span className="text-amber-500 text-xs">★</span>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-6">
                {mentor.tags.map(tag => (
                  <span key={tag} className="px-2.5 py-1 bg-zinc-800 text-zinc-300 text-xs font-medium rounded-md border border-white/5">
                    {tag}
                  </span>
                ))}
                <span className="px-2.5 py-1 bg-violet-900/40 text-violet-300 text-xs font-semibold rounded-md border border-violet-500/20">
                  {mentor.exp}
                </span>
              </div>
              
              <div className="mt-auto grid grid-cols-2 gap-3">
                <button className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-semibold rounded-xl transition-colors border border-white/5">
                  View Profile
                </button>
                <button className={`w-full py-2.5 text-white text-sm font-bold rounded-xl transition-colors shadow-lg ${mentor.active ? 'bg-violet-500 hover:bg-violet-400 shadow-violet-500/20' : 'bg-zinc-700 cursor-not-allowed opacity-50'}`} disabled={!mentor.active}>
                  {mentor.active ? 'Book Session' : 'Unavailable'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
