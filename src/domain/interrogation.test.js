import { describe, expect, it } from 'vitest'
import {
  CLUES,
  SUSPECTS,
  buildSystemPrompt,
  computeScoreForSuspect,
  pickMood,
  scoreToLevel
} from './interrogation'

describe('computeScoreForSuspect', () => {
  it('returns zero when no clues are active', () => {
    const score = computeScoreForSuspect(new Set(), 'A')
    expect(score).toBe(0)
  })

  it('sums multiple clue weights for the suspect', () => {
    const active = new Set(['P4', 'P5'])
    const score = computeScoreForSuspect(active, 'B')
    expect(score).toBe(3)
  })
})

describe('scoreToLevel', () => {
  it('caps the level at L3', () => {
    expect(scoreToLevel(3)).toBe('L3')
    expect(scoreToLevel(6)).toBe('L3')
  })
})

describe('pickMood', () => {
  it('keeps baseline with no pressure', () => {
    expect(pickMood('Pensativo', 0, 'A')).toBe('Pensativo')
  })

  it('changes mood based on suspect rules', () => {
    expect(pickMood(SUSPECTS.B.baselineMood, 1, 'B')).toBe('Nervioso')
    expect(pickMood(SUSPECTS.B.baselineMood, 2, 'B')).toBe('Cabreado')
    expect(pickMood(SUSPECTS.C.baselineMood, 1, 'C')).toBe('Pensativo')
    expect(pickMood('Pensativo', 1, 'A')).toBe('Evitativo')
  })
})

describe('buildSystemPrompt', () => {
  it('uses the empty clue placeholder when no clues are active', () => {
    const prompt = buildSystemPrompt('A', 'L0', new Set())
    expect(prompt).toContain('Pruebas presentadas: (ninguna).')
  })

  it('lists active clue labels in the prompt', () => {
    const active = new Set(['P2', 'P7'])
    const prompt = buildSystemPrompt('C', 'L2', active)
    const expectedLabels = CLUES.filter(c => active.has(c.id)).map(c => c.label).join(', ')
    expect(prompt).toContain(`Pruebas presentadas: ${expectedLabels}.`)
    expect(prompt).toContain('Nivel actual: L2.')
  })
})
