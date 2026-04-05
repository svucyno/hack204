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

/** Synced to server via PUT /api/me/learning-state */
export type LearningProgressStateV1 = {
  version: 1
  completedUnitIds: string[]
  /** unitId -> practice score 0–100 */
  unitScores: Record<string, number>
  currentUnitIndex: number
  /** Milestone phases already celebrated (1 = after 3 units, 2 after 6, …) */
  milestonesEarned: number[]
  updatedAt: string
}

export function createEmptyProgress(): LearningProgressStateV1 {
  return {
    version: 1,
    completedUnitIds: [],
    unitScores: {},
    currentUnitIndex: 0,
    milestonesEarned: [],
    updatedAt: new Date().toISOString(),
  }
}
