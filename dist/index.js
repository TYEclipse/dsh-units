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
import z from '@deepseek-ai/schemastery';
import { buildUnitsTools } from "./tools.js";
/** Stable Cordis plugin name (also the config key under `plugins:`). */
export const name = 'dsh-units';
/** Services required before tool registration can start. */
export const inject = ['agents', 'tools'];
export const Config = z.object({
    maxDecimals: z.number().step(1).min(1).max(12).default(6),
});
/** Resolve loader config into the effective runtime config. */
export function resolveConfig(config) {
    return { maxDecimals: config.maxDecimals ?? 6 };
}
/** Register every dsh-units tool on one agent; returns the disposer. */
function decorate(agent, tools) {
    const disposers = Object.values(tools).map((definition) => agent.ctx.tools.register(definition));
    return () => {
        for (const dispose of disposers) {
            try {
                dispose();
            }
            catch {
                // already disposed
            }
        }
    };
}
/** Mount the dsh-units tools on every live agent and every future one. */
export function apply(ctx, config) {
    const resolved = resolveConfig(config);
    const tools = buildUnitsTools(resolved);
    const disposers = new Set();
    const decorateAgent = (agent) => {
        try {
            disposers.add(decorate(agent, tools));
        }
        catch (error) {
            ctx.logger('units').warn(`tool registration for agent ${agent.id} failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    };
    for (const agent of ctx.agents.list())
        decorateAgent(agent);
    const off = ctx.on('agent/created', ({ agent }) => decorateAgent(agent));
    ctx.effect(() => () => {
        off();
        for (const dispose of disposers) {
            try {
                dispose();
            }
            catch {
                // already disposed
            }
        }
        disposers.clear();
    });
}
//# sourceMappingURL=index.js.map