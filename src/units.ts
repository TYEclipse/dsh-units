/**
 * Unit conversion engine for dsh-units.
 *
 * Pure, synchronous math over a static unit table — zero runtime
 * dependencies, fully offline, deterministic. Every category is expressed
 * through a base unit and per-unit factors, except temperature which uses
 * affine conversions (Celsius / Fahrenheit / Kelvin).
 *
 * @module dsh-units/units
 */

/** A linear unit: `factor` is how many base units this unit contains. */
export interface UnitDef {
  symbol: string
  name: string
  /** Base units per one of this unit (undefined for affine categories). */
  factor?: number
}

/** A unit category (dimension). */
export interface Category {
  id: string
  name: string
  base: string
  /**
   * 'linear' multiplies through the base unit; 'temperature' is affine;
   * 'fuel' is reciprocal (liters per 100 km vs. miles per gallon).
   */
  kind: 'linear' | 'temperature' | 'fuel'
  units: UnitDef[]
}

const L = (symbol: string, name: string, factor: number): UnitDef => ({ symbol, name, factor })

/** The static unit table: 12 categories, no external data. */
export const CATEGORIES: readonly Category[] = [
  {
    id: 'length', name: 'length', base: 'meter', kind: 'linear',
    units: [
      L('km', 'kilometer', 1_000), L('m', 'meter', 1), L('cm', 'centimeter', 0.01),
      L('mm', 'millimeter', 0.001), L('um', 'micrometer', 1e-6), L('nm', 'nanometer', 1e-9),
      L('in', 'inch', 0.0254), L('ft', 'foot', 0.3048), L('yd', 'yard', 0.9144),
      L('mi', 'mile', 1609.344), L('nmi', 'nautical mile', 1852),
    ],
  },
  {
    id: 'mass', name: 'mass', base: 'kilogram', kind: 'linear',
    units: [
      L('t', 'tonne (metric)', 1_000), L('kg', 'kilogram', 1), L('g', 'gram', 0.001),
      L('mg', 'milligram', 1e-6), L('lb', 'pound', 0.45359237), L('oz', 'ounce', 0.028349523125),
    ],
  },
  {
    id: 'temperature', name: 'temperature', base: 'celsius', kind: 'temperature',
    units: [
      { symbol: 'c', name: 'celsius' },
      { symbol: 'f', name: 'fahrenheit' },
      { symbol: 'k', name: 'kelvin' },
    ],
  },
  {
    id: 'area', name: 'area', base: 'square meter', kind: 'linear',
    units: [
      L('km2', 'square kilometer', 1e6), L('ha', 'hectare', 1e4), L('m2', 'square meter', 1),
      L('cm2', 'square centimeter', 1e-4), L('mm2', 'square millimeter', 1e-6),
      L('mi2', 'square mile', 2_589_988.110336), L('acre', 'acre', 4046.8564224),
      L('yd2', 'square yard', 0.83612736), L('ft2', 'square foot', 0.09290304), L('in2', 'square inch', 0.00064516),
    ],
  },
  {
    id: 'volume', name: 'volume (incl. cooking)', base: 'liter', kind: 'linear',
    units: [
      L('m3', 'cubic meter', 1_000), L('l', 'liter', 1), L('ml', 'milliliter', 0.001),
      L('cm3', 'cubic centimeter', 0.001),
      L('gal', 'US gallon', 3.785411784), L('qt', 'US quart', 0.946352946),
      L('pint', 'US pint', 0.473176473), L('cup', 'US cup', 0.24),
      L('floz', 'US fluid ounce', 0.0295735295625), L('tbsp', 'tablespoon (US)', 0.01478676478125),
      L('tsp', 'teaspoon (US)', 0.00492892159375),
    ],
  },
  {
    id: 'speed', name: 'speed', base: 'meter per second', kind: 'linear',
    units: [
      L('km/h', 'kilometer per hour', 1 / 3.6), L('m/s', 'meter per second', 1),
      L('mph', 'mile per hour', 0.44704), L('knot', 'knot', 1852 / 3600),
      L('ft/s', 'foot per second', 0.3048),
    ],
  },
  {
    id: 'time', name: 'time duration', base: 'second', kind: 'linear',
    units: [
      L('yr', 'year (Julian, 365.25 days)', 31_557_600), L('wk', 'week', 604_800),
      L('d', 'day', 86_400), L('h', 'hour', 3_600), L('min', 'minute', 60),
      L('s', 'second', 1), L('ms', 'millisecond', 0.001),
    ],
  },
  {
    id: 'data', name: 'data size / transfer', base: 'bit', kind: 'linear',
    units: [
      L('tbit', 'terabit', 1e12), L('gbit', 'gigabit', 1e9), L('mbit', 'megabit', 1e6),
      L('kbit', 'kilobit', 1e3), L('bit', 'bit', 1),
      L('pb', 'petabyte (decimal)', 8e15), L('tb', 'terabyte (decimal)', 8e12),
      L('gb', 'gigabyte (decimal)', 8e9), L('mb', 'megabyte (decimal)', 8e6),
      L('kb', 'kilobyte (decimal)', 8e3), L('b', 'byte', 8),
      L('pib', 'pebibyte (binary)', 8 * 1024 ** 5), L('tib', 'tebibyte (binary)', 8 * 1024 ** 4),
      L('gib', 'gibibyte (binary)', 8 * 1024 ** 3), L('mib', 'mebibyte (binary)', 8 * 1024 ** 2),
      L('kib', 'kibibyte (binary)', 8 * 1024),
    ],
  },
  {
    id: 'pressure', name: 'pressure', base: 'pascal', kind: 'linear',
    units: [
      L('mpa', 'megapascal', 1e6), L('kpa', 'kilopascal', 1e3), L('bar', 'bar', 1e5),
      L('atm', 'standard atmosphere', 101_325), L('psi', 'pound per square inch', 6894.757293168),
      L('mmhg', 'millimeter of mercury', 133.322387415), L('torr', 'torr', 133.322368421),
      L('pa', 'pascal', 1),
    ],
  },
  {
    id: 'energy', name: 'energy', base: 'joule', kind: 'linear',
    units: [
      L('kwh', 'kilowatt-hour', 3.6e6), L('wh', 'watt-hour', 3_600), L('kcal', 'kilocalorie', 4_184),
      L('kj', 'kilojoule', 1e3), L('cal', 'calorie', 4.184), L('j', 'joule', 1),
      L('ev', 'electronvolt', 1.602176634e-19),
    ],
  },
  {
    id: 'angle', name: 'angle', base: 'radian', kind: 'linear',
    units: [
      L('deg', 'degree', Math.PI / 180), L('rad', 'radian', 1), L('grad', 'gradian (gon)', Math.PI / 200),
    ],
  },
  {
    id: 'frequency', name: 'frequency / rotation', base: 'hertz', kind: 'linear',
    units: [
      L('ghz', 'gigahertz', 1e9), L('mhz', 'megahertz', 1e6), L('khz', 'kilohertz', 1e3),
      L('hz', 'hertz', 1), L('rpm', 'revolution per minute', 1 / 60),
    ],
  },
  {
    // CSS/print typography at the standard 96 DPI reference: 1 pt = 1/72 in,
    // 1 px = 1/96 in, 1 pc (pica) = 12 pt. em/rem are resolved against the
    // common 16 px browser default base font size (a documented assumption).
    id: 'typography', name: 'typography (CSS / print)', base: 'pixel (96 dpi)', kind: 'linear',
    units: [
      L('px', 'pixel (96 dpi)', 1), L('pt', 'point (1/72 inch)', 96 / 72),
      L('pc', 'pica (12 pt)', 16), L('em', 'em (16 px base font)', 16),
      L('rem', 'rem (root em, 16 px base)', 16),
    ],
  },
  {
    // Fuel economy is reciprocal: L/100km and km/L are inverse-style measures
    // versus miles per gallon, so it gets its own conversion kind.
    id: 'fuel', name: 'fuel economy', base: 'liter per 100 km', kind: 'fuel',
    units: [
      { symbol: 'l/100km', name: 'liters per 100 km' },
      { symbol: 'l/km', name: 'liters per km' },
      { symbol: 'mpg', name: 'miles per US gallon' },
      { symbol: 'mpg(uk)', name: 'miles per imperial (UK) gallon' },
      { symbol: 'km/l', name: 'kilometers per liter' },
    ],
  },
]

