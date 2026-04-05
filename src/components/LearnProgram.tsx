import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  const idx = progress
    ? Math.min(progress.currentUnitIndex, units.length - 1)
    : 0
  const unit = units[idx] ?? units[0]

  useEffect(() => {
    if (unit) {
      setAnswers(unit.practice.map(() => 0))
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

  function submitPractice() {
    if (!unit) return
    const pct = scorePractice(unit, answers)
    setPracticeResult(`Score: ${pct}%`)
    if (pct < PASS) return

    setProgress((prev) => {
      if (!prev) return prev
      const done = new Set(prev.completedUnitIds)
      const completedUnitIds = done.has(unit.id)
        ? prev.completedUnitIds
        : [...prev.completedUnitIds, unit.id]
      const unitScores = { ...prev.unitScores, [unit.id]: pct }
      const nextIndex = idx + 1 < units.length ? idx + 1 : idx
      let milestonesEarned = [...prev.milestonesEarned]
      const n = completedUnitIds.length
      const every = track.milestoneEvery
      if (n > 0 && n % every === 0) {
        const phase = n / every
        if (!milestonesEarned.includes(phase)) {
          milestonesEarned = [...milestonesEarned, phase]
          setPendingMilestone(phase)
        }
      }
      const next: LearningProgressStateV1 = {
        version: 1,
        completedUnitIds,
        unitScores,
        currentUnitIndex: nextIndex,
        milestonesEarned,
        updatedAt: new Date().toISOString(),
      }
      persist(next)
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

  function downloadProgressJson() {
    const pack = {
      exportedAt: new Date().toISOString(),
      profile: {
        name: profile.name,
        goal: profile.clientGoal,
        templateId: profile.roadmapTemplateId,
        experienceStage: profile.experienceStage,
        studyLevel: profile.studyLevel,
        skills: profile.skills,
      },
      track: track.title,
      progress,
    }
    const blob = new Blob([JSON.stringify(pack, null, 2)], {
      type: 'application/json',
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `learning-progress-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
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
    <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6 rounded-2xl border border-white/10 bg-zinc-900/50 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">{track.title}</h2>
            <p className="text-xs text-zinc-500">
              {units.length} units · practice {PASS}%+ to complete · milestone
              certificate every {track.milestoneEvery} units
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800"
              onClick={() => downloadProgressJson()}
            >
              Download progress
            </button>
            <button
              type="button"
              className="rounded-lg border border-violet-500/50 bg-violet-950/30 px-3 py-1.5 text-xs text-violet-200 hover:bg-violet-900/40"
              onClick={() => setAiOpen((o) => !o)}
            >
              AI assistant
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {units.map((u, i) => (
            <button
              key={u.id}
              type="button"
              onClick={() => {
                const next = { ...progress, currentUnitIndex: i }
                setProgress(next)
                persist(next)
              }}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                i === idx
                  ? 'bg-amber-500 text-zinc-950'
                  : completed.has(u.id)
                    ? 'bg-emerald-900/50 text-emerald-200'
                    : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {i + 1}. {u.title.slice(0, 22)}
              {u.title.length > 22 ? '…' : ''}
            </button>
          ))}
        </div>

        {unit ? (
          <div className="space-y-4 border-t border-zinc-700/60 pt-4">
            <div>
              <h3 className="text-base font-semibold text-amber-100/90">
                {unit.title}
              </h3>
              <p className="mt-1 text-sm text-zinc-400">{unit.summary}</p>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium uppercase text-zinc-500">
                Videos
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
                Practice (after watching)
              </p>
              {unit.practice.map((q, qi) => (
                <div key={qi} className="mb-4 rounded-xl border border-zinc-700/60 bg-zinc-950/40 p-3">
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

      {aiOpen ? (
        <div className="h-fit space-y-3 rounded-2xl border border-violet-500/30 bg-violet-950/20 p-4">
          <p className="text-sm font-semibold text-violet-200">AI assistant</p>
          <p className="text-xs text-zinc-500">
            Set <code className="text-zinc-400">OPENAI_API_KEY</code> on the API
            for OpenAI answers; otherwise you get offline tips.
          </p>
          <textarea
            className="min-h-[88px] w-full rounded-lg border border-zinc-600 bg-zinc-950 p-2 text-sm text-zinc-100"
            placeholder="Ask about this unit, SQL, React, career…"
            value={aiMsg}
            onChange={(e) => setAiMsg(e.target.value)}
          />
          <button
            type="button"
            disabled={aiBusy}
            onClick={() => void sendAi()}
            className="w-full rounded-lg bg-violet-600 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {aiBusy ? 'Thinking…' : 'Ask'}
          </button>
          {aiReply ? (
            <pre className="whitespace-pre-wrap rounded-lg bg-zinc-950/80 p-3 text-xs text-zinc-300">
              {aiReply}
            </pre>
          ) : null}
        </div>
      ) : (
        <div className="hidden lg:block" />
      )}

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
