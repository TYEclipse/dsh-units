/**
 * Tests for tool definition assembly, config resolution, execute/reject
 * behaviour, and text rendering.
 *
 * ORACLE: test/oracle/anchors.py
 * Every numeric expectation below (and every rendered line) is printed by that
 * script, including the unit_price renderer anchors under "renderer anchors".
 */

import { describe, expect, it } from 'vitest'
import { resolveConfig } from '../src/index.ts'
import { buildUnitsTools } from '../src/tools.ts'

describe('resolveConfig', () => {
  it('applies every default', () => {
    expect(resolveConfig({})).toEqual({ maxDecimals: 6 })
  })

  it('honours overrides', () => {
    expect(resolveConfig({ maxDecimals: 3 }).maxDecimals).toBe(3)
  })
})

describe('buildUnitsTools', () => {
  const tools = buildUnitsTools(resolveConfig({}))

  it('exposes both tools under their canonical names', () => {
    expect(Object.keys(tools).sort()).toEqual(['convert_unit', 'list_units', 'unit_price'])
  })

  it('convert_unit executes a real conversion', async () => {
    const result = await tools.convert_unit.execute({ value: 100, from: 'km', to: 'mi' })
    expect(result).toMatchObject({
      value: 100,
      from_symbol: 'km',
      to_symbol: 'mi',
      result: 62.137119,
      category: 'length',
    })
  })

  it('convert_unit rejects invalid input as a rejected promise', async () => {
    await expect(tools.convert_unit.execute({ value: 1, from: 'km', to: 'kg' })).rejects.toThrow(/must share a category/)
    await expect(tools.convert_unit.execute({ value: 1, from: 'parsecs', to: 'm' })).rejects.toThrow(/unknown unit/)
  })

  it('convert_unit reaches the new flow rate and density categories', async () => {
    const flow = await tools.convert_unit.execute({ value: 1, from: 'gpm', to: 'l/s' })
    expect(flow.result).toBe(0.0630902)
    const density = await tools.convert_unit.execute({ value: 1, from: 'lb/ft3', to: 'kg/m3' })
    expect(density.result).toBe(16.018463)
  })

  it('list_units executes with and without a filter', async () => {
    const all = await tools.list_units.execute({})
    expect(all.categories).toHaveLength(22)
    const one = await tools.list_units.execute({ category: 'data' })
    expect(one.categories).toHaveLength(1)
    expect(one.categories[0]?.id).toBe('data')
  })

  it('unit_price executes a comparison and rejects bad input', async () => {
    const priced = await tools.unit_price.execute({
      offers: [{ price: 3.99, per: 'lb' }, { price: 8.5, per: 'kg' }],
      to: 'kg',
    })
    expect(priced.target_symbol).toBe('kg')
    expect(priced.best_index).toBe(1)
    expect(priced.best_price_per_target).toBe(8.5)
    expect(priced.offers[0]?.price_per_target).toBe(8.796444)

    const single = await tools.unit_price.execute({ offers: [{ price: 4.29, per: 'g', quantity: 500 }] })
    expect(single.target_symbol).toBe('kg')
    expect(single.offers[0]?.price_per_target).toBe(8.58)
    expect(single.spread_percent).toBe(0)

    await expect(tools.unit_price.execute({ offers: [{ price: 1, per: 'celsius' }] })).rejects.toThrow(/affine/)
    await expect(tools.unit_price.execute({ offers: [] })).rejects.toThrow(/non-empty array/)
  })

  it('renders conversion results as a one-line text', async () => {
    const result = await tools.convert_unit.execute({ value: 100, from: 'c', to: 'f' })
    const output = tools.convert_unit.output.render({ value: 100, from: 'c', to: 'f' }, result)
    expect(output).toEqual([{ type: 'text', text: '100 c = 212 f (temperature, × 9/5 + 32)' }])
  })

  it('renders flow rate and density conversions with their own category labels', async () => {
    const flow = await tools.convert_unit.execute({ value: 1, from: 'gpm', to: 'l/s' })
    expect(tools.convert_unit.output.render({ value: 1, from: 'gpm', to: 'l/s' }, flow)).toEqual([
      { type: 'text', text: '1 gpm = 0.0630902 l/s (volumetric flow rate, × 0.0630901964)' },
    ])
    const density = await tools.convert_unit.execute({ value: 1, from: 'lb/ft3', to: 'kg/m3' })
    expect(tools.convert_unit.output.render({ value: 1, from: 'lb/ft3', to: 'kg/m3' }, density)).toEqual([
      { type: 'text', text: '1 lb/ft3 = 16.018463 kg/m3 (density, × 16.018463373960138)' },
    ])
  })

  it('renders unit-price comparisons with the cheapest offer and spread', async () => {
    const args = { offers: [{ price: 3.99, per: 'lb' }, { price: 8.5, per: 'kg' }], to: 'kg' }
    const result = await tools.unit_price.execute(args)
    expect(tools.unit_price.output.render(args, result)).toEqual([{
      type: 'text',
      text: 'unit prices per kg (mass):\n' +
        '  #1 3.99 per lb → 8.796444 per kg\n' +
        '  #2 8.5 per kg → 8.5 per kg\n' +
        'cheapest: #2 at 8.5 per kg (spread 3.370046%)',
    }])
  })

  it('shows package quantities in the unit-price renderer', async () => {
    const args = { offers: [{ price: 4.29, per: 'g', quantity: 500 }, { price: 3.59, per: 'lb' }], to: 'kg' }
    const result = await tools.unit_price.execute(args)
    expect(tools.unit_price.output.render(args, result)).toEqual([{
      type: 'text',
      text: 'unit prices per kg (mass):\n' +
        '  #1 4.29 per g (500 g) = 0.5 kg → 8.58 per kg\n' +
        '  #2 3.59 per lb → 7.914595 per kg\n' +
        'cheapest: #2 at 7.914595 per kg (spread 7.755301%)',
    }])
  })

  it('renders unit listings as categorized text', async () => {
    const listing = await tools.list_units.execute({ category: 'angle' })
    const output = tools.list_units.output.render({}, { categories: listing.categories })
    const text = output[0]
    expect(text?.type).toBe('text')
    expect(typeof text?.text).toBe('string')
    expect(text?.text).toContain('deg = degree')
  })

  it('lists the new flow rate and density categories', async () => {
    const flow = await tools.list_units.execute({ category: 'flow' })
    const output = tools.list_units.output.render({ category: 'flow' }, { categories: flow.categories })
    expect(output[0]?.text).toContain('gpm = US gallon per minute')
    expect(output[0]?.text).toContain('cfm = cubic foot per minute')
  })
})
