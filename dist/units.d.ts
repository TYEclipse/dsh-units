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
    symbol: string;
    name: string;
    /** Base units per one of this unit (undefined for affine categories). */
    factor?: number;
}
/** A unit category (dimension). */
export interface Category {
    id: string;
    name: string;
    base: string;
    /**
     * 'linear' multiplies through the base unit; 'temperature' is affine;
     * 'fuel' is reciprocal (liters per 100 km vs. miles per gallon).
     */
    kind: 'linear' | 'temperature' | 'fuel';
    units: UnitDef[];
}
/**
 * The static unit table — the single source of every conversion factor.
 * (Count deliberately not written in prose: it drifted twice already.)
 */
export declare const CATEGORIES: readonly Category[];
/** Find the category and unit for a user-supplied unit string. */
export declare function resolveUnit(raw: string): {
    category: Category;
    unit: UnitDef;
};
/** Result of a successful conversion. */
export interface ConversionResult {
    value: number;
    from_unit: string;
    from_symbol: string;
    to_unit: string;
    to_symbol: string;
    result: number;
    formula: string;
    category: string;
}
/**
 * Convert a numeric value between two units of the same category.
 * Throws on unknown units, cross-category pairs, or non-finite values.
 */
export declare function convert(value: number, fromRaw: string, toRaw: string, maxDecimals?: number): ConversionResult;
/** Absolute-error propagation for one conversion. */
export interface Uncertainty {
    /** The ± half-width as given, in the source unit. */
    input_error: number;
    /**
     * 100 × error ÷ |value|. Absent when the ratio is undefined (`value` is 0)
     * or meaningless (temperatures have an arbitrary zero point, so "±1 % of
     * 20 °C" claims nothing about the physical quantity).
     */
    relative_percent?: number;
    /**
     * Half-width in the target unit. Present only when the mapping is
     * symmetric — linear factors and affine temperature scales. Absent for
     * reciprocal (fuel economy) conversions, where the interval is not centred
     * on the nominal result.
     */
    result_error?: number;
    /** Converts of `value − error` and `value + error`, ordered. */
    result_low: number;
    result_high: number;
    symmetric: boolean;
    note: string;
}
/** A conversion result that also carries an uncertainty band. */
export interface UncertainConversion extends ConversionResult {
    uncertainty: Uncertainty;
}
/**
 * Convert a value that carries an absolute ± error and report what the error
 * becomes in the target unit.
 *
 * Three mapping classes behave differently, and getting them mixed up is the
 * whole point of this function:
 *
 * - **linear** (`km → mi`): the error scales by exactly the same factor as the
 *   value, so the relative error is unchanged;
 * - **temperature** (`°C → °F`): the *offset* does not apply to a difference —
 *   ±1 °C is ±1.8 °F, not ±33.8 °F — so the error scales by 9/5 alone. A
 *   relative error is deliberately not reported: the zero point is arbitrary;
 * - **fuel economy** (`mpg → L/100km`): reciprocal, so scaling the error is
 *   wrong. Both ends of the interval are converted and reported as a range;
 *   the result is asymmetric and has no `result_error`.
 *
 * Every boundary is reported as a fact of the result shape (`relative_percent`
 * / `result_error` absent) rather than filled with a plausible number.
 */
export declare function convertWithUncertainty(value: number, error: number, fromRaw: string, toRaw: string, maxDecimals?: number): UncertainConversion;
/** One offer for unit-price math: `price` buys `quantity` (default 1) of `per`. */
export interface PriceOffer {
    price: number;
    per: string;
    quantity?: number;
}
/** One normalized offer inside a unit-price comparison. */
export interface PriceQuote {
    index: number;
    price: number;
    quantity: number;
    per_unit: string;
    per_symbol: string;
    /** How many target units this offer covers. */
    total_target: number;
    /** Price of one target unit (rounded for display). */
    price_per_target: number;
    formula: string;
}
/** Result of a unit-price normalization (one offer) or comparison (several). */
export interface PriceComparison {
    category: string;
    target_unit: string;
    target_symbol: string;
    offers: PriceQuote[];
    /** 0-based index of the cheapest offer; ties keep the earliest offer. */
    best_index: number;
    best_price_per_target: number;
    /** How much cheaper the best offer is than the dearest, in percent (0 when equal). */
    spread_percent: number;
}
/** Upper bound on offers per unit_price call. */
export declare const MAX_PRICE_OFFERS = 6;
/**
 * Normalize 1–6 "price for a quantity of one unit" offers into a price per
 * target unit (default: the category's base unit) and rank them. Only linear
 * categories are accepted: temperatures are affine (an arbitrary zero point
 * makes "price per degree" meaningless) and fuel economy is reciprocal, so
 * both are rejected with an explanatory error instead of a wrong number.
 */
export declare function unitPrice(offers: readonly PriceOffer[], toRaw?: string, maxDecimals?: number): PriceComparison;
/** One quantity to add: `value` of `unit`. */
export interface SumItem {
    value: number;
    unit: string;
}
/** One normalized quantity inside a unit_sum result. */
export interface SumRow {
    index: number;
    value: number;
    unit: string;
    symbol: string;
    /** This quantity's contribution in the category base unit (rounded for display). */
    base_value: number;
}
/** Result of adding up quantities that share one category. */
export interface SumResult {
    category: string;
    base_unit: string;
    base_symbol: string;
    target_unit: string;
    target_symbol: string;
    items: SumRow[];
    count: number;
    /** Sum of the base-unit contributions (rounded for display). */
    base_total: number;
    /** Sum expressed in the target unit (rounded for display). */
    total: number;
    /** Arithmetic mean in the target unit (rounded for display). */
    mean: number;
    formula: string;
}
/** Upper bound on quantities per unit_sum call. */
export declare const MAX_SUM_ITEMS = 12;
/**
 * Add 1–12 quantities given in any units of a single category and report the
 * total and the mean in a target unit (default: the category base unit).
 *
 * Every quantity is converted to the base unit first, then summed with
 * compensated accumulation, so mixed units and many small addends do not
 * drift. Only linear categories are accepted: temperatures are affine (an
 * arbitrary zero point makes a sum meaningless) and fuel economy is
 * reciprocal — both are rejected with an explanation instead of a number that
 * would look right and be wrong. Negative values are allowed, which makes
 * `unit_sum` usable for differences as well as totals.
 */
export declare function unitSum(items: readonly SumItem[], toRaw?: string, maxDecimals?: number): SumResult;
/** Compact listing of one category for list_units output. */
export interface CategoryListing {
    id: string;
    name: string;
    base: string;
    units: Array<{
        symbol: string;
        name: string;
    }>;
}
/** List all categories (optionally one) with their units and symbols. */
export declare function listUnits(categoryFilter?: string): CategoryListing[];
//# sourceMappingURL=units.d.ts.map