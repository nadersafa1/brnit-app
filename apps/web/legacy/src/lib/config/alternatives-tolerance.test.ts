import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  getAlternativesToleranceConfig,
  resetAlternativesToleranceCache,
} from './alternatives-tolerance'

const originalEnv = process.env

describe('getAlternativesToleranceConfig', () => {
  beforeEach(() => {
    process.env = { ...originalEnv }
    resetAlternativesToleranceCache()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('returns default 15 for all macros when env is unset', () => {
    delete process.env.ALTERNATIVES_TOLERANCE_CAL_PCT
    delete process.env.ALTERNATIVES_TOLERANCE_PROTEIN_PCT
    delete process.env.ALTERNATIVES_TOLERANCE_CARBS_PCT
    delete process.env.ALTERNATIVES_TOLERANCE_FAT_PCT
    const config = getAlternativesToleranceConfig()
    expect(config.caloriesPct).toBe(15)
    expect(config.proteinPct).toBe(15)
    expect(config.carbsPct).toBe(15)
    expect(config.fatPct).toBe(15)
  })

  it('parses env vars and clamps to 1-100', () => {
    process.env.ALTERNATIVES_TOLERANCE_CAL_PCT = '10'
    process.env.ALTERNATIVES_TOLERANCE_PROTEIN_PCT = '200'
    process.env.ALTERNATIVES_TOLERANCE_CARBS_PCT = '0'
    process.env.ALTERNATIVES_TOLERANCE_FAT_PCT = '25'
    const config = getAlternativesToleranceConfig()
    expect(config.caloriesPct).toBe(10)
    expect(config.proteinPct).toBe(100)
    expect(config.carbsPct).toBe(1)
    expect(config.fatPct).toBe(25)
  })
})
