const TEMPLATES = [
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
  let t = TEMPLATES[0]
  if (g.includes('front') || g.includes('ui') || g.includes('react'))
    t = TEMPLATES[1]
  if (g.includes('back') || g.includes('api') || g.includes('server'))
    t = TEMPLATES[2]
  return {
    recommendedTemplate: t,
    suggestedSkills: skillNames.length ? skillNames.slice(0, 5) : ['JavaScript', 'Git'],
    rationale: 'Matched keywords in your goal.',
  }
}

module.exports = {
  TEMPLATES,
  templateById,
  templatesForPick,
  suggestFromGoal,
}
