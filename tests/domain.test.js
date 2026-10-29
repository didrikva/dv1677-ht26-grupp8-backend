import { describe, expect, it } from 'vitest'
import { overlappar } from '../domain/overlap.js'

const t = (h) => new Date(`2026-01-01T${String(h).padStart(2, '0')}:00:00.000Z`)
const iv = (start, end) => ({ start: t(start), end: t(end) })

describe('overlappar', () => {
  it('detects partial overlap in both directions', () => {
    expect(overlappar(iv(9, 11), iv(10, 12))).toBe(true)
    expect(overlappar(iv(10, 12), iv(9, 11))).toBe(true)
  })

  it('detects one interval inside the other', () => {
    expect(overlappar(iv(8, 14), iv(10, 12))).toBe(true)
    expect(overlappar(iv(10, 12), iv(8, 14))).toBe(true)
  })

  it('detects identical intervals', () => {
    expect(overlappar(iv(10, 12), iv(10, 12))).toBe(true)
  })

  it('does not count back-to-back bookings as overlap', () => {
    expect(overlappar(iv(8, 10), iv(10, 12))).toBe(false)
    expect(overlappar(iv(10, 12), iv(8, 10))).toBe(false)
  })

  it('does not overlap when there is a gap', () => {
    expect(overlappar(iv(8, 9), iv(10, 12))).toBe(false)
  })
})
