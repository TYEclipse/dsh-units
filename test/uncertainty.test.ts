/**
 * Uncertainty propagation for convert_unit: a value that carries a ± half-width
 * converted between units.
 *
 * ORACLE: test/oracle/anchors.py
 * Every numeric expectation below — band ends, half-widths, relative errors and
 * the three rendered lines — is printed by that script under
 * "# convert_unit uncertainty anchors" and "# renderer anchors"; `--check`
 * validates the band against definitional rulers (±1 °C = ±1.8 °F from
 * F = C·9/5 + 32, ±0.5 in = ±12.7 mm from inch = 25.4 mm, and the reciprocal
 * 20 mpg ∓ 1 → 235.2145833/19 and /21 L/100km).
 *
 * Three mapping classes, three different answers — this file pins all three:
 * linear scales the error, a temperature scale only scales a *difference*
 * (never applies the offset), and fuel economy is reported as a range because
 * it is reciprocal.
 */

import { describe, expect, it } from 'vitest'
import { convert, convertWithUncertainty, type Uncertainty } from '../src/units.ts'

/** Strict lossless check: no undefined live keys, no -0, no non-finite numbers. */
function assertLossless(value: unknown, path = '$'): void {
  if (typeof value === 'number') {
    expect(Number.isFinite(value), `${path} must be finite`).toBe(true)
    expect(Object.is(value, -0), `${path} must not be -0`).toBe(false)
    return
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertLossless(entry, `${path}[${index}]`))
    return
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      expect(entry, `${path}.${key} must not be undefined`).not.toBeUndefined()
      assertLossless(entry, `${path}.${key}`)
    }
  }
}

describe('uncertainty on linear units', () => {
  it('scales the half-width with the same factor as the value', () => {
    const out = convertWithUncertainty(12.3, 0.5, 'km', 'mi')
    expect(out.result).toBe(7.642866)
    expect(out.uncertainty).toMatchObject({
      input_error: 0.5,
      relative_percent: 4.065041,
      result_error: 0.310686,
      result_low: 7.33218,
      result_high: 7.953551,
      symmetric: true,
    })
  })

  it('keeps the relative error unchanged across a linear conversion', () => {
    const out = convertWithUncertainty(1.5, 0.05, 'kg', 'lb')
    expect(out.result).toBe(3.306934)
    expect(out.uncertainty.relative_percent).toBe(3.333333)
    // The band's own relative size is the same 3.333333 % — that is what
    // "linear" buys you, and the field would be a lie if it moved.
    const bandRelative = ((out.uncertainty.result_error as number) / out.result) * 100
    expect(bandRelative).toBeCloseTo(3.333333, 4)
  })

  it('handles binary vs decimal data units', () => {
    const out = convertWithUncertainty(2.5, 0.25, 'GiB', 'MB')
    expect(out.result).toBe(2684.35456)
    expect(out.uncertainty).toMatchObject({
      relative_percent: 10, result_error: 268.435456,
      result_low: 2415.919104, result_high: 2952.790016,
    })
  })

  it('collapses the band onto the result when the error is zero', () => {
    const out = convertWithUncertainty(10, 0, 'm', 'ft')
    expect(out.result).toBe(32.808399)
    expect(out.uncertainty.result_error).toBe(0)
    expect(out.uncertainty.result_low).toBe(out.result)
    expect(out.uncertainty.result_high).toBe(out.result)
  })
})

describe('uncertainty on affine temperatures', () => {
  it('converts ±1 °C into ±1.8 °F — a difference, not a point', () => {
    const out = convertWithUncertainty(100, 1, 'c', 'f')
    expect(out.result).toBe(212)
    expect(out.uncertainty.result_error).toBe(1.8)
    expect(out.uncertainty.result_low).toBe(210.2)
    expect(out.uncertainty.result_high).toBe(213.8)
    // The trap this test exists for: applying the *point* formula to an error
    // (1 × 9/5 + 32) would give a band 18× too wide.
    expect(out.uncertainty.result_error).not.toBe((1 * 9) / 5 + 32)
  })

  it('does not claim a relative error on an arbitrary-zero scale', () => {
    const out = convertWithUncertainty(100, 1, 'c', 'f')
    expect('relative_percent' in out.uncertainty).toBe(false)
  })

  it('uses 5/9 for Fahrenheit → Celsius and 1 for Kelvin → Celsius', () => {
    expect(convertWithUncertainty(350, 2, 'f', 'c').uncertainty.result_error).toBe(1.111111)
    expect(convertWithUncertainty(300, 1.5, 'k', 'c').uncertainty.result_error).toBe(1.5)
  })

  it('reports the °C → °F band around 0 °C without a relative error', () => {
    const out = convertWithUncertainty(0, 2, 'c', 'f')
    expect(out.result).toBe(32)
    expect(out.uncertainty.result_error).toBe(3.6)
    expect(out.uncertainty.result_low).toBe(28.4)
    expect(out.uncertainty.result_high).toBe(35.6)
    expect('relative_percent' in out.uncertainty).toBe(false)
  })
})

