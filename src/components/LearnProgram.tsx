import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { jsPDF } from 'jspdf'
import { apiAssistant, apiMe, apiPutLearningState } from '../lib/api'
import {
  createEmptyProgress,
  type LearningProgressStateV1,
} from '../lib/types'
import type { MeResponse } from '../lib/api'
import { getProgramTrack, type ProgramUnit } from '../lib/programTracks'

const PASS = 70

function normalizeProgress(raw: unknown): LearningProgressStateV1 {
  if (
    raw &&
    typeof raw === 'object' &&
    (raw as LearningProgressStateV1).version === 1
  ) {
    const r = raw as Partial<LearningProgressStateV1>
    return {
      version: 1,
      completedUnitIds: Array.isArray(r.completedUnitIds)
        ? r.completedUnitIds
        : [],
      unitScores:
        r.unitScores && typeof r.unitScores === 'object' ? r.unitScores : {},
      currentUnitIndex:
        typeof r.currentUnitIndex === 'number' ? r.currentUnitIndex : 0,
      milestonesEarned: Array.isArray(r.milestonesEarned)
        ? r.milestonesEarned
        : [],
      streak: typeof r.streak === 'number' ? r.streak : 0,
      lastStreakDate:
        typeof r.lastStreakDate === 'string' ? r.lastStreakDate : '',
      updatedAt: new Date().toISOString(),
    }
  }
  return createEmptyProgress()
}

function scorePractice(unit: ProgramUnit, answers: number[]): number {
  if (!unit.practice.length) return 100
  let ok = 0
  unit.practice.forEach((q, i) => {
    if (answers[i] === q.correctIndex) ok += 1
  })
  return Math.round((ok / unit.practice.length) * 100)
}

