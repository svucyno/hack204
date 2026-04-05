const path = require('path')
const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const multer = require('multer')
const {
  insertUser,
  byEmail,
  byId,
  updateOnboarding,
  updateLearningState,
} = require('./db.cjs')
const { SKILL_CATALOG, extractSkillsFromText } = require('./skillsLexicon.cjs')
const {
  templateById,
  templatesForPick,
  suggestFromGoal,
} = require('./roadmapTemplates.cjs')

const JWT_SECRET =
  process.env.JWT_SECRET || 'dev-only-change-in-production-les-2026'
const PORT = Number(process.env.PORT) || 3001

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
})

function claimedSeniorityFromLevels(skills) {
  if (!skills || !skills.length) return 'Junior'
  const scores = { basic: 1, intermediate: 2, advanced: 3 }
  const avg =
    skills.reduce((a, s) => a + (scores[s.level] || 1), 0) / skills.length
  if (avg >= 2.5) return 'Senior'
  if (avg >= 1.6) return 'Mid-Level'
  return 'Junior'
}

function authMiddleware(req, res, next) {
  const h = req.headers.authorization
  const token = h?.startsWith('Bearer ') ? h.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.userId = Number(payload.sub)
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

function publicUser(row) {
  if (!row) return null
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    onboardingComplete: Boolean(row.onboarding_complete),
  }
}

function fullProfile(row) {
  if (!row) return null
  let skills = []
  try {
    skills = row.skills_json ? JSON.parse(row.skills_json) : []
  } catch {
    skills = []
  }
  const learningPath = row.learning_path || 'standard'
  const experienceStage =
    row.experience_stage ||
    (learningPath === 'basic' ? 'fresher' : 'intermediate')
  return {
    name: row.name,
    resumeText: row.resume_text || '',
    learningPath,
    experienceStage,
    studyLevel: row.study_level || null,
    skills,
    clientGoal: row.client_goal || '',
    roadmapTemplateId: row.roadmap_template_id || '',
    coreStack: row.core_stack || 'MERN',
    primaryFocus: row.primary_focus || 'Balanced',
    claimedSeniority: row.claimed_seniority || 'Junior',
    dailyBandwidth: row.daily_bandwidth ?? 4,
  }
}

const app = express()
app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/auth/register', async (req, res) => {
  try {
    const email = String(req.body.email || '')
      .trim()
      .toLowerCase()
    const password = String(req.body.password || '')
    const name = String(req.body.name || '').trim()
    if (!email || !password || password.length < 8 || !name) {
      return res.status(400).json({
        error: 'Valid email, password (8+ chars), and name are required.',
      })
    }
    if (byEmail.get(email)) {
      return res.status(409).json({ error: 'Email already registered.' })
    }
    const password_hash = await bcrypt.hash(password, 10)
    const created_at = new Date().toISOString()
    const info = insertUser.run({ email, password_hash, name, created_at })
    const user = byId.get(info.lastInsertRowid)
    const token = jwt.sign({ sub: String(user.id), email }, JWT_SECRET, {
      expiresIn: '30d',
    })
    res.json({ token, user: publicUser(user) })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Registration failed' })
  }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const email = String(req.body.email || '')
      .trim()
      .toLowerCase()
    const password = String(req.body.password || '')
    const row = byEmail.get(email)
    if (!row || !(await bcrypt.compare(password, row.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password.' })
    }
    const token = jwt.sign({ sub: String(row.id), email: row.email }, JWT_SECRET, {
      expiresIn: '30d',
    })
    res.json({ token, user: publicUser(row) })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Login failed' })
  }
})

app.get('/api/skills/catalog', (_req, res) => {
  res.json({ skills: SKILL_CATALOG })
})

app.post('/api/resume/extract', (req, res) => {
  const text = String(req.body.text || '')
  const skills = extractSkillsFromText(text)
  res.json({ skills })
})

app.post('/api/resume/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ error: 'file required' })
    }
    const buf = req.file.buffer
    const ext = path.extname(req.file.originalname || '').toLowerCase()
    const mime = req.file.mimetype || ''
    let text = ''
    if (ext === '.pdf' || mime === 'application/pdf') {
      try {
        const pdfParse = require('pdf-parse')
        const data = await pdfParse(buf)
        text = (data && data.text) || ''
      } catch (e) {
        console.error(e)
        return res.status(422).json({
          error: 'Could not parse PDF. Paste text or use .txt.',
        })
      }
    } else {
      text = buf.toString('utf8')
    }
    const skills = extractSkillsFromText(text)
    res.json({ text, skills })
  } catch (e) {
    console.error(e)
    res.status(400).json({ error: 'Could not read file.' })
  }
})

app.post('/api/roadmap/suggest', authMiddleware, (req, res) => {
  const goal = String(req.body.goal || '')
  const skills = Array.isArray(req.body.skills) ? req.body.skills : []
  const names = skills.map((s) => s.name || s.skill).filter(Boolean)
  const result = suggestFromGoal(goal, names)
  res.json({
    recommendedTemplateId: result.recommendedTemplate.id,
    recommendedTemplate: result.recommendedTemplate,
    suggestedSkills: result.suggestedSkills,
    rationale: result.rationale,
    pickOptions: templatesForPick(),
  })
})

app.get('/api/roadmap/options', (_req, res) => {
  res.json({ templates: templatesForPick() })
})

