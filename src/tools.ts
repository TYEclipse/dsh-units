/**
 * Tool definitions for dsh-units: convert_unit and list_units, exposed to
 * every agent via defineTool with strict JSON-schema parameter surfaces and
 * compact text renderers.
 *
 * @module dsh-units/tools
 */

import { defineTool, type ToolDefinition } from '@deepseek-ai/dsh-tools'
import {
  convert,
  listUnits,
  unitPrice,
  MAX_PRICE_OFFERS,
  type ConversionResult,
  type CategoryListing,
  type PriceComparison,
} from './units.ts'
import type { ResolvedConfig } from './index.ts'

export interface ToolSet {
  convert_unit: ToolDefinition
  list_units: ToolDefinition
  unit_price: ToolDefinition
}

function renderConvert(value: unknown): string {
  const result = value as ConversionResult
  return `${result.value} ${result.from_symbol} = ${result.result} ${result.to_symbol} ` +
    `(${result.category}, ${result.formula})`
}

function renderList(value: unknown): string {
  const categories = value as CategoryListing[]
  const lines: string[] = []
  for (const category of categories) {
    lines.push(`${category.id} (${category.name}, base: ${category.base}):`)
    lines.push(`  ${category.units.map((unit) => `${unit.symbol} = ${unit.name}`).join(' | ')}`)
  }
  return lines.join('\n')
}

function renderPrice(value: unknown): string {
  const result = value as PriceComparison
  const lines: string[] = [`unit prices per ${result.target_symbol} (${result.category}):`]
  for (const offer of result.offers) {
    lines.push(`  #${offer.index + 1} ${offer.price} per ${offer.per_symbol}` +
      `${offer.quantity === 1 ? '' : ` (${offer.quantity} ${offer.per_symbol})`}` +
      `${offer.quantity === 1 ? '' : ` = ${offer.total_target} ${result.target_symbol}`}` +
      ` → ${offer.price_per_target} per ${result.target_symbol}`)
  }
  lines.push(`cheapest: #${result.best_index + 1} at ${result.best_price_per_target} per ${result.target_symbol}` +
    ` (spread ${result.spread_percent}%)`)
  return lines.join('\n')
}

/** Build both tool definitions from the resolved config. */
export function buildUnitsTools(config: ResolvedConfig): ToolSet {
  const convert_unit = defineTool({
    name: 'convert_unit',
    description: 'Convert a numeric value between two units of the same category: length, mass, temperature, ' +
      'area, volume (incl. cooking), speed, time duration, data size (decimal MB vs binary MiB), data transfer ' +
      'rate (Mbps vs MB/s, MiB/s), acceleration (m/s², g-force), illumination (lux, foot-candles), pressure, ' +
      'energy, angle, frequency, power (mechanical/metric/electric horsepower, BTU/h), force ' +
      '(newton, pound-force, kgf), torque (newton meter, pound-force foot), typography (px/pt/em/rem at 96 ' +
      'dpi, 16 px base font), volumetric flow rate (m³/s, L/min, CFM, US gpm), density (kg/m³, g/cm³, ' +
      'lb/ft³, lb/gal), or fuel economy (L/100km ↔ mpg US/UK ↔ km/L). Handles affine temperatures ' +
      '(C/F/K) and reciprocal fuel economy correctly, keeping full precision internally and rounding only ' +
      'for display. Pure math, no network. Use list_units to discover accepted unit symbols and names.',
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
      render: (_args: { value: number; from: string; to: string }, value: unknown) => [{ type: 'text', text: renderConvert(value) }],
    },
    async execute(args: { value: number; from: string; to: string }) {
      return convert(args.value, args.from, args.to, config.maxDecimals)
    },
  })

  const list_units = defineTool({
    name: 'list_units',
    description: 'List every supported unit category with its unit symbols and full names. Pass an optional ' +
      'category to see just one, e.g. "data" or "temperature". Use this to find the exact symbols for ' +
      'convert_unit and unit_price. Pure math, no network.',
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
      render: (_args: { category?: string }, value: unknown) => {
        const categories = value as { categories: CategoryListing[] }
        return [{ type: 'text', text: renderList(categories.categories) }]
      },
    },
    async execute(args: { category?: string }) {
      return { categories: listUnits(args.category) }
    },
  })

  const unit_price = defineTool({
    name: 'unit_price',
    description: `Normalize and compare unit prices: pass 1–${MAX_PRICE_OFFERS} offers as { price, per, quantity? } ` +
      '(price = what you pay, per = the unit it buys, quantity = how many of that unit, default 1) and get the price ' +
      'of one `to` unit for each offer (default: the category base unit — meter, kilogram, liter, second, bit, …), plus ' +
      'the cheapest offer and the spread in percent. Catches the classic "is $3.99/lb cheaper than $8.50/kg?" and ' +
      '"500 g for $4.29 vs 1 lb for $3.59" traps without mental math. Only linear units are accepted: temperatures ' +
      '(affine, arbitrary zero point) and fuel economy (reciprocal) are rejected with an explanation instead of a ' +
      'wrong number. Pure math, no network.',
    parameters: {
      offers: {
        type: 'array',
        required: true,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            price: { type: 'number', required: true, description: 'Total price paid for this offer, e.g. 3.99.' },
            per: { type: 'string', required: true, description: 'Unit the price buys, e.g. "lb", "kg", "L", "gal", "kwh".' },
            quantity: { type: 'number', description: 'How many `per` units the price buys; default 1. Use 500 with per "g" for a 500 g pack.' },
          },
        },
        description: `Between 1 and ${MAX_PRICE_OFFERS} offers, e.g. [{ price: 3.99, per: "lb" }, { price: 8.5, per: "kg" }].`,
      },
      to: { type: 'string', description: 'Unit to express every price in, e.g. "kg", "L". Must share a category with every offer unit. Omit for the category base unit.' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          category: { type: 'string', required: true },
          target_unit: { type: 'string', required: true },
          target_symbol: { type: 'string', required: true },
          offers: {
            type: 'array',
            required: true,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                index: { type: 'number', required: true },
                price: { type: 'number', required: true },
                quantity: { type: 'number', required: true },
                per_unit: { type: 'string', required: true },
                per_symbol: { type: 'string', required: true },
                total_target: { type: 'number', required: true },
                price_per_target: { type: 'number', required: true },
                formula: { type: 'string', required: true },
              },
            },
          },
          best_index: { type: 'number', required: true },
          best_price_per_target: { type: 'number', required: true },
          spread_percent: { type: 'number', required: true },
        },
      },
      render: (_args: { offers: Array<{ price: number; per: string; quantity?: number }>; to?: string }, value: unknown) =>
        [{ type: 'text', text: renderPrice(value) }],
    },
    async execute(args: { offers: Array<{ price: number; per: string; quantity?: number }>; to?: string }) {
      return unitPrice(args.offers, args.to, config.maxDecimals)
    },
  })

  return { convert_unit, list_units, unit_price }
}