function certificateHtml(opts: {
  name: string
  phase: number
  trackTitle: string
  date: string
}) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>Milestone ${opts.phase}</title>
<style>
body{font-family:Georgia,serif;background:#0f0f12;color:#f4f4f5;margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;}
.card{max-width:640px;border:2px solid #d4a574;padding:48px;text-align:center;background:linear-gradient(180deg,#1a1a22,#121218);border-radius:16px;box-shadow:0 24px 80px rgba(0,0,0,.5);}
h1{font-size:14px;letter-spacing:.35em;text-transform:uppercase;color:#d4a574;margin:0;}
h2{font-size:28px;margin:16px 0 8px;}
p{color:#a1a1aa;line-height:1.6;}
.sig{margin-top:40px;border-top:1px solid #3f3f46;padding-top:16px;color:#71717a;font-size:14px;}
</style></head><body><div class="card">
<h1>Milestone certificate</h1>
<h2>${escapeHtml(opts.name)}</h2>
<p>Completed <strong>${escapeHtml(opts.trackTitle)}</strong> — Phase ${opts.phase}</p>
<p>Issued ${escapeHtml(opts.date)}</p>
<div class="sig">Learning enforcement system · progress verified in-app</div>
</div></body></html>`
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function bumpStreak(prev: LearningProgressStateV1): {
  streak: number
  lastStreakDate: string
} {
  const today = new Date().toISOString().slice(0, 10)
  const y = new Date()
  y.setDate(y.getDate() - 1)
  const yesterday = y.toISOString().slice(0, 10)
  const last = prev.lastStreakDate ?? ''
  let streak = prev.streak ?? 0
  if (last === today) {
    return { streak, lastStreakDate: today }
  }
  if (last === yesterday) streak += 1
  else streak = 1
  return { streak, lastStreakDate: today }
}

export function LearnProgram({
  token,
  profile,
  onSyncProfile,
}: {
  token: string
  profile: MeResponse['profile']
  onSyncProfile: () => void
}) {
  const isFresher = profile.learningPath === 'basic'
  const studyLevel =
    profile.studyLevel === 'intermediate' || profile.studyLevel === 'basic'
      ? profile.studyLevel
      : null

  const track = useMemo(
    () =>
      getProgramTrack(
        profile.roadmapTemplateId || 'mern-fullstack',
        studyLevel,
        isFresher,
      ),
    [profile.roadmapTemplateId, studyLevel, isFresher],
  )

  const [progress, setProgress] = useState<LearningProgressStateV1 | null>(null)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [answers, setAnswers] = useState<number[]>([])
  const [practiceResult, setPracticeResult] = useState<string | null>(null)
  const [aiOpen, setAiOpen] = useState(false)
  const [aiMsg, setAiMsg] = useState('')
  const [aiReply, setAiReply] = useState<string | null>(null)
  const [aiBusy, setAiBusy] = useState(false)
  const [pendingMilestone, setPendingMilestone] = useState<number | null>(null)

  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const persist = useCallback(
    (next: LearningProgressStateV1) => {
      const payload = { ...next, updatedAt: new Date().toISOString() }
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        void apiPutLearningState(token, payload).catch(() => {
          /* offline */
        })
      }, 700)
    },
    [token],
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await apiMe(token)
        if (cancelled) return
        setProgress(normalizeProgress(data.learningState))
      } catch {
        if (!cancelled) {
          setLoadErr('Could not load progress.')
          setProgress(createEmptyProgress())
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  const units = track.units

  const idx = useMemo(() => {
    if (!progress) return 0
    const done = new Set(progress.completedUnitIds)
    const fi = units.findIndex((u) => !done.has(u.id))
    return fi === -1 ? Math.max(0, units.length - 1) : fi
  }, [progress, units])

  const unit = units[idx] ?? units[0]

  useEffect(() => {
    if (unit) {
      setAnswers(unit.practice.map(() => -1))
      setPracticeResult(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset form when switching unit id only
  }, [unit?.id])

  if (!progress) {
    return (
      <p className="text-sm text-zinc-500">
        {loadErr ?? 'Loading progress…'}
      </p>
    )
  }

  const completed = new Set(progress.completedUnitIds)
  const isDone = unit ? completed.has(unit.id) : false
  const progressPct =
    units.length > 0
      ? Math.round((completed.size / units.length) * 1000) / 10
      : 0

  function submitPractice() {
    if (!unit) return
    if (answers.includes(-1)) {
      setPracticeResult('Please answer all questions before submitting.')
      return
    }
    const pct = scorePractice(unit, answers)
    const passed = pct >= PASS
    
    if (passed) {
      setPracticeResult(`Passed! Score: ${pct}%`)
    } else {
      setPracticeResult(`Failed. Score: ${pct}%. Saving to reports...`)
    }

    setProgress((prev) => {
      if (!prev) return prev
      const done = new Set(prev.completedUnitIds)
      const already = done.has(unit.id)
      
      let completedUnitIds = prev.completedUnitIds
      let nextIndex = idx
      let milestonesEarned = [...prev.milestonesEarned]
      let streakPart = { streak: prev.streak, lastStreakDate: prev.lastStreakDate }

      if (passed && !already) {
        completedUnitIds = [...prev.completedUnitIds, unit.id]
        if (idx + 1 < units.length) {
          nextIndex = idx + 1
        }
        
        const n = completedUnitIds.length
        const every = track.milestoneEvery
        if (n > 0 && n % every === 0) {
          const phase = n / every
          if (!milestonesEarned.includes(phase)) {
            milestonesEarned = [...milestonesEarned, phase]
            setPendingMilestone(phase)
          }
        }
        streakPart = bumpStreak(prev)
      }

      const unitScores = { ...prev.unitScores, [unit.id]: pct }
      
      const next: LearningProgressStateV1 = {
        version: 1,
        completedUnitIds,
        unitScores,
        currentUnitIndex: nextIndex,
        milestonesEarned,
        streak: streakPart.streak,
        lastStreakDate: streakPart.lastStreakDate,
        updatedAt: new Date().toISOString(),
      }
      persist(next)
      
      if (!passed) {
        setTimeout(() => {
          window.location.href = '/reports'
        }, 1500)
      } else {
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      }
      
      return next
    })
  }

  function downloadCertificate(phase: number) {
    const html = certificateHtml({
      name: profile.name,
      phase,
      trackTitle: track.title,
      date: new Date().toLocaleDateString(),
    })
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `milestone-${phase}-${profile.name.replace(/\s+/g, '-')}.html`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function shareLinkedIn(phase: number) {
    const text = `I completed Phase ${phase} of my structured learning track: ${track.title}. Building skills with measurable milestones. #Learning #DataSkills`
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      /* ignore */
    }
    window.open(
      'https://www.linkedin.com/feed/?shareActive=true',
      '_blank',
      'noopener,noreferrer',
    )
  }

  function downloadProgressPdf() {
    const doc = new jsPDF()
    let yPos = 20

    // Title
    doc.setFontSize(22)
    doc.setTextColor(40, 40, 40)
    doc.setFont("helvetica", "bold")
    doc.text("Learning Progress Report", 20, yPos)
    yPos += 15

    // Profile section
    doc.setFontSize(16)
    doc.setTextColor(60, 60, 60)
    doc.text("Student Details", 20, yPos)
    yPos += 10

    doc.setFontSize(12)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(80, 80, 80)
    doc.text(`Name: ${profile.name}`, 20, yPos); yPos += 8
    doc.text(`Career Goal: ${profile.clientGoal || 'Not specified'}`, 20, yPos); yPos += 8
    doc.text(`Studying Track: ${track.title}`, 20, yPos); yPos += 8
    doc.text(`Experience Level: ${profile.experienceStage || 'Beginner'}`, 20, yPos); yPos += 12

    // Progress Section
    doc.setFontSize(16)
    doc.setTextColor(60, 60, 60)
    doc.setFont("helvetica", "bold")
    doc.text("Current Status", 20, yPos)
    yPos += 10

    doc.setFontSize(12)
    doc.setTextColor(80, 80, 80)
    doc.setFont("helvetica", "normal")
    doc.text(`Completion Rate: ${progressPct}%`, 20, yPos); yPos += 8
    doc.text(`Active Day Streak: ${progress?.streak ?? 0} Days`, 20, yPos); yPos += 8
    doc.text(`Completed Units: ${progress?.completedUnitIds?.length ?? 0} out of ${units.length}`, 20, yPos); yPos += 12

    // Score History (if any)
    if (progress && progress.unitScores && Object.keys(progress.unitScores).length > 0) {
      doc.setFontSize(16)
      doc.setTextColor(60, 60, 60)
      doc.setFont("helvetica", "bold")
      doc.text("Unit Scores", 20, yPos)
      yPos += 10

      doc.setFontSize(11)
      doc.setFont("helvetica", "normal")
      const scores = Object.entries(progress.unitScores).map(([id, score]) => {
         const unitRef = units.find(u => u.id === id)
         return `${unitRef ? unitRef.title : id}: ${score}%`
      })

      scores.forEach(s => {
         doc.text(`• ${s}`, 20, yPos)
         yPos += 6
         if (yPos > 280) { // Add new page if list goes too long
           doc.addPage()
           yPos = 20
         }
      })
    }

    // Footer
    yPos += 15
    if (yPos > 280) { doc.addPage(); yPos = 20; }
    doc.setFontSize(10)
    doc.setTextColor(150, 150, 150)
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, yPos)

    doc.save(`Progress-Report-${profile.name.replace(/\s+/g, '-')}.pdf`)
  }

  async function sendAi() {
    const q = aiMsg.trim()
    if (!q) return
    setAiBusy(true)
    setAiReply(null)
    const context = [
      `Goal: ${profile.clientGoal}`,
      `Track: ${track.title}`,
      `Unit: ${unit?.title ?? ''}`,
      `Experience: ${profile.experienceStage}; study level: ${profile.studyLevel ?? 'n/a (Fresher)'}`,
      `Skills: ${profile.skills.map((s) => s.name).join(', ')}`,
    ].join('\n')
    try {
      const { reply } = await apiAssistant(token, { message: q, context })
      setAiReply(reply)
    } catch (e) {
      setAiReply(e instanceof Error ? e.message : 'Assistant error')
    } finally {
      setAiBusy(false)
    }
  }

  return (
    <div className="relative mt-6">
      <div className="sticky top-0 z-30 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-700/80 bg-zinc-950/95 px-3 py-2.5 shadow-lg backdrop-blur-md">
        <p className="max-w-[40%] truncate text-xs text-zinc-500 sm:max-w-none">
          {track.title}
        </p>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span
            className="rounded-full border border-amber-500/40 bg-amber-950/40 px-2.5 py-1 text-xs font-medium text-amber-200"
            title="Progress"
          >
            {progressPct}%
          </span>
          <span
            className="rounded-full border border-orange-500/40 bg-orange-950/30 px-2.5 py-1 text-xs font-medium text-orange-200"
            title="Day streak (complete unit on consecutive days)"
          >
            🔥 {progress.streak}
          </span>
          <details className="relative">
            <summary className="cursor-pointer list-none rounded-lg border border-zinc-600 px-2.5 py-1 text-xs text-zinc-200 hover:bg-zinc-800">
              Certificate
            </summary>
            <div className="absolute right-0 z-40 mt-1 min-w-[160px] rounded-lg border border-zinc-600 bg-zinc-900 py-1 shadow-xl">
              {progress.milestonesEarned.length === 0 ? (
                <p className="px-3 py-2 text-xs text-zinc-500">
                  Complete milestones to unlock
                </p>
              ) : (
                progress.milestonesEarned.map((ph) => (
                  <button
                    key={ph}
                    type="button"
                    className="block w-full px-3 py-2 text-left text-xs text-zinc-200 hover:bg-zinc-800"
                    onClick={() => downloadCertificate(ph)}
                  >
                    Phase {ph} · download
                  </button>
                ))
              )}
            </div>
          </details>

          <details className="relative">
            <summary className="cursor-pointer list-none rounded-lg border border-zinc-600 px-2.5 py-1 text-xs text-zinc-200 hover:bg-zinc-800">
              Progress
            </summary>
            <div className="absolute right-0 z-40 mt-1 min-w-[220px] rounded-lg border border-zinc-600 bg-zinc-900 p-3 shadow-xl">
              <div className="flex flex-col gap-2">
                <div className="text-xs text-zinc-300 space-y-1.5 border-b border-zinc-700 pb-3 mb-1">
                  <p className="flex justify-between"><span className="text-zinc-500">Name:</span> <span>{profile.name}</span></p>
                  <p className="flex justify-between"><span className="text-zinc-500">Goal:</span> <span className="truncate max-w-[120px]" title={profile.clientGoal || 'N/A'}>{profile.clientGoal || 'N/A'}</span></p>
                  <p className="flex justify-between"><span className="text-zinc-500">Studying:</span> <span className="truncate max-w-[120px]" title={track.title}>{track.title}</span></p>
                  <p className="flex justify-between"><span className="text-zinc-500">Completed:</span> <span className="text-amber-400 font-medium">{progressPct}%</span></p>
                  <p className="flex justify-between"><span className="text-zinc-500">Streak:</span> <span className="text-orange-400 font-medium">{progress.streak} Days</span></p>
                </div>
                <button
                  type="button"
                  className="w-full rounded bg-zinc-800 px-3 py-2 text-center font-medium text-xs text-zinc-200 hover:bg-zinc-700 transition flex items-center justify-center gap-2"
                  onClick={() => downloadProgressPdf()}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  Download PDF Report
                </button>
              </div>
            </div>
          </details>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,220px)_1fr] lg:gap-6">
        <ol className="space-y-1.5 rounded-xl border border-white/10 bg-zinc-900/40 p-3 text-sm">
          {units.map((u, i) => {
            const done = completed.has(u.id)
            const current = i === idx
            const locked = i > idx
            return (
              <li
                key={u.id}
                className={`flex items-start gap-2 rounded-lg px-2 py-1.5 ${
                  current
                    ? 'bg-amber-500/15 text-amber-100'
                    : done
                      ? 'text-emerald-400/90'
                      : locked
                        ? 'text-zinc-600'
                        : 'text-zinc-400'
                }`}
              >
                <span className="w-6 shrink-0 font-mono text-xs opacity-70">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 leading-snug">
                  {locked ? '🔒 ' : done ? '✓ ' : current ? '→ ' : ''}
                  Day {i + 1}: {u.title}
                </span>
              </li>
            )
          })}
        </ol>

        <div className="space-y-6 rounded-2xl border border-white/10 bg-zinc-900/50 p-5">
          <p className="text-xs text-zinc-500">
            Day-by-Day Roadmap. Finish the daily exam (20 bits, {PASS}%+ to pass) to unlock the next day.
            Milestone certificate every {track.milestoneEvery} days.
          </p>

          {unit ? (
            <div className="space-y-4 border-t border-zinc-700/60 pt-4">
              <div>
                <h3 className="text-base font-semibold text-amber-100/90">
                  {isDone ? `Review Day ${idx + 1}: ` : `Today's Content (Day ${idx + 1}): `}{unit.title}
                </h3>
                <p className="mt-1 text-sm text-zinc-400">{unit.summary}</p>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase text-zinc-500">
                  Watch these YouTube videos before taking today's exam
                </p>
                <ul className="space-y-2">
                  {unit.videos.map((vid) => (
                    <li key={vid.url}>
                      <a
                        href={vid.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium text-sky-400 underline hover:text-sky-300"
                      >
                        {vid.title} (YouTube)
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase text-zinc-500">
                  Daily Exam (20 Bits) - Pass with {PASS}%
                </p>
                {unit.practice.map((q, qi) => (
                  <div
                    key={qi}
                    className="mb-4 rounded-xl border border-zinc-700/60 bg-zinc-950/40 p-3"
                  >
                    <p className="text-sm text-zinc-200">{q.question}</p>
                    <div className="mt-2 space-y-1">
                      {q.options.map((opt, oi) => (
                        <label
                          key={oi}
                          className="flex cursor-pointer items-center gap-2 text-sm text-zinc-400"
                        >
                          <input
                            type="radio"
                            name={`q-${unit.id}-${qi}`}
                            checked={answers[qi] === oi}
                            onChange={() => {
                              const next = [...answers]
                              next[qi] = oi
                              setAnswers(next)
                            }}
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                {isDone ? (
                  <p className="text-sm text-emerald-400">
                    Unit complete ({progress.unitScores[unit.id]}%).
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => submitPractice()}
                    className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400"
                  >
                    Submit practice
                  </button>
                )}
                {practiceResult ? (
                  <p className="mt-2 text-xs text-zinc-500">{practiceResult}</p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {aiOpen ? (
        <div className="fixed bottom-24 right-6 z-40 flex max-h-[min(480px,70vh)] w-[min(100%,360px)] flex-col rounded-2xl border border-violet-500/40 bg-zinc-900/95 p-4 shadow-2xl backdrop-blur">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-violet-200">AI assistant</p>
            <button
              type="button"
              className="text-xs text-zinc-500 hover:text-zinc-300"
              onClick={() => setAiOpen(false)}
            >
              ✕
            </button>
          </div>
          <textarea
            className="mb-2 min-h-[72px] w-full rounded-lg border border-zinc-600 bg-zinc-950 p-2 text-sm text-zinc-100 placeholder-zinc-500"
            placeholder="Ask about this unit..."
            value={aiMsg}
            onChange={(e) => setAiMsg(e.target.value)}
          />
          <button
            type="button"
            disabled={aiBusy}
            onClick={() => void sendAi()}
            className="mb-2 rounded-lg bg-violet-600 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50 transition"
          >
            {aiBusy ? '...' : 'Send Message'}
          </button>
          {aiReply ? (
            <pre className="max-h-52 flex-1 overflow-auto whitespace-pre-wrap rounded-lg bg-zinc-950/80 p-3 text-xs text-zinc-300 shadow-inner">
              {aiReply}
            </pre>
          ) : null}
        </div>
      ) : null}

      {/* Floating Chat Bubble Matching Dashboard */}
      <div 
        onClick={() => setAiOpen(o => !o)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-[#008cff] shadow-xl shadow-[#008cff]/30 flex items-center justify-center cursor-pointer hover:bg-[#007be0] transition-colors z-50 text-white"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {aiOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          )}
        </svg>
      </div>

      {pendingMilestone != null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur">
          <div className="max-w-md rounded-2xl border border-amber-500/40 bg-zinc-900 p-6 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
              Milestone reached
            </p>
            <h3 className="mt-2 text-xl font-bold text-white">
              Phase {pendingMilestone}
            </h3>
            <p className="mt-2 text-sm text-zinc-400">
              Download your certificate (HTML, print-ready) and share on
              LinkedIn.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                className="rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400"
                onClick={() => downloadCertificate(pendingMilestone)}
              >
                Download certificate
              </button>
              <button
                type="button"
                className="rounded-xl border border-[#0a66c2] py-2.5 text-sm font-semibold text-[#93c5fd] hover:bg-[#0a66c2]/20"
                onClick={() => void shareLinkedIn(pendingMilestone)}
              >
                Copy blurb &amp; open LinkedIn
              </button>
              <button
                type="button"
                className="text-sm text-zinc-500 underline"
                onClick={() => {
                  setPendingMilestone(null)
                  void onSyncProfile()
                }}
              >
                Continue learning
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
