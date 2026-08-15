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
    /** 'linear' multiplies through the base unit; 'temperature' is affine. */
    kind: 'linear' | 'temperature';
    units: UnitDef[];
}
/** The static unit table: 12 categories, no external data. */
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