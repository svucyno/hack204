/** Canonical skill names for catalog + resume matching (lowercase compare). */
const SKILL_CATALOG = [
  'JavaScript',
  'TypeScript',
  'React',
  'Node.js',
  'Express',
  'MongoDB',
  'SQL',
  'HTML',
  'CSS',
  'Tailwind CSS',
  'Git',
  'REST API',
  'Python',
  'Java',
  'Spring Boot',
  'Docker',
  'AWS',
  'Linux',
  'Data structures',
  'Algorithms',
]

function extractSkillsFromText(text) {
  const lower = String(text || '').toLowerCase()
  const found = new Set()
  for (const skill of SKILL_CATALOG) {
    const key = skill.toLowerCase()
    if (lower.includes(key)) found.add(skill)
  }
  if (/\bjs\b|\bjavascript\b/.test(lower)) found.add('JavaScript')
  if (/\bts\b|\btypescript\b/.test(lower)) found.add('TypeScript')
  return [...found]
}

module.exports = { SKILL_CATALOG, extractSkillsFromText }
