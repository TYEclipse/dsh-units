/**
 * Tool definitions for dsh-units: convert_unit and list_units, exposed to
 * every agent via defineTool with strict JSON-schema parameter surfaces and
 * compact text renderers.
 *
 * @module dsh-units/tools
 */
import { type ToolDefinition } from '@deepseek-ai/dsh-tools';
import type { ResolvedConfig } from './index.ts';
export interface ToolSet {
    convert_unit: ToolDefinition;
    list_units: ToolDefinition;
}
/** Build both tool definitions from the resolved config. */
export declare function buildUnitsTools(config: ResolvedConfig): ToolSet;
//# sourceMappingURL=tools.d.ts.map