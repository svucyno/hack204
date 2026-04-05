import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  apiExtractResumeText,
  apiPutOnboarding,
  apiRoadmapOptions,
  apiRoadmapSuggest,
  apiSkillsCatalog,
  apiUploadResume,
} from '../lib/api'
import type { ExperienceStage, RoadmapTemplate, SkillRow } from '../lib/types'

const SHELL =
  'min-h-svh bg-gradient-to-br from-zinc-950 via-violet-950/35 to-zinc-950 text-zinc-100'
const CARD =
  'rounded-2xl border border-white/10 bg-zinc-900/40 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl'
const INPUT =
  'mt-1.5 w-full rounded-xl border border-zinc-600/80 bg-zinc-950/80 px-4 py-2.5 text-zinc-100 outline-none ring-amber-500/30 transition placeholder:text-zinc-600 focus:border-amber-500/50 focus:ring-2'
const BTN_PRIMARY =
  'w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 text-sm font-semibold text-zinc-950 shadow-lg shadow-amber-900/30 transition hover:from-amber-400 hover:to-orange-400'
const BTN_SECONDARY =
  'rounded-xl border border-zinc-500/60 bg-zinc-800/50 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-400 hover:bg-zinc-800'

const EXPERIENCE_STAGES: {
  id: ExperienceStage
  title: string
  description: string
  titleActive: string
  ringActive: string
}[] = [
  {
    id: 'fresher',
    title: 'Fresher',
    description:
      'Completely new — not comfortable with languages yet. No daily exams; only videos, tasks, and assignments. Skills optional.',
    titleActive: 'text-emerald-200',
    ringActive:
      'border-emerald-500/70 bg-emerald-950/30 ring-2 ring-emerald-500/25',
  },
  {
    id: 'beginner',
    title: 'Beginner',
    description:
      'Some exposure. Daily exams (70%+). Weak spots go to Basic review.',
    titleActive: 'text-sky-200',
    ringActive: 'border-sky-500/70 bg-sky-950/30 ring-2 ring-sky-500/25',
  },
  {
    id: 'intermediate',
    title: 'Intermediate',
    description:
      'Built small projects. Daily exams (70%+). Basic review for failed items.',
    titleActive: 'text-amber-200',
    ringActive:
      'border-amber-500/70 bg-amber-950/30 ring-2 ring-amber-500/25',
  },
  {
    id: 'expert',
    title: 'Expert',
    description:
      'Strong hands-on background. Standard track with daily exams.',
    titleActive: 'text-violet-200',
    ringActive:
      'border-violet-500/70 bg-violet-950/30 ring-2 ring-violet-500/25',
  },
]

