/**
 * Tool definitions for dsh-units: convert_unit and list_units, exposed to
 * every agent via defineTool with strict JSON-schema parameter surfaces and
 * compact text renderers.
 *
 * @module dsh-units/tools
 */
import { defineTool } from '@deepseek-ai/dsh-tools';
import { convert, listUnits } from "./units.js";
function renderConvert(value) {
    const result = value;
    return `${result.value} ${result.from_symbol} = ${result.result} ${result.to_symbol} ` +
        `(${result.category}, ${result.formula})`;
}
function renderList(value) {
    const categories = value;
    const lines = [];
    for (const category of categories) {
        lines.push(`${category.id} (${category.name}, base: ${category.base}):`);
        lines.push(`  ${category.units.map((unit) => `${unit.symbol} = ${unit.name}`).join(' | ')}`);
    }
    return lines.join('\n');
}
/** Build both tool definitions from the resolved config. */
export function buildUnitsTools(config) {
    const convert_unit = defineTool({
        name: 'convert_unit',
        description: 'Convert a numeric value between two units of the same category: length, mass, temperature, ' +
            'area, volume (incl. cooking), speed, time duration, data size/transfer (decimal MB vs binary MiB), ' +
            'pressure, energy, angle, or frequency. Handles affine temperatures (C/F/K) correctly and keeps full ' +
            'precision internally, rounding only for display. Pure math, no network. Use list_units to discover ' +
            'accepted unit symbols and names.',
        parameters: {
            value: { type: 'number', required: true, description: 'Numeric value to convert, e.g. 100, -40, 1.5.' },
            from: { type: 'string', required: true, description: 'Source unit symbol or name, e.g. "km", "miles", "MB", "MiB", "celsius", "km/h".' },
            to: { type: 'string', required: true, description: 'Target unit symbol or name, e.g. "mi", "GB", "fahrenheit", "m/s". Must be in the same category as `from`.' },
        },
        output: {
            schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    value: { type: 'number', required: true },
                    from_unit: { type: 'string', required: true },
                    from_symbol: { type: 'string', required: true },
                    to_unit: { type: 'string', required: true },
                    to_symbol: { type: 'string', required: true },
                    result: { type: 'number', required: true },
                    formula: { type: 'string', required: true },
                    category: { type: 'string', required: true },
                },
            },
            render: (_args, value) => [{ type: 'text', text: renderConvert(value) }],
        },
        async execute(args) {
            return convert(args.value, args.from, args.to, config.maxDecimals);
        },
    });
    const list_units = defineTool({
        name: 'list_units',
        description: 'List every supported unit category with its unit symbols and full names. Pass an optional ' +
            'category to see just one, e.g. "data" or "temperature". Use this to find the exact symbols for ' +
            'convert_unit. Pure math, no network.',
        parameters: {
            category: { type: 'string', description: 'Optional category id or name to filter by, e.g. "data", "volume", "speed". Omit to list all.' },
        },
        output: {
            schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    categories: {
                        type: 'array',
                        required: true,
                        items: {
                            type: 'object',
                            additionalProperties: false,
                            properties: {
                                id: { type: 'string', required: true },
                                name: { type: 'string', required: true },
                                base: { type: 'string', required: true },
                                units: {
                                    type: 'array',
                                    required: true,
                                    items: {
                                        type: 'object',
                                        additionalProperties: false,
                                        properties: {
                                            symbol: { type: 'string', required: true },
                                            name: { type: 'string', required: true },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            render: (_args, value) => {
                const categories = value;
                return [{ type: 'text', text: renderList(categories.categories) }];
            },
        },
        async execute(args) {
            return { categories: listUnits(args.category) };
        },
    });
    return { convert_unit, list_units };
}
//# sourceMappingURL=tools.js.map