describe('uncertainty on reciprocal fuel economy', () => {
  it('reports an asymmetric range instead of a fake ±', () => {
    const out = convertWithUncertainty(20, 1, 'mpg', 'l/100km')
    expect(out.result).toBe(11.760729)
    expect(out.uncertainty).toMatchObject({
      relative_percent: 5, result_low: 11.200694, result_high: 12.379715, symmetric: false,
    })
    expect('result_error' in out.uncertainty).toBe(false)
  })

  it('is not centred on the nominal result', () => {
    const out = convertWithUncertainty(20, 1, 'mpg', 'l/100km')
    const below = out.result - out.uncertainty.result_low
    const above = out.uncertainty.result_high - out.result
    expect(Math.abs(below - above)).toBeGreaterThan(1e-3)
    // −1 mpg is the *larger* consumption (19 mpg), so the far end belongs to it.
    expect(below).toBeCloseTo(0.560035, 5)
    expect(above).toBeCloseTo(0.618986, 5)
  })

  it('refuses a band that reaches zero', () => {
    expect(() => convertWithUncertainty(1, 1, 'mpg', 'l/100km')).toThrow(/crosses zero/)
    expect(() => convertWithUncertainty(1, 2, 'mpg', 'l/100km')).toThrow(/crosses zero/)
  })
})

describe('uncertainty input validation', () => {
  it('rejects a negative or non-finite error', () => {
    expect(() => convertWithUncertainty(10, -1, 'm', 'ft')).toThrow(/finite number ≥ 0/)
    expect(() => convertWithUncertainty(10, Number.NaN, 'm', 'ft')).toThrow(/finite number ≥ 0/)
    expect(() => convertWithUncertainty(10, Number.POSITIVE_INFINITY, 'm', 'ft')).toThrow(/finite number ≥ 0/)
  })

  it('still validates the conversion itself', () => {
    expect(() => convertWithUncertainty(1, 0.1, 'km', 'kg')).toThrow(/must share a category/)
    expect(() => convertWithUncertainty(1, 0.1, 'parsecs', 'm')).toThrow(/unknown unit/)
  })

  it('omits uncertainty entirely for a bare conversion', () => {
    expect('uncertainty' in convert(12.3, 'km', 'mi')).toBe(false)
  })
})

describe('lossless output', () => {
  const cases: Array<[number, number, string, string]> = [
    [12.3, 0.5, 'km', 'mi'], [100, 1, 'c', 'f'], [20, 1, 'mpg', 'l/100km'],
    [0, 2, 'c', 'f'], [3.4, 0.2, 'gpm', 'l/min'],
  ]

  it('keeps every field finite, defined and free of -0', () => {
    for (const [value, error, from, to] of cases) {
      assertLossless(convertWithUncertainty(value, error, from, to))
    }
  })

  it('survives a JSON round trip unchanged', () => {
    for (const [value, error, from, to] of cases) {
      const out = convertWithUncertainty(value, error, from, to)
      expect(JSON.parse(JSON.stringify(out))).toEqual(out)
    }
  })

  it('normalizes a negative zero input to +0, not -0', () => {
    // -0 is a real input space in JS (`Object.is(-0, 0)` is false) and JSON
    // writes it as "0"; both the plain and the banded path must return +0.
    const plain = convert(-0, 'm', 'm')
    expect(Object.is(plain.result, -0)).toBe(false)
    expect(plain.result).toBe(0)
    const banded = convertWithUncertainty(-0, 0, 'm', 'm')
    expect(Object.is(banded.result, -0)).toBe(false)
    expect(Object.is(banded.uncertainty.result_low, -0)).toBe(false)
    expect(banded.uncertainty.result_low).toBe(0)
    expect(banded.uncertainty.result_high).toBe(0)
  })
})

describe('band arithmetic invariants', () => {
  const cases: Array<[number, number, string, string]> = [
    [12.3, 0.5, 'km', 'mi'], [1.5, 0.05, 'kg', 'lb'], [2.5, 0.25, 'GiB', 'MB'],
    [100, 1, 'c', 'f'], [350, 2, 'f', 'c'], [300, 1.5, 'k', 'c'], [3.4, 0.2, 'gpm', 'l/min'],
  ]

  it('keeps the half-width equal to half the band', () => {
    for (const [value, error, from, to] of cases) {
      const band: Uncertainty = convertWithUncertainty(value, error, from, to).uncertainty
      const half = ((band.result_high as number) - band.result_low) / 2
      expect(half).toBeCloseTo(band.result_error as number, 5)
      expect(band.result_low).toBeLessThanOrEqual(band.result_high)
    }
  })

  it('matches the endpoints of converting value ∓ error directly', () => {
    for (const [value, error, from, to] of cases) {
      const band = convertWithUncertainty(value, error, from, to).uncertainty
      const low = convert(value - error, from, to, 6).result
      const high = convert(value + error, from, to, 6).result
      expect(band.result_low).toBeCloseTo(Math.min(low, high), 5)
      expect(band.result_high).toBeCloseTo(Math.max(low, high), 5)
    }
  })
})
