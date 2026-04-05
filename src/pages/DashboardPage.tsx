import { Link } from 'react-router-dom'
import { Activity, Flame, Brain } from 'lucide-react'
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from 'recharts'
import { useAuth } from '../context/AuthContext'

const radarData = [
  { subject: 'general', A: 15, fullMark: 60 },
  { subject: 'frontend', A: 45, fullMark: 60 },
  { subject: 'backend', A: 30, fullMark: 60 },
  { subject: 'database', A: 60, fullMark: 60 },
  { subject: 'devops', A: 25, fullMark: 60 },
];

const marksData = [
  { date: 'Mon', daily: 65, avg: 70 },
  { date: 'Tue', daily: 72, avg: 70 },
  { date: 'Wed', daily: 85, avg: 72 },
  { date: 'Thu', daily: 78, avg: 73 },
  { date: 'Fri', daily: 90, avg: 76 },
  { date: 'Sat', daily: 88, avg: 78 },
  { date: 'Sun', daily: 95, avg: 82 },
];

export function DashboardPage() {
  const { me, logout } = useAuth()

  return (
    <div className="min-h-svh bg-[#09090b] text-zinc-100 flex flex-col font-sans relative pb-10">
      {/* Top Navbar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#09090b]">
        <div className="text-cyan-500 font-bold text-xl tracking-tight">Cynosure Learning</div>
        <nav className="hidden md:flex items-center gap-6 text-sm text-zinc-400">
          <Link to="/dashboard" className="text-zinc-200 hover:text-white">Dashboard</Link>
          <Link to="/learn" className="hover:text-white">Roadmap</Link>
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

      {/* Main Content */}
      <main className="flex-1 max-w-[1200px] w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-8 mt-4">

        {/* Banner */}
        <div className="rounded-2xl border border-white/5 bg-[#121218] p-6 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
          <p className="text-zinc-300 text-base sm:text-lg font-medium tracking-wide max-w-xl">
            Track your progress, overcome weaknesses, and act on AI suggestions.
          </p>
          <div className="flex flex-wrap gap-4 shrink-0">
            <button className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-3 font-bold text-white shadow-lg hover:shadow-orange-500/20 transition-all text-sm">
              Start Daily Exam
            </button>
            <Link to="/learn" className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-3 font-bold text-white shadow-lg hover:shadow-blue-500/20 transition-all text-sm block">
              View Roadmap
            </Link>
            <Link to="/resume" className="rounded-xl bg-gradient-to-r border border-orange-500/30 bg-orange-950/20 text-orange-400 px-6 py-3 font-bold shadow-lg hover:bg-orange-500/10 transition-all text-sm block">
              ATS Resume
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-white/5 bg-[#121218] p-6 flex items-center gap-5 shadow-lg">
            <div className="h-14 w-14 rounded-2xl bg-[#1e2230] flex items-center justify-center border border-white/5">
              <Activity className="h-7 w-7 text-indigo-400" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-medium text-zinc-400 mb-1">Overall Completion</p>
              <h3 className="text-2xl sm:text-3xl font-black text-emerald-400">25%</h3>
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-[#121218] p-6 flex items-center gap-5 shadow-lg">
            <div className="h-14 w-14 rounded-2xl bg-[#1e2230] flex items-center justify-center border border-white/5">
              <Flame className="h-7 w-7 text-orange-500" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-medium text-zinc-400 mb-1">Current Streak</p>
              <h3 className="text-2xl sm:text-3xl font-black text-amber-400">1 Days</h3>
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-[#121218] p-6 flex items-center gap-5 shadow-lg">
            <div className="h-14 w-14 rounded-2xl bg-[#1e2230] flex items-center justify-center border border-white/5">
              <Brain className="h-7 w-7 text-pink-400" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-medium text-zinc-400 mb-1">Confidence Score</p>
              <h3 className="text-2xl sm:text-3xl font-black text-violet-300">45%</h3>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[350px]">
          {/* Radar Chart */}
          <div className="rounded-2xl border border-white/5 bg-[#121218] p-6 flex flex-col relative overflow-hidden shadow-lg h-full">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-cyan-900/5 to-transparent pointer-events-none" />
            <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2 mb-4 relative z-10">
              <div className="h-2 w-2 rounded-full bg-cyan-400" />
              Weakness Radar
            </h3>
            <div className="flex-1 w-full relative z-10 flex items-center justify-center min-h-[250px] -mt-4">
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="#27272a" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 60]} tickCount={6} tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} />
                  <Radar name="Score" dataKey="A" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.15} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Test Marks Chart */}
          <div className="rounded-2xl border border-white/5 bg-[#121218] p-6 flex flex-col relative overflow-hidden shadow-lg h-full">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-900/5 to-transparent pointer-events-none" />
            <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2 mb-6 relative z-10">
              <div className="h-2 w-2 rounded-full bg-indigo-400" />
              Test Marks (Daily vs Average)
            </h3>
            <div className="flex-1 w-full relative z-10 min-h-[250px]">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={marksData} margin={{ top: 0, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 12, dy: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#52525b', fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#e4e4e7' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px', color: '#a1a1aa' }} />
                  <Line type="monotone" name="Daily Score" dataKey="daily" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" name="Average Score" dataKey="avg" stroke="#22d3ee" strokeWidth={3} strokeDasharray="5 5" dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Chat Bubble */}
      <div className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-[#008cff] shadow-xl shadow-[#008cff]/30 flex items-center justify-center cursor-pointer hover:bg-[#007be0] transition-colors z-50">
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </div>
    </div>
  )
}