app.get('/api/me', authMiddleware, (req, res) => {
  const row = byId.get(req.userId)
  if (!row) return res.status(404).json({ error: 'User not found' })
  let learningState = null
  try {
    learningState = row.learning_state_json
      ? JSON.parse(row.learning_state_json)
      : null
  } catch {
    learningState = null
  }
  res.json({
    user: publicUser(row),
    profile: fullProfile(row),
    learningState,
  })
})

app.put('/api/me/onboarding', authMiddleware, (req, res) => {
  const row = byId.get(req.userId)
  if (!row) return res.status(404).json({ error: 'User not found' })

  const resumeText = String(req.body.resumeText || '')
  const skills = Array.isArray(req.body.skills) ? req.body.skills : []
  const clientGoal = String(req.body.clientGoal || '').trim()
  const roadmapTemplateId = String(req.body.roadmapTemplateId || '').trim()
  const dailyBandwidth = Math.min(
    12,
    Math.max(1, Number(req.body.dailyBandwidth) || 4),
  )

  const STAGES = new Set(['fresher', 'beginner', 'intermediate', 'expert'])
  let experience_stage = String(req.body.experienceStage || '')
    .trim()
    .toLowerCase()
  if (!STAGES.has(experience_stage)) {
    const legacy = String(req.body.learningPath || '').toLowerCase()
    experience_stage = legacy === 'basic' ? 'fresher' : 'intermediate'
  }
  const learning_path = experience_stage === 'fresher' ? 'basic' : 'standard'

  let study_level = null
  if (experience_stage !== 'fresher') {
    const sl = String(req.body.studyLevel || '')
      .trim()
      .toLowerCase()
    if (!['basic', 'intermediate'].includes(sl)) {
      return res.status(400).json({
        error:
          'Choose student level: basic or intermediate (not required for Fresher).',
      })
    }
    study_level = sl
  }

  if (!roadmapTemplateId) {
    return res.status(400).json({ error: 'roadmapTemplateId required' })
  }
  const tmpl = templateById(roadmapTemplateId)
  if (!tmpl) {
    return res.status(400).json({ error: 'Unknown roadmap template' })
  }

  if (experience_stage !== 'fresher' && !skills.length) {
    return res.status(400).json({
      error:
        'Add at least one skill, or choose Fresher if you are completely new.',
    })
  }

  for (const s of skills) {
    if (!['basic', 'intermediate', 'advanced'].includes(s.level)) {
      return res.status(400).json({ error: 'Invalid skill level' })
    }
  }

  const claimed_seniority = claimedSeniorityFromLevels(skills)

  updateOnboarding.run({
    id: req.userId,
    resume_text: resumeText,
    skills_json: JSON.stringify(skills),
    client_goal: clientGoal,
    roadmap_template_id: roadmapTemplateId,
    core_stack: tmpl.coreStack,
    primary_focus: tmpl.primaryFocus,
    claimed_seniority,
    daily_bandwidth: dailyBandwidth,
    learning_path,
    experience_stage,
    study_level,
    onboarding_complete: 1,
  })

  const updated = byId.get(req.userId)
  res.json({
    user: publicUser(updated),
    profile: fullProfile(updated),
  })
})

app.post('/api/assistant', authMiddleware, async (req, res) => {
  const message = String(req.body.message || '').trim()
  const context = String(req.body.context || '').trim().slice(0, 6000)
  if (!message) {
    return res.status(400).json({ error: 'message required' })
  }
  const key = process.env.OPENAI_API_KEY
  if (key) {
    try {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                'You are a concise learning coach for software engineering and data analytics. Use short paragraphs and bullet points. If unsure, suggest concrete next steps.',
            },
            {
              role: 'user',
              content: `Program context:\n${context}\n\nLearner question:\n${message}`,
            },
          ],
          max_tokens: 600,
        }),
      })
      const j = await r.json()
      if (!r.ok) {
        return res.status(502).json({
          error: j.error?.message || 'AI service error',
        })
      }
      const text = j.choices?.[0]?.message?.content || ''
      return res.json({ reply: text })
    } catch (e) {
      console.error(e)
      return res.status(502).json({ error: 'AI request failed' })
    }
  }
  res.json({
    reply:
      `Offline assistant (set OPENAI_API_KEY on the server for live AI).\n\n` +
      `You asked: “${message.slice(0, 200)}${message.length > 200 ? '…' : ''}”\n\n` +
      `• Split it into one 25‑minute focus block.\n` +
      `• Re-run the practice questions for this unit.\n` +
      `• Write a 3‑sentence summary of the video in your own words.\n` +
      `• If it’s analytics: check definitions (metric vs dimension, cohort, funnel).`,
  })
})

app.put('/api/me/learning-state', authMiddleware, (req, res) => {
  const row = byId.get(req.userId)
  if (!row) return res.status(404).json({ error: 'User not found' })
  const state = req.body.state
  if (state === undefined) {
    return res.status(400).json({ error: 'state required (or null to clear)' })
  }
  if (state === null) {
    updateLearningState.run(null, req.userId)
  } else {
    updateLearningState.run(JSON.stringify(state), req.userId)
  }
  res.json({ ok: true })
})

app.listen(PORT, () => {
  console.log(`LES API http://localhost:${PORT}`)
})
