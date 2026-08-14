/**
 * Tests for tool definition assembly, config resolution, execute/reject
 * behaviour, and text rendering.
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
    expect(Object.keys(tools).sort()).toEqual(['convert_unit', 'list_units'])
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

  it('list_units executes with and without a filter', async () => {
    const all = await tools.list_units.execute({})
    expect(all.categories).toHaveLength(12)
    const one = await tools.list_units.execute({ category: 'data' })
    expect(one.categories).toHaveLength(1)
    expect(one.categories[0]?.id).toBe('data')
  })

  it('renders conversion results as a one-line text', async () => {
    const result = await tools.convert_unit.execute({ value: 100, from: 'c', to: 'f' })
    const output = tools.convert_unit.output.render({ value: 100, from: 'c', to: 'f' }, result)
    expect(output).toEqual([{ type: 'text', text: '100 c = 212 f (temperature, × 9/5 + 32)' }])
  })

  it('renders unit listings as categorized text', async () => {
    const listing = await tools.list_units.execute({ category: 'angle' })
    const output = tools.list_units.output.render({}, { categories: listing.categories })
    const text = output[0]
    expect(text?.type).toBe('text')
    expect(typeof text?.text).toBe('string')
    expect(text?.text).toContain('deg = degree')
  })
})
