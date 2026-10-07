/**
 * Unit tests for the conversion engine: linear factors, affine temperatures,
 * aliases, data sizes (decimal vs binary), flow rate, density, unit prices,
 * error paths, and unit listing.
 *
 * ORACLE: test/oracle/anchors.py
 * Every numeric expectation below is printed by that script (run it to review
 * the expected values; `--check` validates the table against definitional
 * identities such as 1 in = 25.4 mm, 1 gal = 3.785411784 L, g₀ = 9.80665 m/s²).
 */

import { describe, expect, it } from 'vitest'
import { convert, listUnits, resolveUnit, unitPrice, CATEGORIES, MAX_PRICE_OFFERS } from '../src/units.ts'

describe('linear conversions', () => {
  it('converts length with exact factors', () => {
    expect(convert(100, 'km', 'mi').result).toBe(62.137119)
    expect(convert(1, 'mi', 'km').result).toBe(1.609344)
    expect(convert(12, 'in', 'cm').result).toBe(30.48)
  })

  it('converts mass and pressure', () => {
    expect(convert(1, 'kg', 'lb').result).toBe(2.204623)
    expect(convert(1, 'atm', 'pa').result).toBe(101325)
    expect(convert(16, 'oz', 'lb').result).toBe(1)
  })

  it('converts speed and time durations', () => {
    expect(convert(100, 'km/h', 'mph').result).toBe(62.137119)
    expect(convert(1.5, 'h', 'min').result).toBe(90)
    expect(convert(1, 'wk', 'd').result).toBe(7)
    expect(convert(1, 'yr', 'd').result).toBe(365.25)
  })

  it('converts frequency and angle', () => {
    expect(convert(60, 'rpm', 'hz').result).toBe(1)
    expect(convert(180, 'deg', 'rad').result).toBe(3.141593)
  })

  it('converts energy and volume', () => {
    expect(convert(1, 'kwh', 'j').result).toBe(3_600_000)
    expect(convert(1, 'gal', 'l').result).toBe(3.785412)
    expect(convert(1, 'cup', 'ml').result).toBe(240)
  })

  it('supports negative values', () => {
    expect(convert(-10, 'km', 'm').result).toBe(-10_000)
  })
})

describe('data sizes: decimal vs binary', () => {
  it('distinguishes MB from MiB', () => {
    expect(convert(1, 'MB', 'MiB').result).toBe(0.953674)
    expect(convert(500, 'MiB', 'MB').result).toBe(524.288)
    expect(convert(1, 'MB', 'b').result).toBe(1_000_000)
    expect(convert(1, 'MiB', 'b').result).toBe(1_048_576)
  })

  it('converts bits and bytes', () => {
    expect(convert(8, 'bit', 'b').result).toBe(1)
    expect(convert(1, 'gb', 'mbit').result).toBe(8_000)
  })
})

describe('temperature (affine)', () => {
  it('applies offset-aware formulas', () => {
    expect(convert(100, 'c', 'f').result).toBe(212)
    expect(convert(32, 'f', 'c').result).toBe(0)
    expect(convert(0, 'c', 'k').result).toBe(273.15)
    expect(convert(-40, 'c', 'f').result).toBe(-40)
    expect(convert(0, 'f', 'k').result).toBe(255.372222)
    expect(convert(300, 'k', 'c').result).toBe(26.85)
  })
})

describe('typography (linear, 96 dpi)', () => {
  it('converts px/pt/pc with exact print ratios', () => {
    expect(convert(16, 'px', 'pt').result).toBe(12)
    expect(convert(72, 'pt', 'px').result).toBe(96)
    expect(convert(1, 'pc', 'pt').result).toBe(12)
    expect(convert(2, 'pt', 'px').result).toBe(2.666667)
  })

  it('converts em/rem against the 16 px base font', () => {
    expect(convert(2, 'em', 'px').result).toBe(32)
    expect(convert(16, 'px', 'em').result).toBe(1)
    expect(convert(1.5, 'rem', 'pt').result).toBe(18)
  })

  it('treats "pt" as point (not pint) and keeps pint resolvable', () => {
    expect(resolveUnit('pt').category.id).toBe('typography')
    expect(resolveUnit('pt').unit.symbol).toBe('pt')
    expect(resolveUnit('pint').category.id).toBe('volume')
    expect(convert(1, 'pint', 'l').result).toBe(0.473176)
  })
})

