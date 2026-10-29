import { describe, expect, it } from 'vitest'
import { overlappar } from '../domain/overlap.js'
import { kontrolleraRegler } from '../domain/policy.js'
import { ledigaTider } from '../domain/availability.js'

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

describe('kontrolleraRegler', () => {
  const nu = t(8).getTime()
  const aktiva = (n) => Array.from({ length: n }, () => ({}))

  it('accepts a valid booking', () => {
    expect(kontrolleraRegler(iv(10, 12), [], nu)).toEqual({ ok: true })
  })

  it('accepts exactly 4 hours but rejects more', () => {
    expect(kontrolleraRegler(iv(10, 14), [], nu).ok).toBe(true)
    expect(kontrolleraRegler(iv(10, 15), [], nu)).toEqual({ ok: false, fel: 'Max 4 timmar per bokning' })
  })

  it('rejects bookings in the past', () => {
    expect(kontrolleraRegler(iv(7, 9), [], nu)).toEqual({ ok: false, fel: 'Kan inte boka bakåt i tiden' })
  })

  it('allows a booking that starts exactly now', () => {
    expect(kontrolleraRegler(iv(8, 9), [], nu).ok).toBe(true)
  })

  it('allows 2 active bookings but rejects the 4th', () => {
    expect(kontrolleraRegler(iv(10, 11), aktiva(2), nu).ok).toBe(true)
    expect(kontrolleraRegler(iv(10, 11), aktiva(3), nu)).toEqual({ ok: false, fel: 'Max 3 aktiva bokningar' })
  })
})

describe('ledigaTider', () => {
  const dag = [t(0), t(23)]

  it('returns the whole day when there are no bookings', () => {
    expect(ledigaTider([], ...dag)).toEqual([{ start: t(0), end: t(23) }])
  })

  it('returns nothing when a booking covers the whole day', () => {
    expect(ledigaTider([iv(0, 23)], ...dag)).toEqual([])
  })

  it('returns gaps before, between and after bookings', () => {
    expect(ledigaTider([iv(10, 12), iv(14, 16)], ...dag)).toEqual([
      { start: t(0), end: t(10) },
      { start: t(12), end: t(14) },
      { start: t(16), end: t(23) }
    ])
  })

  it('creates no gap between back-to-back bookings', () => {
    expect(ledigaTider([iv(10, 12), iv(12, 14)], ...dag)).toEqual([
      { start: t(0), end: t(10) },
      { start: t(14), end: t(23) }
    ])
  })

  it('handles overlapping and unsorted bookings', () => {
    expect(ledigaTider([iv(12, 15), iv(10, 13), iv(11, 12)], ...dag)).toEqual([
      { start: t(0), end: t(10) },
      { start: t(15), end: t(23) }
    ])
  })
})
