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
  /* Analytics & data (resume / PDF) */
  'Excel',
  'Google Analytics',
  'Tableau',
  'Power BI',
  'Statistics',
  'Data visualization',
  'ETL',
  'Machine learning',
  'Pandas',
  'NumPy',
  'R',
  'Spark',
  'Snowflake',
  'BigQuery',
  'Looker',
  'A/B testing',
  'KPIs',
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
  if (/\banalytics\b|\bbi\b|\bbusiness intelligence\b/.test(lower))
    found.add('Data visualization')
  if (/\bdata engineer/.test(lower)) found.add('ETL')
  if (/\bdata scientist/.test(lower)) found.add('Machine learning')
  return [...found]
}

module.exports = { SKILL_CATALOG, extractSkillsFromText }