/** Exact fuel-economy anchors: US gallon = 3.785411784 L, imperial gallon =
 * 4.54609 L, mile = 1.609344 km. L/100km per 1 mpg = 100 × gallon / mile. */
const L100KM_PER_MPG_US = (100 * 3.785411784) / 1.609344 // ≈ 235.214583
const L100KM_PER_MPG_UK = (100 * 4.54609) / 1.609344 // ≈ 282.480936

/** Fuel economy → base (L/100km). */
function fuelToBase(value: number, symbol: string): number {
  switch (symbol) {
    case 'l/100km': return value
    case 'l/km': return value * 100
    case 'mpg': return L100KM_PER_MPG_US / value
    case 'mpg(uk)': return L100KM_PER_MPG_UK / value
    case 'km/l': return 100 / value
    default: throw new Error(`internal: unsupported fuel unit "${symbol}"`)
  }
}

/** Base (L/100km) → fuel economy unit. */
function fuelFromBase(value: number, symbol: string): number {
  switch (symbol) {
    case 'l/100km': return value
    case 'l/km': return value / 100
    case 'mpg': return L100KM_PER_MPG_US / value
    case 'mpg(uk)': return L100KM_PER_MPG_UK / value
    case 'km/l': return 100 / value
    default: throw new Error(`internal: unsupported fuel unit "${symbol}"`)
  }
}

