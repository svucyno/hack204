import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LearnPage } from './pages/LearnPage'
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'
import { DashboardPage } from './pages/DashboardPage'
import { JobsPage } from './pages/JobsPage'
import { MentorPage } from './pages/MentorPage'
import { ReportsPage } from './pages/ReportsPage'
import { SettingsPage } from './pages/SettingsPage'
import { ResumePage } from './pages/ResumePage'
import { InterviewPage } from './pages/InterviewPage'

function HomeRoute() {
  const { token, me, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-zinc-950 text-zinc-400">
        Loading…
      </div>
    )
  }
  if (token && me?.onboardingComplete) return <Navigate to="/dashboard" replace />
  if (token && me && !me.onboardingComplete)
    return <Navigate to="/signup" replace />
  return <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/learn" element={<LearnPage />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/mentor" element={<MentorPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/resume" element={<ResumePage />} />
          <Route path="/interview" element={<InterviewPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