describe('fuel economy (reciprocal)', () => {
  it('converts mpg to L/100km with exact anchors', () => {
    expect(convert(20, 'mpg', 'l/100km').result).toBe(11.760729)
    expect(convert(10, 'mpg(uk)', 'l/100km').result).toBe(28.248094)
    expect(convert(1, 'mpg', 'km/l').result).toBe(0.425144)
  })

  it('converts L/100km and km/L', () => {
    expect(convert(1, 'l/100km', 'km/l').result).toBe(100)
    expect(convert(8.5, 'km/l', 'l/100km').result).toBe(11.764706)
    expect(convert(1, 'km/l', 'mpg').result).toBe(2.352146)
    expect(convert(8.5, 'km/l', 'mpg(uk)').result).toBe(24.01088)
  })

  it('accepts common aliases and reports a readable formula', () => {
    expect(convert(20, 'usmpg', 'litersper100km').result).toBe(11.760729)
    expect(convert(20, 'mpg', 'km/l').result).toBe(8.502874)
    expect(convert(20, 'UK mpg', 'kmpl').result).toBe(7.080124)
    expect(convert(20, 'mpg', 'l/100km').formula).toBe('235.214583 ÷ x → x')
  })
})

describe('power (mechanics, linear)', () => {
  it('distinguishes the three horsepower definitions', () => {
    expect(convert(1, 'hp', 'w').result).toBe(745.699872) // mechanical = 550 ft·lbf/s
    expect(convert(1, 'hp(m)', 'w').result).toBe(735.49875) // metric PS = 75 kgf·m/s
    expect(convert(1, 'hp(e)', 'w').result).toBe(746) // electric
    expect(convert(1, 'hp', 'hp(m)').result).toBe(1.01387)
  })

  it('converts watts, kilowatts and BTU per hour', () => {
    expect(convert(1, 'kw', 'hp').result).toBe(1.341022)
    expect(convert(1, 'kw', 'btu/h').result).toBe(3412.141633)
    expect(convert(550, 'ftlb/s', 'hp').result).toBe(1)
  })

  it('accepts PS/CV aliases for metric horsepower', () => {
    expect(convert(1, 'ps', 'w').result).toBe(735.49875)
    expect(convert(1, 'cv', 'hp').result).toBe(0.98632)
  })
})

describe('force (linear, standard gravity)', () => {
  it('converts pound-force and kilogram-force to newtons', () => {
    expect(convert(1, 'lbf', 'n').result).toBe(4.448222)
    expect(convert(1, 'kgf', 'n').result).toBe(9.80665)
    expect(convert(1, 'lbf', 'kgf').result).toBe(0.453592)
    expect(convert(1, 'n', 'dyn').result).toBe(100_000)
  })

  it('reaches kilonewton by full name (kn input stays knot)', () => {
    expect(convert(1, 'kilonewton', 'n').result).toBe(1_000)
    expect(resolveUnit('kn').category.id).toBe('speed')
    expect(resolveUnit('kn').unit.symbol).toBe('knot')
  })
})

describe('torque (force × length)', () => {
  it('converts pound-force foot/inches to newton meters', () => {
    expect(convert(1, 'lbfft', 'n.m').result).toBe(1.355818)
    expect(convert(1, 'kgf.m', 'n.m').result).toBe(9.80665)
    expect(convert(12, 'lbfin', 'lbfft').result).toBe(1)
    expect(convert(1, 'lbfft', 'kgf.m').result).toBe(0.138255)
  })

  it('keeps "nm" as nanometer and resolves "n.m"/"ftlb" as torque', () => {
    expect(resolveUnit('nm').category.id).toBe('length')
    expect(resolveUnit('n.m').category.id).toBe('torque')
    expect(resolveUnit('n·m').category.id).toBe('torque')
    expect(convert(1, 'ftlb', 'n.m').result).toBe(1.355818)
  })
})

describe('data transfer rate (bit vs byte, decimal vs binary)', () => {
  it('converts the classic Mbps → MB/s case exactly', () => {
    expect(convert(100, 'Mbps', 'MB/s').result).toBe(12.5)
    expect(convert(100, 'mbit/s', 'mb/s').result).toBe(12.5)
    expect(convert(1, 'MiB/s', 'Mbit/s').result).toBe(8.388608)
  })

  it('converts across decimal and binary rates', () => {
    expect(convert(1, 'Gbit/s', 'MiB/s').result).toBe(119.20929)
    expect(convert(500, 'MB/s', 'Gbit/s').result).toBe(4)
    expect(convert(1, 'Tbit/s', 'GB/s').result).toBe(125)
    expect(convert(1, 'KiB/s', 'kB/s').result).toBe(1.024)
    expect(convert(1, 'TiB/s', 'TB/s').result).toBe(1.099512)
  })

  it('keeps rates a separate category from sizes and documents b/s vs bps', () => {
    expect(() => convert(1, 'mb/s', 'mb')).toThrow(/must share a category/)
    expect(resolveUnit('mbps').unit.symbol).toBe('mbit/s')
    expect(resolveUnit('MB/s').unit.symbol).toBe('mb/s')
    expect(resolveUnit('bps').unit.symbol).toBe('bit/s')
    expect(resolveUnit('kilobytepersecond').category.id).toBe('datarate')
  })
})