/** Human-readable recipe of a unit → base step (x = input value). */
function fuelToBaseText(symbol: string): string {
  switch (symbol) {
    case 'l/km': return 'x × 100'
    case 'mpg': return `${roundForFormula(L100KM_PER_MPG_US)} ÷ x`
    case 'mpg(uk)': return `${roundForFormula(L100KM_PER_MPG_UK)} ÷ x`
    case 'km/l': return '100 ÷ x'
    default: return 'x'
  }
}

/** Human-readable recipe of a base → unit step (x = base value). */
function fuelFromBaseText(symbol: string): string {
  switch (symbol) {
    case 'l/km': return 'x ÷ 100'
    case 'mpg': return `${roundForFormula(L100KM_PER_MPG_US)} ÷ x`
    case 'mpg(uk)': return `${roundForFormula(L100KM_PER_MPG_UK)} ÷ x`
    case 'km/l': return '100 ÷ x'
    default: return 'x'
  }
}

/** Round a constant for display inside a formula string. */
function roundForFormula(value: number): string {
  return String(Number(value.toFixed(6)))
}

/**
 * Alias table: normalized user input → canonical unit symbol.
 * Normalization lowercases, trims, strips spaces and the degree sign, and
 * folds unicode ²/³ (and caret notation) into plain digits.
 */
