/**
 * dsh-units — unit conversion toolbox for DeepSeek Harness.
 *
 * Two tools, zero runtime dependencies (pure arithmetic):
 *   convert_unit — convert a value between two units of one category:
 *                  length, mass, temperature (affine C/F/K), area, volume
 *                  (incl. US cooking units), speed, time duration, data
 *                  size/transfer (decimal MB vs binary MiB), pressure,
 *                  energy, angle, frequency.
 *   list_units   — discover every supported category, unit symbol and name.
 *
 * Safety model: everything is pure synchronous math over a static unit
 * table — no network, no filesystem, no code execution. Invalid units,
 * cross-category pairs, and non-finite values are rejected with clear
 * errors. Results are rounded only for display.
 *
 * @module dsh-units
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
/** Stable Cordis plugin name (also the config key under `plugins:`). */
export declare const name = "dsh-units";
/** Services required before tool registration can start. */
export declare const inject: string[];
/** Plugin configuration, resolved with defaults by the loader. */
export interface Config {
    /** Display rounding: decimals for magnitudes ≥ 1, significant digits below (1–12). */
    maxDecimals?: number;
}
export declare const Config: z<Config>;
/** Config with every default resolved (all fields guaranteed). */
export interface ResolvedConfig {
    maxDecimals: number;
}
/** Resolve loader config into the effective runtime config. */
export declare function resolveConfig(config: Config): ResolvedConfig;
/** Mount the dsh-units tools on every live agent and every future one. */
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map