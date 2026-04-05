export type ExperienceStage =
  | 'fresher'
  | 'beginner'
  | 'intermediate'
  | 'expert'

export type LearningPath = 'basic' | 'standard'

export type SkillRow = {
  name: string
  level: 'basic' | 'intermediate' | 'advanced'
}

export type RoadmapTemplate = {
  id: string
  title: string
  description: string
  coreStack: string
  primaryFocus: string
}