describe('acceleration (standard gravity)', () => {
  it('converts g-force against g₀ = 9.80665 m/s²', () => {
    expect(convert(1, 'g0', 'm/s2').result).toBe(9.80665)
    expect(convert(1, 'g0', 'ft/s2').result).toBe(32.174049)
    expect(convert(1, 'm/s2', 'g0').result).toBe(0.101972)
    expect(convert(0.5, 'g0', 'mph/s').result).toBe(10.968426)
  })

  it('accepts notation and name aliases', () => {
    expect(convert(1, 'gravity', 'm/s²').result).toBe(9.80665)
    expect(convert(60, 'mph/s', 'm/s2').result).toBe(26.8224)
    expect(convert(100, 'ft/s2', 'm/s2').result).toBe(30.48)
    expect(convert(9.8, 'm/s2', 'g-force').result).toBe(0.999322)
  })

  it('keeps "g" as gram and reaches gravity by name', () => {
    expect(resolveUnit('g').category.id).toBe('mass')
    expect(resolveUnit('g0').category.id).toBe('acceleration')
    expect(resolveUnit('g-force').unit.symbol).toBe('g0')
  })
})

describe('illumination', () => {
  it('converts foot-candles and phot to lux', () => {
    expect(convert(1, 'fc', 'lx').result).toBe(10.76391)
    expect(convert(100, 'lx', 'fc').result).toBe(9.290304)
    expect(convert(1, 'ph', 'lx').result).toBe(10000)
    expect(convert(1, 'klx', 'fc').result).toBe(92.90304)
  })

  it('accepts full names', () => {
    expect(convert(20, 'footcandles', 'lux').result).toBe(215.278208)
    expect(convert(500, 'lux', 'kilolux').result).toBe(0.5)
    expect(resolveUnit('lumenspersquarefoot').unit.symbol).toBe('fc')
  })
})

describe('aliases and normalization', () => {
  it('accepts full names, plurals, case and degree signs', () => {
    expect(convert(1, 'miles', 'kilometers').result).toBe(1.609344)
    expect(convert(100, '°C', 'F').result).toBe(212)
    expect(convert(1, '  KILOMETER ', 'm').result).toBe(1_000)
    expect(convert(1, 'sqft', 'm2').result).toBe(0.092903)
    expect(convert(1, 'litres', 'gallons').result).toBe(0.264172)
    expect(convert(1, 'µm', 'nm').result).toBe(1_000)
  })

  it('resolves unicode area superscripts and carets', () => {
    expect(convert(1, 'm²', 'ft2').result).toBe(10.76391)
    expect(convert(1, 'm^3', 'l').result).toBe(1_000)
  })
})

describe('rounding', () => {
  it('uses significant digits below magnitude 1', () => {
    expect(convert(1, 'nm', 'km').result).toBe(1e-12)
    expect(convert(1, 'ev', 'j').result).toBe(1.60218e-19)
  })

  it('uses decimals at magnitude ≥ 1', () => {
    expect(convert(1, 'km', 'mi').result).toBe(0.621371)
  })
})

describe('error paths', () => {
  it('rejects unknown units with a hint', () => {
    expect(() => convert(1, 'smoots', 'm')).toThrow(/unknown unit "smoots"/)
  })

  it('rejects cross-category conversions', () => {
    expect(() => convert(1, 'km', 'kg')).toThrow(/must share a category/)
  })

  it('rejects non-finite values', () => {
    expect(() => convert(NaN, 'km', 'm')).toThrow(/finite number/)
    expect(() => convert(Infinity, 'km', 'm')).toThrow(/finite number/)
    expect(() => convert('100' as unknown as number, 'km', 'm')).toThrow(/finite number/)
  })
})