const ALIASES = new Map<string, string>([
  // length
  ['m', 'm'], ['meter', 'm'], ['meters', 'm'], ['metre', 'm'], ['metres', 'm'],
  ['km', 'km'], ['kilometer', 'km'], ['kilometers', 'km'], ['kilometre', 'km'], ['kilometres', 'km'],
  ['cm', 'cm'], ['centimeter', 'cm'], ['centimeters', 'cm'], ['centimetre', 'cm'], ['centimetres', 'cm'],
  ['mm', 'mm'], ['millimeter', 'mm'], ['millimeters', 'mm'], ['millimetre', 'mm'], ['millimetres', 'mm'],
  ['um', 'um'], ['micron', 'um'], ['microns', 'um'], ['micrometer', 'um'], ['micrometers', 'um'],
  ['nm', 'nm'], ['nanometer', 'nm'], ['nanometers', 'nm'],
  ['in', 'in'], ['inch', 'in'], ['inches', 'in'],
  ['ft', 'ft'], ['foot', 'ft'], ['feet', 'ft'],
  ['yd', 'yd'], ['yard', 'yd'], ['yards', 'yd'],
  ['mi', 'mi'], ['mile', 'mi'], ['miles', 'mi'],
  ['nmi', 'nmi'], ['nauticalmile', 'nmi'], ['nauticalmiles', 'nmi'],
  // mass
  ['kg', 'kg'], ['kilogram', 'kg'], ['kilograms', 'kg'],
  ['g', 'g'], ['gram', 'g'], ['grams', 'g'],
  ['mg', 'mg'], ['milligram', 'mg'], ['milligrams', 'mg'],
  ['t', 't'], ['tonne', 't'], ['tonnes', 't'], ['ton', 't'], ['tons', 't'], ['metrictons', 't'],
  ['lb', 'lb'], ['lbs', 'lb'], ['pound', 'lb'], ['pounds', 'lb'],
  ['oz', 'oz'], ['ounce', 'oz'], ['ounces', 'oz'],
  // temperature
  ['c', 'c'], ['celsius', 'c'], ['f', 'f'], ['fahrenheit', 'f'], ['k', 'k'], ['kelvin', 'k'],
  // area
  ['m2', 'm2'], ['sqm', 'm2'], ['squaremeter', 'm2'], ['squaremeters', 'm2'],
  ['km2', 'km2'], ['sqkm', 'km2'], ['squarekilometer', 'km2'], ['squarekilometers', 'km2'],
  ['cm2', 'cm2'], ['sqcm', 'cm2'], ['mm2', 'mm2'], ['sqmm', 'mm2'],
  ['mi2', 'mi2'], ['sqmi', 'mi2'], ['squaremile', 'mi2'], ['squaremiles', 'mi2'],
  ['yd2', 'yd2'], ['sqyd', 'yd2'], ['ft2', 'ft2'], ['sqft', 'ft2'], ['squarefoot', 'ft2'], ['squarefeet', 'ft2'],
  ['in2', 'in2'], ['sqin', 'in2'], ['squareinch', 'in2'], ['squareinches', 'in2'],
  ['ha', 'ha'], ['hectare', 'ha'], ['hectares', 'ha'],
  ['acre', 'acre'], ['acres', 'acre'],
  // volume
  ['m3', 'm3'], ['cubicmeter', 'm3'], ['cubicmeters', 'm3'],
  ['l', 'l'], ['liter', 'l'], ['liters', 'l'], ['litre', 'l'], ['litres', 'l'],
  ['ml', 'ml'], ['milliliter', 'ml'], ['milliliters', 'ml'],
  ['cm3', 'cm3'], ['cc', 'cm3'], ['cubiccentimeter', 'cm3'],
  ['gal', 'gal'], ['gallon', 'gal'], ['gallons', 'gal'],
  ['qt', 'qt'], ['quart', 'qt'], ['quarts', 'qt'],
  ['pint', 'pint'], ['pints', 'pint'],
  ['cup', 'cup'], ['cups', 'cup'],
  ['floz', 'floz'], ['fluidounce', 'floz'], ['fluidounces', 'floz'],
  ['tbsp', 'tbsp'], ['tablespoon', 'tbsp'], ['tablespoons', 'tbsp'],
  ['tsp', 'tsp'], ['teaspoon', 'tsp'], ['teaspoons', 'tsp'],
  // speed
  ['m/s', 'm/s'], ['mps', 'm/s'], ['meterspersecond', 'm/s'], ['meterpersecond', 'm/s'],
  ['km/h', 'km/h'], ['kmh', 'km/h'], ['kph', 'km/h'],
  ['mph', 'mph'], ['milesperhour', 'mph'],
  ['knot', 'knot'], ['knots', 'knot'], ['kn', 'knot'],
  ['ft/s', 'ft/s'], ['fps', 'ft/s'], ['feetpersecond', 'ft/s'],
  // time
  ['yr', 'yr'], ['year', 'yr'], ['years', 'yr'],
  ['wk', 'wk'], ['week', 'wk'], ['weeks', 'wk'],
  ['d', 'd'], ['day', 'd'], ['days', 'd'],
  ['h', 'h'], ['hr', 'h'], ['hour', 'h'], ['hours', 'h'],
  ['min', 'min'], ['minute', 'min'], ['minutes', 'min'],
  ['s', 's'], ['sec', 's'], ['second', 's'], ['seconds', 's'],
  ['ms', 'ms'], ['millisecond', 'ms'], ['milliseconds', 'ms'],
  // data
  ['tbit', 'tbit'], ['terabit', 'tbit'], ['terabits', 'tbit'],
  ['gbit', 'gbit'], ['gigabit', 'gbit'], ['gigabits', 'gbit'],
  ['mbit', 'mbit'], ['megabit', 'mbit'], ['megabits', 'mbit'],
  ['kbit', 'kbit'], ['kilobit', 'kbit'], ['kilobits', 'kbit'],
  ['bit', 'bit'], ['bits', 'bit'],
  ['b', 'b'], ['byte', 'b'], ['bytes', 'b'],
  ['pb', 'pb'], ['petabyte', 'pb'], ['petabytes', 'pb'],
  ['tb', 'tb'], ['terabyte', 'tb'], ['terabytes', 'tb'],
  ['gb', 'gb'], ['gigabyte', 'gb'], ['gigabytes', 'gb'],
  ['mb', 'mb'], ['megabyte', 'mb'], ['megabytes', 'mb'],
  ['kb', 'kb'], ['kilobyte', 'kb'], ['kilobytes', 'kb'],
  ['pib', 'pib'], ['pebibyte', 'pib'], ['pebibytes', 'pib'],
  ['tib', 'tib'], ['tebibyte', 'tib'], ['tebibytes', 'tib'],
  ['gib', 'gib'], ['gibibyte', 'gib'], ['gibibytes', 'gib'],
  ['mib', 'mib'], ['mebibyte', 'mib'], ['mebibytes', 'mib'],
  ['kib', 'kib'], ['kibibyte', 'kib'], ['kibibytes', 'kib'],
  // pressure
  ['mpa', 'mpa'], ['megapascal', 'mpa'], ['megapascals', 'mpa'],
  ['kpa', 'kpa'], ['kilopascal', 'kpa'], ['kilopascals', 'kpa'],
  ['pa', 'pa'], ['pascal', 'pa'], ['pascals', 'pa'],
  ['bar', 'bar'], ['bars', 'bar'],
  ['atm', 'atm'], ['atmosphere', 'atm'], ['atmospheres', 'atm'],
  ['psi', 'psi'],
  ['mmhg', 'mmhg'], ['torr', 'torr'],
  // energy
  ['kwh', 'kwh'], ['kilowatthour', 'kwh'], ['kilowatthours', 'kwh'],
  ['wh', 'wh'], ['watthour', 'wh'], ['watthours', 'wh'],
  ['kcal', 'kcal'], ['kilocalorie', 'kcal'], ['kilocalories', 'kcal'],
  ['kj', 'kj'], ['kilojoule', 'kj'], ['kilojoules', 'kj'],
  ['cal', 'cal'], ['calorie', 'cal'], ['calories', 'cal'],
  ['j', 'j'], ['joule', 'j'], ['joules', 'j'],
  ['ev', 'ev'], ['electronvolt', 'ev'], ['electronvolts', 'ev'],
  // angle
  ['deg', 'deg'], ['degree', 'deg'], ['degrees', 'deg'],
  ['rad', 'rad'], ['radian', 'rad'], ['radians', 'rad'],
  ['grad', 'grad'], ['gon', 'grad'],
  // frequency
  ['ghz', 'ghz'], ['gigahertz', 'ghz'],
  ['mhz', 'mhz'], ['megahertz', 'mhz'],
  ['khz', 'khz'], ['kilohertz', 'khz'],
  ['hz', 'hz'], ['hertz', 'hz'],
  ['rpm', 'rpm'],
  // typography (CSS / print)
  ['px', 'px'], ['pixel', 'px'], ['pixels', 'px'],
  ['pt', 'pt'], ['point', 'pt'], ['points', 'pt'],
  ['pc', 'pc'], ['pica', 'pc'], ['picas', 'pc'],
  ['em', 'em'], ['ems', 'em'],
  ['rem', 'rem'], ['rems', 'rem'],
  // fuel economy
  ['l/100km', 'l/100km'], ['l100km', 'l/100km'],
  ['litersper100km', 'l/100km'], ['litresper100km', 'l/100km'],
  ['litersper100kilometers', 'l/100km'],
  ['l/km', 'l/km'], ['lkm', 'l/km'], ['litersperkm', 'l/km'], ['litersperkilometer', 'l/km'],
  ['mpg', 'mpg'], ['usmpg', 'mpg'], ['mpgus', 'mpg'], ['mpg(us)', 'mpg'],
  ['mpg(uk)', 'mpg(uk)'], ['mpguk', 'mpg(uk)'], ['ukmpg', 'mpg(uk)'], ['imperialmpg', 'mpg(uk)'],
  ['km/l', 'km/l'], ['kml', 'km/l'], ['kmpl', 'km/l'],
  ['kilometersperliter', 'km/l'], ['kmperliter', 'km/l'],
])

