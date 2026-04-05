const TEMPLATES = [
  {
    id: 'data-analytics',
    title: 'Data & analytics',
    description:
      'SQL, spreadsheets, visualization, KPIs — roadmap tuned for analytics goals.',
    coreStack: 'MERN',
    primaryFocus: 'Balanced',
  },
  {
    id: 'mern-fullstack',
    title: 'MERN full-stack',
    description: 'MongoDB, Express, React, Node — end-to-end web apps.',
    coreStack: 'MERN',
    primaryFocus: 'Balanced',
  },
  {
    id: 'frontend-react',
    title: 'Frontend (React)',
    description: 'UI, state, performance, and modern React patterns.',
    coreStack: 'MERN',
    primaryFocus: 'Frontend Heavy',
  },
  {
    id: 'backend-node',
    title: 'Backend & APIs',
    description: 'REST, auth, databases, and services.',
    coreStack: 'MERN',
    primaryFocus: 'Backend/DevOps Heavy',
  },
]

function templateById(id) {
  return TEMPLATES.find((t) => t.id === id) || null
}

function templatesForPick() {
  return TEMPLATES
}

function suggestFromGoal(goal, skillNames) {
  const g = String(goal || '').toLowerCase()
  let t = TEMPLATES.find((x) => x.id === 'mern-fullstack') || TEMPLATES[0]
  let rationale = 'Default full-stack roadmap.'

  if (
    g.includes('analytic') ||
    g.includes('data science') ||
    g.includes('bi ') ||
    g.includes('business intelligence') ||
    g.includes('dashboard') ||
    g.includes('sql') ||
    g.includes('tableau') ||
    g.includes('power bi') ||
    g.includes('kpi')
  ) {
    t = TEMPLATES.find((x) => x.id === 'data-analytics') || t
    rationale =
      'Your goal mentions analytics, data, BI, or dashboards — we matched the Data & analytics roadmap.'
  } else if (g.includes('front') || g.includes('ui') || g.includes('react')) {
    t = TEMPLATES.find((x) => x.id === 'frontend-react') || t
    rationale = 'Matched frontend / UI keywords in your goal.'
  } else if (
    g.includes('back') ||
    g.includes('api') ||
    g.includes('server')
  ) {
    t = TEMPLATES.find((x) => x.id === 'backend-node') || t
    rationale = 'Matched backend / API keywords in your goal.'
  }

  const analyticsSkills = [
    'SQL',
    'Excel',
    'Python',
    'Statistics',
    'Tableau',
    'Data visualization',
  ]
  const suggested =
    t.id === 'data-analytics'
      ? analyticsSkills.filter((s) => !skillNames.includes(s)).slice(0, 5)
      : skillNames.length
        ? skillNames.slice(0, 5)
        : ['JavaScript', 'Git']

  return {
    recommendedTemplate: t,
    suggestedSkills:
      suggested.length > 0 ? suggested : ['JavaScript', 'Git'],
    rationale,
  }
}

module.exports = {
  TEMPLATES,
  templateById,
  templatesForPick,
  suggestFromGoal,
}