describe('volumetric flow rate', () => {
  it('converts SI, HVAC and plumbing units', () => {
    expect(convert(1, 'm3/s', 'l/s').result).toBe(1_000)
    expect(convert(1, 'm3/h', 'l/s').result).toBe(0.277778)
    expect(convert(1, 'l/s', 'm3/h').result).toBe(3.6)
    expect(convert(6, 'l/min', 'l/s').result).toBe(0.1)
    expect(convert(1, 'cfm', 'l/s').result).toBe(0.471947)
    expect(convert(1, 'gpm', 'l/s').result).toBe(0.0630902)
    expect(convert(100, 'cfm', 'm3/h').result).toBe(169.90108)
    expect(convert(60, 'l/min', 'l/h').result).toBe(3_600)
    expect(convert(1, 'l/min', 'gpm').result).toBe(0.264172)
    expect(convert(2.5, 'gpm', 'l/min').result).toBe(9.463529)
    expect(convert(1, 'm3/s', 'cfm').result).toBe(2118.880003)
  })

  it('keeps flows a separate category from volumes and resolves names', () => {
    expect(() => convert(1, 'l/min', 'l')).toThrow(/must share a category/)
    expect(resolveUnit('cubicfeetperminute').unit.symbol).toBe('cfm')
    expect(resolveUnit('lpm').unit.symbol).toBe('l/min')
    expect(resolveUnit('m3/h').unit.symbol).toBe('m3/h')
    expect(listUnits('flow')[0]?.units).toHaveLength(7)
  })
})

describe('density', () => {
  it('converts SI and imperial densities', () => {
    expect(convert(1, 'g/cm3', 'kg/m3').result).toBe(1_000)
    expect(convert(1, 'kg/m3', 'g/l').result).toBe(1)
    expect(convert(1, 'g/ml', 'kg/l').result).toBe(1)
    expect(convert(1, 'lb/ft3', 'kg/m3').result).toBe(16.018463)
    expect(convert(1, 'lb/gal', 'kg/m3').result).toBe(119.826427)
    expect(convert(1000, 'kg/m3', 't/m3').result).toBe(1)
    expect(convert(1, 'kg/l', 'lb/gal').result).toBe(8.345404)
    expect(convert(8.345, 'lb/gal', 'g/ml').result).toBe(0.999952)
    expect(convert(1, 'g/cm3', 'lb/ft3').result).toBe(62.427961)
  })

  it('keeps lb/gal in kg per cubic meter (the /1000 slip caught by the oracle)', () => {
    // 1 lb/US gal = 0.45359237 kg ÷ 0.003785411784 m³ ≈ 119.83 kg/m³, not 0.11983
    expect(convert(1, 'lb/gal', 'kg/m3').result).toBeGreaterThan(100)
    expect(resolveUnit('poundpercubicfoot').unit.symbol).toBe('lb/ft3')
    expect(resolveUnit('t/m3').category.id).toBe('density')
  })
})

