/** YouTube + practice content keyed by roadmap template + study level. */
import { WEB_QUESTIONS, DATA_QUESTIONS } from './questionBank'
export type VideoRef = { title: string; url: string }
export type PracticeQ = {
  question: string
  options: string[]
  correctIndex: number
}
export type ProgramUnit = {
  id: string
  title: string
  summary: string
  videos: VideoRef[]
  practice: PracticeQ[]
}

export type ProgramTrack = {
  title: string
  units: ProgramUnit[]
  /** Issue certificate every N completed units */
  milestoneEvery: number
}

function v(title: string, id: string): VideoRef {
  return { title, url: `https://www.youtube.com/watch?v=${id}` }
}

const analyticsUnitsBasic: ProgramUnit[] = [
  {
    id: 'da-1',
    title: 'What is data analytics?',
    summary: 'Roles, tools, and how analytics supports decisions.',
    videos: [v('What Is Data Analytics? — overview', 'zCANbazqcPw')],
    practice: [
      {
        question: 'What is the main purpose of data analytics?',
        options: [
          'Replace all human decisions',
          'Turn data into actionable insight',
          'Store files only',
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    id: 'da-2',
    title: 'KPIs & metrics',
    summary: 'Leading vs lagging indicators and SMART KPIs.',
    videos: [v('KPIs and performance metrics — intro', 'ryGrsedibQk')],
    practice: [
      {
        question: 'A KPI should ideally be:',
        options: ['Vague', 'SMART and aligned to goals', 'Only about revenue'],
        correctIndex: 1,
      },
    ],
  },
  {
    id: 'da-3',
    title: 'SQL foundations',
    summary: 'SELECT, WHERE, GROUP BY mindset.',
    videos: [v('SQL basics — short intro', 'w-0p3OEbpdQ')],
    practice: [
      {
        question: 'Which clause filters rows before grouping?',
        options: ['GROUP BY', 'WHERE', 'ORDER BY'],
        correctIndex: 1,
      },
    ],
  },
  {
    id: 'da-4',
    title: 'Spreadsheets for analysis',
    summary: 'Cleaning, pivot tables, common pitfalls.',
    videos: [v('Excel for data analysis — patterns', 'h9MbznbxlLw')],
    practice: [
      {
        question: 'Pivot tables are mainly used to:',
        options: [
          'Animate charts',
          'Summarize and slice aggregated data',
          'Write SQL',
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    id: 'da-5',
    title: 'Data visualization principles',
    summary: 'Choosing chart types and avoiding clutter.',
    videos: [v('Data visualization — core ideas', '5NZc51mGfvE')],
    practice: [
      {
        question: 'For part-to-whole at a glance, often use:',
        options: ['Scatter plot', 'Pie or stacked bar (with care)', 'Histogram'],
        correctIndex: 1,
      },
    ],
  },
  {
    id: 'da-6',
    title: 'Statistics intuition',
    summary: 'Mean vs median, variance, sampling basics.',
    videos: [v('Statistics — intuitive intro', '9yeOJ0ZMUYw')],
    practice: [
      {
        question: 'The median is robust to:',
        options: ['Skew and outliers', 'Nothing', 'Only categorical data'],
        correctIndex: 0,
      },
    ],
  },
  {
    id: 'da-7',
    title: 'Dashboards & storytelling',
    summary: 'Narrative, audience, and iteration.',
    videos: [v('Dashboard design tips', 'WWrIopw1MrA')],
    practice: [
      {
        question: 'A good analytics story should:',
        options: [
          'Hide assumptions',
          'State context, insight, and recommended action',
          'Use only raw tables',
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    id: 'da-8',
    title: 'A/B testing basics',
    summary: 'Hypothesis, sample size, ethics.',
    videos: [v('A/B testing explained', 'zFMgYeJPMjg')],
    practice: [
      {
        question: 'A/B tests compare:',
        options: [
          'Two populations without a hypothesis',
          'A control vs variant on a metric',
          'Only historical reports',
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    id: 'da-9',
    title: 'Career path & portfolio',
    summary: 'Projects that prove analytics skills.',
    videos: [v('Analytics portfolio ideas', '1uFVOnVOj2s')],
    practice: [
      {
        question: 'A strong portfolio piece usually includes:',
        options: [
          'Only certificates',
          'Problem, data, methods, visuals, takeaway',
          'Screenshots without context',
        ],
        correctIndex: 1,
      },
    ],
  },
]

const analyticsUnitsIntermediate: ProgramUnit[] = analyticsUnitsBasic.map(
  (u, i) => ({
    ...u,
    id: u.id + '-i',
    practice: [
      {
        question:
          i % 2 === 0
            ? 'When might you prefer a cohort analysis over a simple funnel?'
            : 'Name one trade-off when using a rolling 7-day window vs calendar weeks.',
        options: [
          'Never — funnels always win',
          'Cohort tracks behavior of groups over time; rolling windows smooth noise but blur seasonality',
          'They are identical',
        ],
        correctIndex: 1,
      },
      ...u.practice,
    ],
  }),
)

const webUnitsBasic: ProgramUnit[] = [
  {
    id: 'w-1',
    title: 'Modern JavaScript essentials',
    summary: 'Variables, functions, async thinking.',
    videos: [v('JavaScript in 100 seconds', 'DHjqpvDnNGE')],
    practice: [
      {
        question: '`const` bindings are:',
        options: [
          'Reassignable to any value',
          'Not reassignable; object properties may still change',
          'Only for numbers',
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    id: 'w-2',
    title: 'React mental model',
    summary: 'Components, props, state.',
    videos: [v('React in 100 seconds', 'Tn6-IpvhUjk')],
    practice: [
      {
        question: 'Props flow:',
        options: [
          'Child to parent only',
          'Parent to child (one-way data flow)',
          'Sideways only',
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    id: 'w-3',
    title: 'REST APIs',
    summary: 'HTTP verbs, status codes, JSON.',
    videos: [v('REST API concepts', 'SLwpqD4nZLI')],
    practice: [
      {
        question: 'Which verb is idempotent for updates?',
        options: ['POST', 'PATCH (often) / PUT', 'CONNECT'],
        correctIndex: 1,
      },
    ],
  },
  {
    id: 'w-4',
    title: 'Git workflow',
    summary: 'Branches, PRs, clean history.',
    videos: [v('Git & GitHub quick intro', 'RGOj5yH7evk')],
    practice: [
      {
        question: 'Before opening a PR you usually:',
        options: [
          'Commit to main directly',
          'Push a feature branch and compare',
          'Delete the remote',
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    id: 'w-5',
    title: 'Node & Express',
    summary: 'Server structure, middleware.',
    videos: [v('Node.js intro', 'TlB_eWDSMt4')],
    practice: [
      {
        question: 'Middleware in Express runs:',
        options: [
          'Only after response sent',
          'In order for matching routes',
          'Never',
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    id: 'w-6',
    title: 'MongoDB basics',
    summary: 'Documents, indexes, queries.',
    videos: [v('MongoDB in 100 seconds', 'pSWmPLHiR10')],
    practice: [
      {
        question: 'MongoDB stores documents as:',
        options: ['Relational rows only', 'BSON documents in collections', 'CSV only'],
        correctIndex: 1,
      },
    ],
  },
  {
    id: 'w-7',
    title: 'Auth & security mindset',
    summary: 'JWT, cookies, OWASP basics.',
    videos: [v('Web security concepts', 'inWWhrCtnko')],
    practice: [
      {
        question: 'Passwords should be stored:',
        options: ['Plain text', 'Hashed with a strong algorithm', 'Base64 only'],
        correctIndex: 1,
      },
    ],
  },
  {
    id: 'w-8',
    title: 'Deployment',
    summary: 'Environments, env vars, health checks.',
    videos: [v('Deploying apps — overview', 'kRYP1t6GeXA')],
    practice: [
      {
        question: 'Secrets like API keys belong in:',
        options: [
          'GitHub public repo',
          'Environment variables / secret manager',
          'Client-side bundle',
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    id: 'w-9',
    title: 'Capstone planning',
    summary: 'Scope, README, demo.',
    videos: [v('Shipping a portfolio project', 'ONvbFTigWqE')],
    practice: [
      {
        question: 'A capstone README should include:',
        options: [
          'Only emojis',
          'Problem, setup, architecture, and how to run',
          'Nothing',
        ],
        correctIndex: 1,
      },
    ],
  },
]

const webUnitsIntermediate: ProgramUnit[] = webUnitsBasic.map((u) => ({
  ...u,
  id: u.id + '-i',
  practice: [
    {
      question:
        'Which design choice reduces coupling between UI and data fetching in React?',
      options: [
        'Fetch inside every leaf component',
        'Custom hooks or data layer + presentational split',
        'Global mutable singletons only',
      ],
      correctIndex: 1,
    },
    ...u.practice,
  ],
}))

function padTo90Days(units: ProgramUnit[]): ProgramUnit[] {
  const result: ProgramUnit[] = []
  for (let i = 0; i < 90; i++) {
    const base = units[i % units.length]
    result.push({
      ...base,
      id: `${base.id}-day${i + 1}`,
      title: `${base.title} (Part ${Math.floor(i / units.length) + 1})`,
    })
  }
  return result
}

function padTo20Bits(units: ProgramUnit[], trackType: 'web' | 'data'): ProgramUnit[] {
  const bank = trackType === 'web' ? WEB_QUESTIONS : DATA_QUESTIONS
  let bankCursor = 0

  return units.map((u) => {
    const practice = [...u.practice]
    while (practice.length < 20) {
      practice.push(bank[bankCursor % bank.length])
      bankCursor++
    }
    return { ...u, practice }
  })
}

export function getProgramTrack(
  templateId: string,
  studyLevel: 'basic' | 'intermediate' | null,
  isFresher: boolean,
): ProgramTrack {
  const level: 'basic' | 'intermediate' =
    isFresher || studyLevel === null ? 'basic' : studyLevel

  if (templateId === 'data-analytics') {
    return {
      title: 'Data & analytics roadmap',
      units: padTo20Bits(
        padTo90Days(
          level === 'intermediate'
            ? analyticsUnitsIntermediate
            : analyticsUnitsBasic,
        ), 'data'
      ),
      milestoneEvery: 30,
    }
  }

  return {
    title: 'Web development roadmap',
    units: padTo20Bits(
      padTo90Days(
        level === 'intermediate' ? webUnitsIntermediate : webUnitsBasic,
      ), 'web'
    ),
    milestoneEvery: 30,
  }
}