/** Normalize raw user input into an alias-table key. */
function normalize(raw: string): string {
  let text = raw.trim().toLowerCase()
  text = text.replace(/\s+/g, '')
  text = text.replace(/°/g, '')
  text = text.replace(/\u00b2/g, '2').replace(/\u00b3/g, '3')
  text = text.replace(/\^/g, '')
  text = text.replace(/\u03bc/g, 'u').replace(/\u00b5/g, 'u') // µ (both codepoints) → u
  return text
}

/** Find the category and unit for a user-supplied unit string. */
export function resolveUnit(raw: string): { category: Category; unit: UnitDef } {
  const key = normalize(raw)
  const symbol = ALIASES.get(key)
  if (symbol === undefined) {
    throw new Error(`unknown unit "${raw}". Use list_units to see supported units ` +
      `(${CATEGORIES.map((cat) => cat.id).join(', ')})`)
  }
  const category = CATEGORIES.find((cat) => cat.units.some((unit) => unit.symbol === symbol))
  if (category === undefined) {
    // Defensive: every alias maps to a real unit symbol.
    throw new Error(`internal: unit symbol "${symbol}" not found in the unit table`)
  }
  const unit = category.units.find((entry) => entry.symbol === symbol)
  if (unit === undefined) {
    throw new Error(`internal: unit symbol "${symbol}" missing from category "${category.id}"`)
  }
  return { category, unit }
}

