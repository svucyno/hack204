import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function SettingsPage() {
  const { me, profile, logout } = useAuth()

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
          <Link to="/resume" className="hover:text-white">Resume</Link>
          <Link to="/settings" className="text-zinc-200 hover:text-white">Settings</Link>
          <div className="text-zinc-500 ml-4">{me?.email || 'user@example.com'}</div>
          <button onClick={() => logout()} className="text-red-400 hover:text-red-300 ml-2 font-medium">
            Logout
          </button>
        </nav>
      </header>

      <main className="flex-1 max-w-[800px] w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-200">Account Settings</h1>
          <p className="text-zinc-400 mt-2">Manage your profile, adjust your learning configuration, and view your active track.</p>
        </div>

        {/* Profile Info */}
        <div className="rounded-2xl border border-white/5 bg-[#121218] p-8 shadow-lg">
          <h2 className="text-xl font-bold text-white mb-6 border-b border-white/5 pb-4">Personal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Full Name</label>
              <div className="text-zinc-200 text-lg bg-zinc-900/50 px-4 py-3 rounded-xl border border-white/5">{me?.name || profile?.name || 'User'}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Email Address</label>
              <div className="text-zinc-200 text-lg bg-zinc-900/50 px-4 py-3 rounded-xl border border-white/5">{me?.email || 'user@example.com'}</div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Career Goal</label>
              <div className="text-zinc-200 bg-zinc-900/50 px-4 py-3 rounded-xl border border-white/5 min-h-[60px]">{profile?.clientGoal || 'No specific goal set'}</div>
            </div>
          </div>
        </div>

        {/* Learning Configuration */}
        <div className="rounded-2xl border border-white/5 bg-[#121218] p-8 shadow-lg">
          <h2 className="text-xl font-bold text-white mb-6 border-b border-white/5 pb-4">Learning Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-1 p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
              <span className="text-xs font-medium text-violet-400 uppercase tracking-wider">Experience Stage</span>
              <span className="text-xl font-bold text-zinc-200 capitalize">{profile?.experienceStage || 'Beginner'}</span>
            </div>
            
            <div className="flex flex-col gap-1 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <span className="text-xs font-medium text-orange-400 uppercase tracking-wider">Daily Bandwidth</span>
              <span className="text-xl font-bold text-zinc-200">{profile?.dailyBandwidth || 4} Hours / Day</span>
            </div>
            
            <div className="flex flex-col gap-1 p-4 rounded-xl bg-sky-500/10 border border-sky-500/20">
              <span className="text-xs font-medium text-sky-400 uppercase tracking-wider">Core Tech Stack</span>
              <span className="text-xl font-bold text-zinc-200">{profile?.coreStack || 'MERN Stack'}</span>
            </div>
            
            <div className="flex flex-col gap-1 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Current Focus</span>
              <span className="text-xl font-bold text-zinc-200">{profile?.primaryFocus || 'Full-Stack Development'}</span>
            </div>
          </div>
        </div>

        {/* Saved Skills */}
        <div className="rounded-2xl border border-white/5 bg-[#121218] p-8 shadow-lg">
          <h2 className="text-xl font-bold text-white mb-6 border-b border-white/5 pb-4">Registered Skills</h2>
          {profile?.skills && profile.skills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((s, i) => {
                const name = typeof s === 'string' ? s : s.name
                return (
                  <span key={name + i} className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-300 border border-white/10">
                    {name}
                  </span>
                )
              })}
            </div>
          ) : (
            <p className="text-zinc-500 text-sm">No skills explicitly registered. Complete your profile or take exams to accumulate skills.</p>
          )}
        </div>
      </main>
    </div>
  )
}
