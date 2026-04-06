import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  LineChart, Line
} from 'recharts'
import { useAuth } from '../context/AuthContext'
import type { LearningProgressStateV1 } from '../lib/types'

export function ReportsPage() {
  const { me, learningState, logout } = useAuth()

  // Try to populate from real exam units
  const state = learningState as LearningProgressStateV1 | null
  let examHistoryData: any[] = []
  let isMockData = false

  if (state && state.unitScores && Object.keys(state.unitScores).length > 0) {
    const today = new Date().toISOString().split('T')[0]
    examHistoryData = Object.entries(state.unitScores).map(([unitId, score]) => {
      // capitalize and clean up the unit ID for display
      const displayTopic = unitId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      return {
        examId: `UNIT-${unitId.slice(0, 4).toUpperCase()}`,
        topic: displayTopic,
        date: state.lastStreakDate || today,
        score: score,
        passMark: 70
      }
    })
  }

  // Fallback to mock data to show the layout if no exam has been taken
  if (examHistoryData.length === 0) {
    isMockData = true
    examHistoryData = [
      { examId: "EX-101", topic: "React Basics", date: "2026-03-20", score: 85, passMark: 70 },
      { examId: "EX-102", topic: "Database Architecture", date: "2026-03-24", score: 90, passMark: 70 },
      { examId: "EX-103", topic: "Node.js REST APIs", date: "2026-03-28", score: 65, passMark: 70 },
      { examId: "EX-104", topic: "Authentication", date: "2026-04-01", score: 80, passMark: 70 },
      { examId: "EX-105", topic: "Serverless Deployment", date: "2026-04-05", score: 95, passMark: 70 },
    ]
  }

  return (
    <div className="min-h-svh bg-[#09090b] text-zinc-100 flex flex-col font-sans relative pb-10">
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#09090b]">
        <div className="text-cyan-500 font-bold text-xl tracking-tight">Cynosure Learning</div>
        <nav className="hidden md:flex items-center gap-6 text-sm text-zinc-400">
          <Link to="/dashboard" className="hover:text-white">Dashboard</Link>
          <Link to="/learn" className="hover:text-white">Roadmap</Link>
          <Link to="/interview" className="hover:text-white">Interview</Link>
          <Link to="/mentor" className="hover:text-white">Mentor</Link>
          <Link to="/reports" className="text-zinc-200 hover:text-white">Reports</Link>
          <Link to="/jobs" className="hover:text-white">Jobs</Link>
          <Link to="/settings" className="hover:text-white">Settings</Link>
          <div className="text-zinc-500 ml-4">{me?.email || 'user@example.com'}</div>
          <button onClick={() => logout()} className="text-red-400 hover:text-red-300 ml-2 font-medium">
            Logout
          </button>
        </nav>
      </header>
      
      <main className="flex-1 max-w-[1200px] w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-200">Exam Marks Report</h1>
          <p className="text-zinc-400 mt-2">Review your past performance, analyze trends, and identify areas for improvement.</p>
          {isMockData && (
            <div className="mt-4 inline-block bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm px-3 py-1.5 rounded-lg">
              You haven't completed any exams yet. Showing sample data.
            </div>
          )}
        </div>

        {/* Chart View */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[400px]">
          <div className="rounded-2xl border border-white/5 bg-[#121218] p-6 flex flex-col shadow-lg">
            <h3 className="text-sm font-bold text-zinc-200 mb-6 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-violet-400" />
              Score Trend
            </h3>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={examHistoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#71717a', fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#e4e4e7' }} />
                  <Legend wrapperStyle={{ fontSize: '12px', color: '#a1a1aa' }} />
                  <Line type="monotone" name="Your Score" dataKey="score" stroke="#a78bfa" strokeWidth={3} dot={{ r: 4, fill: '#a78bfa', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                  <Line type="step" name="Pass Mark" dataKey="passMark" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="rounded-2xl border border-white/5 bg-[#121218] p-6 flex flex-col shadow-lg">
            <h3 className="text-sm font-bold text-zinc-200 mb-6 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-400" />
              Recent Exam Scores
            </h3>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={examHistoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="topic" tick={{ fill: '#71717a', fontSize: 12 }} axisLine={false} tickLine={false} width={120} />
                  <RechartsTooltip cursor={{ fill: '#27272a', opacity: 0.4 }} contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#e4e4e7' }} />
                  <Bar dataKey="score" fill="#34d399" radius={[0, 4, 4, 0]} barSize={20} name="Score" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Table View */}
        <div className="rounded-2xl border border-white/5 bg-[#121218] shadow-lg overflow-hidden mt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-900/50 border-b border-white/5">
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Exam ID</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Topic</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Date Taken</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-right">Score</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {examHistoryData.map((exam, i) => (
                  <tr key={exam.examId + i} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 text-sm text-zinc-300 font-medium">{exam.examId}</td>
                    <td className="px-6 py-4 text-sm text-zinc-300">{exam.topic}</td>
                    <td className="px-6 py-4 text-sm text-zinc-400">{exam.date}</td>
                    <td className="px-6 py-4 text-sm text-right font-bold">
                      <span className={exam.score >= exam.passMark ? 'text-emerald-400' : 'text-danger-400'} style={{ color: exam.score >= exam.passMark ? '#34d399' : '#f87171' }}>
                        {exam.score}% <span className="text-xs font-normal opacity-70 ml-1">({Math.round((exam.score / 100) * 20)}/20 bits)</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-center">
                      {exam.score >= exam.passMark ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Pass
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                          Fail
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
