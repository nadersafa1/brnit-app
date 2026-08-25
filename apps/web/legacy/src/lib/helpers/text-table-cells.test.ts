import { describe, expect, it } from 'vitest'
import { tableCellTextPreview } from './text-table-cells'

describe('tableCellTextPreview', () => {
  it('returns em dash for empty values', () => {
    expect(tableCellTextPreview(null)).toBe('–')
    expect(tableCellTextPreview(undefined)).toBe('–')
    expect(tableCellTextPreview('')).toBe('–')
  })

  it('returns full string when within max length', () => {
    expect(tableCellTextPreview('short')).toBe('short')
    expect(tableCellTextPreview('x'.repeat(50))).toBe('x'.repeat(50))
  })

  it('truncates with ellipsis when over max length', () => {
    const long = 'a'.repeat(51)
    expect(tableCellTextPreview(long)).toBe(`${'a'.repeat(50)}…`)
  })

  it('respects custom max length', () => {
    expect(tableCellTextPreview('hello', 3)).toBe('hel…')
  })
})