/** Convert a Celsius value to Fahrenheit / Kelvin (canonical temperature helpers). */
function celsiusTo(value: number, target: string): number {
  switch (target) {
    case 'c': return value
    case 'f': return (value * 9) / 5 + 32
    case 'k': return value + 273.15
    default: throw new Error(`internal: unsupported temperature unit "${target}"`)
  }
}

/** Convert a Fahrenheit / Kelvin value to Celsius. */
function toCelsius(value: number, source: string): number {
  switch (source) {
    case 'c': return value
    case 'f': return ((value - 32) * 5) / 9
    case 'k': return value - 273.15
    default: throw new Error(`internal: unsupported temperature unit "${source}"`)
  }
}

const TEMP_FORMULAS: Readonly<Record<string, string>> = {
  'c->f': '× 9/5 + 32',
  'c->k': '+ 273.15',
  'f->c': '(x − 32) × 5/9',
  'f->k': '(x − 32) × 5/9 + 273.15',
  'k->c': '− 273.15',
  'k->f': '(x − 273.15) × 9/5 + 32',
}

/** Round for display: decimals for magnitudes ≥ 1, significant digits below. */
function roundValue(value: number, maxDecimals: number): number {
  if (!Number.isFinite(value)) return value
  if (value === 0) return 0
  const magnitude = Math.abs(value)
  if (magnitude >= 1) return Number(value.toFixed(maxDecimals))
  return Number(value.toPrecision(maxDecimals))
}

