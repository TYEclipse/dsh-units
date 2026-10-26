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