export function SignupPage() {
  const navigate = useNavigate()
  const { token, me, loading, register, refreshMe, logout } = useAuth()
  const [step, setStep] = useState(1)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [uploadBusy, setUploadBusy] = useState(false)

  const [resumeText, setResumeText] = useState('')
  const [skills, setSkills] = useState<SkillRow[]>([])
  const [goal, setGoal] = useState('')
  const [pickOptions, setPickOptions] = useState<RoadmapTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [suggest, setSuggest] = useState<{
    recommendedTemplate: RoadmapTemplate
    suggestedSkills: string[]
    rationale: string
  } | null>(null)
  const [bandwidth, setBandwidth] = useState(4)
  const [roadmapLoading, setRoadmapLoading] = useState(false)
  const [skillCatalog, setSkillCatalog] = useState<string[]>([])
  const [pickSkill, setPickSkill] = useState('')
  const [pickLevel, setPickLevel] = useState<SkillRow['level']>('intermediate')
  const [experienceStage, setExperienceStage] =
    useState<ExperienceStage>('intermediate')
  /** Student track depth — not used for Fresher */
  const [studentStudyLevel, setStudentStudyLevel] = useState<
    'basic' | 'intermediate'
  >('basic')

  const resumeOnboarding = Boolean(
    token && me && !me.onboardingComplete,
  )
  const activeStep = useMemo(
    () => (resumeOnboarding && step < 2 ? 2 : step),
    [resumeOnboarding, step],
  )

  const totalSteps = 5
  const stepLabels = ['Account', 'Goal', 'Roadmap', 'Resume', 'Skills']

  const skillNamesTaken = useMemo(
    () => new Set(skills.map((s) => s.name)),
    [skills],
  )

  function addSkillFromList() {
    if (!pickSkill.trim()) return
    if (skillNamesTaken.has(pickSkill)) return
    setSkills((prev) => [...prev, { name: pickSkill, level: pickLevel }])
    setPickSkill('')
  }

  useEffect(() => {
    void apiRoadmapOptions().then((r) => {
      setPickOptions(r.templates)
      setSelectedTemplateId((prev) => prev || r.templates[0]?.id || '')
    })
    void apiSkillsCatalog()
      .then((r) => setSkillCatalog(r.skills))
      .catch(() => setSkillCatalog([]))
  }, [])

  async function handleRegister(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    try {
      await register(
        email.trim().toLowerCase(),
        password,
        name.trim(),
      )
      setStep(2)
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Registration failed')
    }
  }

  async function fetchRoadmapSuggestion() {
    if (!token) return
    const s = await apiRoadmapSuggest(token, { goal: goal.trim(), skills: [] })
    setSuggest({
      recommendedTemplate: s.recommendedTemplate,
      suggestedSkills: s.suggestedSkills,
      rationale: s.rationale,
    })
    setSelectedTemplateId(s.recommendedTemplate.id)
  }

  async function continueFromGoal() {
    setErr(null)
    setRoadmapLoading(true)
    try {
      if (goal.trim()) {
        await fetchRoadmapSuggestion()
      } else {
        setSuggest(null)
        setSelectedTemplateId(pickOptions[0]?.id || '')
      }
      setStep(3)
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Could not load roadmaps')
    } finally {
      setRoadmapLoading(false)
    }
  }

  async function handleExtractText() {
    setErr(null)
    try {
      const { skills: names } = await apiExtractResumeText(resumeText)
      setSkills(
        names.map((n) => ({ name: n, level: 'intermediate' as const })),
      )
      setStep(5)
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Extract failed')
    }
  }

  async function handleFile(f: File) {
    if (!token) return
    setErr(null)
    setInfo(null)
    setUploadBusy(true)
    try {
      const { text, skills: names } = await apiUploadResume(token, f)
      if (text?.trim()) setResumeText(text)
      setSkills(
        names.map((n) => ({ name: n, level: 'intermediate' as const })),
      )
      setStep(5)
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Upload failed')
    } finally {
      setUploadBusy(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function finishOnboarding() {
    if (!token) return
    const id =
      selectedTemplateId || pickOptions[0]?.id || suggest?.recommendedTemplate.id
    if (!id) {
      setErr('Select a roadmap')
      return
    }
    if (experienceStage !== 'fresher' && skills.length === 0) {
      setErr(
        'Add at least one skill (or extract from resume), or choose Fresher if you are completely new.',
      )
      return
    }
    setErr(null)
    try {
      await apiPutOnboarding(token, {
        resumeText,
        skills,
        clientGoal: goal.trim(),
        roadmapTemplateId: id,
        dailyBandwidth: bandwidth,
        experienceStage,
        ...(experienceStage === 'fresher'
          ? {}
          : { studyLevel: studentStudyLevel }),
      })
      await refreshMe()
      navigate('/learn', { replace: true })
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Save failed')
    }
  }

  if (!loading && token && me?.onboardingComplete) {
    return <Navigate to="/learn" replace />
  }

  return (
    <div className={SHELL}>
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent" />

      <div className="relative mx-auto max-w-lg px-4 py-10 pb-20">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-amber-400/90">
              Onboarding
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
              Join the program
            </h1>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2 text-xs">
            <Link
              to="/login"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-zinc-300 transition hover:bg-white/10"
            >
              Log in
            </Link>
            {token ? (
              <button
                type="button"
                className="text-zinc-500 underline"
                onClick={() => logout()}
              >
                Log out
              </button>
            ) : null}
          </div>
        </div>

        <div className="mb-8 flex justify-between gap-1">
          {stepLabels.map((label, i) => {
            const n = i + 1
            const active = activeStep === n
            const done = activeStep > n
            return (
              <div
                key={label}
                className="flex flex-1 flex-col items-center gap-1"
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                    active
                      ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-zinc-950 shadow-lg shadow-amber-900/40'
                      : done
                        ? 'bg-emerald-600/80 text-white'
                        : 'border border-zinc-600 bg-zinc-900 text-zinc-500'
                  }`}
                >
                  {done ? '✓' : n}
                </div>
                <span
                  className={`hidden text-center text-[10px] font-medium sm:block ${
                    active ? 'text-amber-200' : 'text-zinc-600'
                  }`}
                >
                  {label}
                </span>
              </div>
            )
          })}
        </div>

        <p className="mb-4 text-center text-sm text-zinc-500">
          Step {activeStep} of {totalSteps}
        </p>

        {info ? (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
            {info}
          </div>
        ) : null}
        {err ? (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-100">
            {err}
          </div>
        ) : null}

        {activeStep === 1 && !token ? (
          <form className={CARD + ' space-y-4'} onSubmit={handleRegister}>
            <h2 className="text-lg font-semibold text-white">Create account</h2>
            <label className="block text-left text-sm text-zinc-300">
              Name
              <input
                required
                className={INPUT}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="block text-left text-sm text-zinc-300">
              Email
              <input
                type="email"
                required
                autoComplete="email"
                className={INPUT}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="block text-left text-sm text-zinc-300">
              Password (8+ characters)
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className={INPUT}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button type="submit" className={BTN_PRIMARY}>
              Continue
            </button>
          </form>
        ) : null}

        {activeStep === 2 && token ? (
          <div className={CARD + ' space-y-4'}>
            <h2 className="text-lg font-semibold text-white">Your goal</h2>
            <textarea
              className={INPUT + ' min-h-[100px] resize-y'}
              placeholder="What do you want to achieve? (optional)"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            />
            <div className="flex gap-2">
              {resumeOnboarding ? (
                <button
                  type="button"
                  className={BTN_SECONDARY + ' flex-1'}
                  onClick={() => logout()}
                >
                  Log out
                </button>
              ) : (
                <button
                  type="button"
                  className={BTN_SECONDARY + ' flex-1'}
                  onClick={() => setStep(1)}
                >
                  ← Back
                </button>
              )}
              <button
                type="button"
                disabled={roadmapLoading}
                className={BTN_PRIMARY + ' flex-1'}
                onClick={() => void continueFromGoal()}
              >
                {roadmapLoading ? 'Loading…' : 'Continue →'}
              </button>
            </div>
          </div>
        ) : null}

        {activeStep === 3 && token ? (
          <div className={CARD + ' space-y-4'}>
            <h2 className="text-lg font-semibold text-white">Roadmap</h2>
            {suggest ? (
              <p className="text-sm text-zinc-400">{suggest.rationale}</p>
            ) : null}
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {pickOptions.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTemplateId(t.id)}
                  className={`w-full rounded-xl border p-3 text-left text-sm transition ${
                    selectedTemplateId === t.id
                      ? 'border-amber-500/70 bg-amber-950/30 ring-2 ring-amber-500/30'
                      : 'border-zinc-600 bg-zinc-950/40 hover:border-zinc-500'
                  }`}
                >
                  <span className="font-semibold text-white">{t.title}</span>
                  <span className="mt-1 block text-xs text-zinc-500">
                    {t.description}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className={BTN_SECONDARY + ' flex-1'}
                onClick={() => setStep(2)}
              >
                ← Back
              </button>
              <button
                type="button"
                className={BTN_PRIMARY + ' flex-1'}
                disabled={!selectedTemplateId}
                onClick={() => setStep(4)}
              >
                Continue →
              </button>
            </div>
          </div>
        ) : null}

        {activeStep === 4 && token ? (
          <div className={CARD + ' space-y-5'}>
            <h2 className="text-lg font-semibold text-white">Resume</h2>
            <p className="text-sm text-zinc-400">
              Paste text or upload PDF/TXT. We scan for technical skills
              (including analytics: SQL, Excel, Tableau, Python, KPIs, etc.).
            </p>
            <textarea
              className={INPUT + ' min-h-[160px] resize-y font-mono text-sm'}
              placeholder="Paste resume…"
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={BTN_SECONDARY}
                disabled={!resumeText.trim()}
                onClick={() => void handleExtractText()}
              >
                Extract from text
              </button>
              <button
                type="button"
                className={BTN_SECONDARY}
                disabled={uploadBusy}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadBusy ? 'Uploading…' : 'Upload PDF / TXT'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,application/pdf,text/plain"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void handleFile(f)
                }}
              />
              <button
                type="button"
                className="ml-auto text-sm text-zinc-500 underline"
                onClick={() => {
                  setSkills([])
                  setStep(5)
                }}
              >
                Skip resume — add skills from catalog
              </button>
            </div>
            <button
              type="button"
              className={BTN_SECONDARY + ' w-full'}
              onClick={() => setStep(3)}
            >
              ← Back
            </button>
          </div>
        ) : null}

        {activeStep === 5 && token ? (
          <div className={CARD + ' space-y-5'}>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Level &amp; skills
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                Choose stage, then add skills as <strong>name · level</strong>{' '}
                (resume/PDF still extracts skills on step 4).
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Stage
              </p>
              <div className="flex flex-wrap gap-2">
                {EXPERIENCE_STAGES.map((s) => {
                  const on = experienceStage === s.id
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setExperienceStage(s.id)}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                        on
                          ? s.ringActive
                          : 'border-zinc-600 bg-zinc-950/40 hover:border-zinc-500'
                      }`}
                    >
                      <span className={on ? s.titleActive : 'text-zinc-300'}>
                        {s.title}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {experienceStage !== 'fresher' ? (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Student level (roadmap depth)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setStudentStudyLevel('basic')}
                    className={`rounded-xl border p-3 text-left text-sm ${
                      studentStudyLevel === 'basic'
                        ? 'border-sky-500/70 bg-sky-950/30 ring-2 ring-sky-500/20'
                        : 'border-zinc-600 bg-zinc-950/40'
                    }`}
                  >
                    <span className="font-semibold text-sky-200">Basic</span>
                    <span className="mt-1 block text-xs text-zinc-500">
                      Shorter explanations &amp; lighter practice.
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentStudyLevel('intermediate')}
                    className={`rounded-xl border p-3 text-left text-sm ${
                      studentStudyLevel === 'intermediate'
                        ? 'border-amber-500/70 bg-amber-950/30 ring-2 ring-amber-500/20'
                        : 'border-zinc-600 bg-zinc-950/40'
                    }`}
                  >
                    <span className="font-semibold text-amber-200">
                      Intermediate
                    </span>
                    <span className="mt-1 block text-xs text-zinc-500">
                      Deeper questions &amp; tighter pacing.
                    </span>
                  </button>
                </div>
              </div>
            ) : null}

            <div>
              <p className="mb-2 text-sm font-medium text-zinc-300">Skills</p>
              {experienceStage === 'fresher' && skills.length === 0 ? (
                <p className="mb-2 text-xs text-zinc-500">
                  Optional for Fresher.
                </p>
              ) : null}
              <div className="mb-3 flex flex-wrap items-end gap-2">
                <label className="min-w-[140px] flex-1 text-left text-xs text-zinc-400">
                  Skill
                  <select
                    className={INPUT + ' mt-1'}
                    value={pickSkill}
                    onChange={(e) => setPickSkill(e.target.value)}
                  >
                    <option value="">Select…</option>
                    {skillCatalog.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="w-36 text-left text-xs text-zinc-400">
                  Level
                  <select
                    className={INPUT + ' mt-1'}
                    value={pickLevel}
                    onChange={(e) =>
                      setPickLevel(e.target.value as SkillRow['level'])
                    }
                  >
                    <option value="basic">basic</option>
                    <option value="intermediate">intermediate</option>
                    <option value="advanced">advanced</option>
                  </select>
                </label>
                <button
                  type="button"
                  className={BTN_SECONDARY + ' shrink-0'}
                  onClick={() => addSkillFromList()}
                >
                  Add
                </button>
              </div>
              <ul className="max-h-[200px] space-y-1.5 overflow-y-auto pr-1 text-sm">
                {skills.map((s, i) => (
                  <li
                    key={`${s.name}-${i}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-zinc-700/50 bg-zinc-950/50 px-3 py-2"
                  >
                    <span className="text-zinc-200">
                      {s.name}{' '}
                      <span className="text-zinc-500">· {s.level}</span>
                    </span>
                    <button
                      type="button"
                      className="text-xs text-red-400 hover:text-red-300"
                      onClick={() =>
                        setSkills((prev) => prev.filter((_, j) => j !== i))
                      }
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <label className="block text-sm font-medium text-zinc-300">
              Daily study hours: {bandwidth}h
              <input
                type="range"
                min={1}
                max={12}
                className="mt-2 w-full accent-amber-500"
                value={bandwidth}
                onChange={(e) => setBandwidth(Number(e.target.value))}
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                className={BTN_SECONDARY + ' flex-1'}
                onClick={() => setStep(4)}
              >
                ← Back
              </button>
              <button
                type="button"
                className={BTN_PRIMARY + ' flex-1'}
                disabled={experienceStage !== 'fresher' && skills.length === 0}
                onClick={() => void finishOnboarding()}
              >
                Finish & start program
              </button>
            </div>
          </div>
        ) : null}

        {!token && activeStep > 1 ? (
          <div className="text-center text-sm text-zinc-500">
            <Link className="text-amber-400 underline" to="/login">
              Log in
            </Link>{' '}
            to continue onboarding.
          </div>
        ) : null}
      </div>
    </div>
  )
}