describe('unit_price', () => {
  it('normalizes two offers into the same unit and ranks them', () => {
    const out = unitPrice([{ price: 3.99, per: 'lb' }, { price: 8.5, per: 'kg' }], 'kg')
    expect(out.category).toBe('mass')
    expect(out.target_unit).toBe('kilogram')
    expect(out.target_symbol).toBe('kg')
    expect(out.offers[0]?.per_symbol).toBe('lb')
    expect(out.offers[0]?.total_target).toBe(0.453592)
    expect(out.offers[0]?.price_per_target).toBe(8.796444)
    expect(out.offers[0]?.formula).toBe('3.99 ÷ (1 × 0.453592) × 1')
    expect(out.offers[1]?.price_per_target).toBe(8.5)
    expect(out.offers[1]?.formula).toBe('8.5 ÷ (1 × 1) × 1')
    expect(out.best_index).toBe(1)
    expect(out.best_price_per_target).toBe(8.5)
    expect(out.spread_percent).toBe(3.370046)
  })

  it('defaults to the category base unit', () => {
    const out = unitPrice([{ price: 3.99, per: 'lb' }, { price: 8.5, per: 'kg' }])
    expect(out.target_symbol).toBe('kg')
    expect(out.offers[0]?.price_per_target).toBe(8.796444)
    expect(out.spread_percent).toBe(3.370046)
  })

  it('accounts for package quantities', () => {
    const out = unitPrice([{ price: 4.29, per: 'g', quantity: 500 }, { price: 3.59, per: 'lb' }], 'kg')
    expect(out.offers[0]?.quantity).toBe(500)
    expect(out.offers[0]?.total_target).toBe(0.5)
    expect(out.offers[0]?.price_per_target).toBe(8.58)
    expect(out.offers[1]?.price_per_target).toBe(7.914595)
    expect(out.best_index).toBe(1)
    expect(out.best_price_per_target).toBe(7.914595)
    expect(out.spread_percent).toBe(7.755301)
  })

  it('compares fuel-style volume prices and reports the spread', () => {
    const out = unitPrice([{ price: 2.5, per: 'l' }, { price: 9.9, per: 'gal' }], 'l')
    expect(out.offers[1]?.total_target).toBe(3.785412)
    expect(out.offers[1]?.price_per_target).toBe(2.615303)
    expect(out.best_index).toBe(0)
    expect(out.spread_percent).toBe(4.408793)
  })

  it('handles energy, area, data size and free offers', () => {
    const energy = unitPrice([{ price: 1.2, per: 'kwh' }, { price: 0.4, per: 'kj' }], 'kwh')
    expect(energy.offers[1]?.price_per_target).toBe(1_440)
    expect(energy.offers[1]?.formula).toBe('0.4 ÷ (1 × 1000) × 3600000')
    expect(energy.spread_percent).toBe(99.916667)

    const area = unitPrice([{ price: 12, per: 'm2' }, { price: 0.9, per: 'ft2' }])
    expect(area.target_symbol).toBe('m2')
    expect(area.offers[1]?.price_per_target).toBe(9.687519)
    expect(area.spread_percent).toBe(19.270672)

    const data = unitPrice([{ price: 9.99, per: 'gb' }, { price: 0.05, per: 'mb' }], 'gb')
    expect(data.offers[1]?.total_target).toBe(0.001)
    expect(data.offers[1]?.price_per_target).toBe(50)
    expect(data.spread_percent).toBe(80.02)

    const free = unitPrice([{ price: 0, per: 'kg' }, { price: 1, per: 'kg' }])
    expect(free.best_index).toBe(0)
    expect(free.best_price_per_target).toBe(0)
    expect(free.spread_percent).toBe(100)
  })

  it('sizes a recipe-style offer by its quantity', () => {
    const out = unitPrice([{ price: 3.49, per: 'cup', quantity: 2 }, { price: 2.79, per: 'l' }], 'l')
    expect(out.offers[0]?.total_target).toBe(0.48)
    expect(out.offers[0]?.price_per_target).toBe(7.270833)
    expect(out.best_index).toBe(1)
    expect(out.spread_percent).toBe(61.627507)
  })

  it('rejects affine temperatures and reciprocal fuel economy', () => {
    expect(() => unitPrice([{ price: 1, per: 'c' }])).toThrow(/affine/)
    expect(() => unitPrice([{ price: 1, per: 'fahrenheit' }])).toThrow(/use a linear unit/)
    expect(() => unitPrice([{ price: 1, per: 'mpg' }])).toThrow(/reciprocal/)
  })

  it('rejects cross-category targets and malformed offers', () => {
    expect(() => unitPrice([{ price: 1, per: 'kg' }], 'l')).toThrow(/must share a category/)
    expect(() => unitPrice([{ price: 1, per: 'kg' }, { price: 1, per: 'l' }], 'kg')).toThrow(/must share a category/)
    expect(() => unitPrice([])).toThrow(/non-empty array/)
    expect(() => unitPrice([{ price: -1, per: 'kg' }])).toThrow(/price must be a finite number/)
    expect(() => unitPrice([{ price: 1, per: 'kg', quantity: 0 }])).toThrow(/quantity must be a finite number/)
    expect(() => unitPrice([{ price: 1, per: 7 as unknown as string }])).toThrow(/per must be a unit string/)
    expect(() => unitPrice([null as unknown as { price: number; per: string }])).toThrow(/must be an object/)
    expect(() => unitPrice([{ price: 1, per: 'smoots' }])).toThrow(/unknown unit/)
    const many = Array.from({ length: MAX_PRICE_OFFERS + 1 }, () => ({ price: 1, per: 'kg' }))
    expect(() => unitPrice(many)).toThrow(/at most 6 offers/)
  })
})

describe('resolveUnit', () => {
  it('maps aliases to canonical symbols', () => {
    expect(resolveUnit('MiB').unit.symbol).toBe('mib')
    expect(resolveUnit('celsius').unit.symbol).toBe('c')
  })
})

describe('listUnits', () => {
  it('lists all 22 categories without a filter', () => {
    const all = listUnits()
    expect(all).toHaveLength(22)
    expect(all.map((cat) => cat.id)).toEqual(CATEGORIES.map((cat) => cat.id))
  })

  it('filters by category id or name', () => {
    expect(listUnits('data')).toHaveLength(1)
    expect(listUnits('temperature')).toHaveLength(1)
    expect(listUnits('speed')[0]?.units.map((unit) => unit.symbol)).toContain('mph')
  })

  it('rejects unknown categories', () => {
    expect(() => listUnits('flavor')).toThrow(/unknown category "flavor"/)
  })
})
