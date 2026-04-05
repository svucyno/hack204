import type { ExperienceStage, RoadmapTemplate, SkillRow } from './types'

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text()
  let data: unknown
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    throw new Error('Invalid JSON from server')
  }
  if (!res.ok) {
    const err = (data as { error?: string })?.error || res.statusText
    throw new Error(err)
  }
  return data as T
}

function base() {
  return ''
}

export type MeResponse = {
  user: {
    id: number
    email: string
    name: string
    onboardingComplete: boolean
  }
  profile: {
    name: string
    resumeText: string
    skills: SkillRow[]
    clientGoal: string
    roadmapTemplateId: string
    coreStack: string
    primaryFocus: string
    claimedSeniority: string
    dailyBandwidth: number
    learningPath: string
    experienceStage?: string
  }
  learningState: unknown | null
}

export async function apiRegister(
  email: string,
  password: string,
  name: string,
) {
  const res = await fetch(`${base()}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  })
  return parseJson<{
    token: string
    user: MeResponse['user']
  }>(res)
}

export async function apiLogin(email: string, password: string) {
  const res = await fetch(`${base()}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  return parseJson<{
    token: string
    user: MeResponse['user']
  }>(res)
}

export async function apiMe(token: string) {
  const res = await fetch(`${base()}/api/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return parseJson<MeResponse>(res)
}

export async function apiRoadmapOptions() {
  const res = await fetch(`${base()}/api/roadmap/options`)
  return parseJson<{ templates: RoadmapTemplate[] }>(res)
}

export async function apiRoadmapSuggest(
  token: string,
  body: { goal: string; skills: SkillRow[] },
) {
  const res = await fetch(`${base()}/api/roadmap/suggest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  return parseJson<{
    recommendedTemplate: RoadmapTemplate
    suggestedSkills: string[]
    rationale: string
  }>(res)
}

export async function apiExtractResumeText(text: string) {
  const res = await fetch(`${base()}/api/resume/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  return parseJson<{ skills: string[] }>(res)
}

export async function apiUploadResume(token: string, file: File) {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(`${base()}/api/resume/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  })
  return parseJson<{ text?: string; skills: string[] }>(res)
}

export async function apiSkillsCatalog() {
  const res = await fetch(`${base()}/api/skills/catalog`)
  return parseJson<{ skills: string[] }>(res)
}

export async function apiPutOnboarding(
  token: string,
  body: {
    resumeText: string
    skills: SkillRow[]
    clientGoal: string
    roadmapTemplateId: string
    dailyBandwidth: number
    experienceStage: ExperienceStage
  },
) {
  const res = await fetch(`${base()}/api/me/onboarding`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  return parseJson<{ user: MeResponse['user']; profile: MeResponse['profile'] }>(
    res,
  )
}