/** Result of a successful conversion. */
export interface ConversionResult {
  value: number
  from_unit: string
  from_symbol: string
  to_unit: string
  to_symbol: string
  result: number
  formula: string
  category: string
}

/**
 * Convert a numeric value between two units of the same category.
 * Throws on unknown units, cross-category pairs, or non-finite values.
 */
export function convert(value: number, fromRaw: string, toRaw: string, maxDecimals = 6): ConversionResult {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`value must be a finite number (got ${String(value)})`)
  }
  const from = resolveUnit(fromRaw)
  const to = resolveUnit(toRaw)
  if (from.category.id !== to.category.id) {
    throw new Error(`cannot convert ${from.unit.name} (${from.category.name}) to ${to.unit.name} ` +
      `(${to.category.name}) — units must share a category`)
  }

  let result: number
  let formula: string
  if (from.category.kind === 'temperature') {
    result = celsiusTo(toCelsius(value, from.unit.symbol), to.unit.symbol)
    formula = TEMP_FORMULAS[`${from.unit.symbol}->${to.unit.symbol}`] ?? '× 1'
  } else if (from.category.kind === 'fuel') {
    result = fuelFromBase(fuelToBase(value, from.unit.symbol), to.unit.symbol)
    formula = `${fuelToBaseText(from.unit.symbol)} → ${fuelFromBaseText(to.unit.symbol)}`
  } else {
    const fromFactor = from.unit.factor
    const toFactor = to.unit.factor
    if (fromFactor === undefined || toFactor === undefined) {
      throw new Error(`internal: linear category "${from.category.id}" has a unit without a factor`)
    }
    result = (value * fromFactor) / toFactor
    formula = fromFactor === toFactor ? '× 1' : `× ${fromFactor / toFactor}`
  }

  return {
    value,
    from_unit: from.unit.name,
    from_symbol: from.unit.symbol,
    to_unit: to.unit.name,
    to_symbol: to.unit.symbol,
    result: roundValue(result, maxDecimals),
    formula,
    category: from.category.name,
  }
}

/** Compact listing of one category for list_units output. */
export interface CategoryListing {
  id: string
  name: string
  base: string
  units: Array<{ symbol: string; name: string }>
}

/** List all categories (optionally one) with their units and symbols. */
export function listUnits(categoryFilter?: string): CategoryListing[] {
  if (categoryFilter === undefined || categoryFilter.trim() === '') {
    return CATEGORIES.map(toListing)
  }
  const key = normalize(categoryFilter)
  const wanted = CATEGORIES.find((cat) => cat.id === key || cat.name === key)
  if (wanted === undefined) {
    throw new Error(`unknown category "${categoryFilter}". Known categories: ` +
      CATEGORIES.map((cat) => cat.id).join(', '))
  }
  return [toListing(wanted)]
}

function toListing(category: Category): CategoryListing {
  return {
    id: category.id,
    name: category.name,
    base: category.base,
    units: category.units.map((unit) => ({ symbol: unit.symbol, name: unit.name })),
  }
}
