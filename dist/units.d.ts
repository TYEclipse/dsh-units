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