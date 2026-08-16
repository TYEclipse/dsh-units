# dsh-units 📐

Unit conversion toolbox for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (dsh) — **14 categories, zero runtime dependencies**, pure arithmetic over a static unit table (no network, no filesystem, no code execution).

When your agent needs to answer *"how many miles is 100 km?"*, *"is 1 MB bigger than 1 MiB?"*, *"what's 350°F in Celsius?"*, *"how many tablespoons in 2 cups?"*, *"16px is how many pt?"* or *"20 mpg in L/100km?"* — instead of doing error-prone mental math, it can call these tools and read exact results.

> 中文简介：dsh-units 是 DeepSeek Harness 的单位换算工具箱插件，覆盖长度、质量、温度、面积、体积（含美制烹饪单位）、速度、时长、数据大小（十进制 MB 与二进制 MiB 严格区分）、压强、能量、角度、频率、排版印刷（px/pt/em/rem）、油耗（L/100km ↔ mpg ↔ km/L）共 14 个类别，零运行时依赖、纯算术实现，无网络无副作用。让 Agent 不再心算——特别是"MB/MiB 混淆""华氏摄氏互转""加仑换升""mpg 与 L/100km 互算"这类高频出错点，直接调用工具拿精确结果。

## Why it exists

- **LLMs are unreliable at unit math.** Temperatures are affine (offset), data sizes mix decimal and binary prefixes, fuel economy is reciprocal (mpg vs. L/100km), and compound units (km/h, psi, kcal) hide awkward factors. A wrong conversion silently corrupts reports, recipes, travel plans, and capacity math.
- **Fully deterministic and offline.** Every factor lives in the static table in `src/units.ts` — no API keys, no lookup services, nothing to drift.
- **Structured results.** Each conversion returns the original value, both units (symbol + full name), the result, the formula applied, and the category — so the agent can explain its math instead of just asserting it.

## Tools

| Tool | What it does |
|------|--------------|
| `convert_unit` | Convert `value` from one unit to another within a category. Accepts symbols or full names (case-insensitive, °C, m², "miles", "MiB" all work). Rejects unknown units and cross-category pairs with clear errors. |
| `list_units` | List all 14 categories with every unit symbol and full name (optionally one category, e.g. `"data"` or `"temperature"`) — for discovering the exact symbols to pass to `convert_unit`. |

## Supported categories

| Category | Units (symbols) |
|----------|-----------------|
| length | km, m, cm, mm, um, nm, in, ft, yd, mi, nmi |
| mass | t (metric tonne), kg, g, mg, lb, oz |
| temperature | c, f, k — affine conversion with offsets |
| area | km2, ha, m2, cm2, mm2, mi2, acre, yd2, ft2, in2 |
| volume (incl. cooking) | m3, l, ml, cm3, gal, qt, pint, cup, floz, tbsp, tsp (US units) |
| speed | km/h, m/s, mph, knot, ft/s |
| time duration | yr (Julian, 365.25 d), wk, d, h, min, s, ms |
| data size / transfer | tbit…bit, pb…b (decimal), pib…kib (binary) — **MB ≠ MiB** |
| pressure | mpa, kpa, bar, atm, psi, mmhg, torr, pa |
| energy | kwh, wh, kcal, kj, cal, j, ev |
| angle | deg, rad, grad |
| frequency / rotation | ghz, mhz, khz, hz, rpm |
| typography (CSS / print) | px, pt, pc (pica), em, rem — 96 dpi reference, 16 px base font for em/rem |
| fuel economy | l/100km, l/km, mpg (US), mpg(uk) (imperial), km/l — reciprocal, **mpg ≠ linear** |

> **v0.2.0 note:** `pt` now means the typography *point* (previously the US *pint*). Use `pint` for pints — `convert_unit { value: 1, from: "pint", to: "l" }` still works. `em`/`rem` assume the common 16 px browser default base font size; `px` assumes 96 dpi (documented assumptions, not physical absolutes).

## Install

```sh
dsh plugin --profile default add github:TYEclipse/dsh-units
```

or clone and build locally:

```sh
git clone https://github.com/TYEclipse/dsh-units.git
cd dsh-units && pnpm install && pnpm build
```

## Usage

The agent just calls the tools — no setup beyond installation:

```
convert_unit { value: 100, from: "km", to: "mi" }
→ 100 km = 62.137119 mi (length, × 0.621371)

convert_unit { value: 500, from: "MiB", to: "MB" }
→ 500 MiB = 524.288 MB (data size / transfer, × 1.048576)

convert_unit { value: 350, from: "fahrenheit", to: "celsius" }
→ 350 f = 176.666667 c (temperature, (x − 32) × 5/9)

convert_unit { value: 16, from: "px", to: "pt" }
→ 16 px = 12 pt (typography (CSS / print), × 0.75)

convert_unit { value: 20, from: "mpg", to: "l/100km" }
→ 20 mpg = 11.760729 l/100km (fuel economy, 235.214583 ÷ x → x)

list_units { category: "volume" }
→ volume (volume (incl. cooking), base: liter): m3 = cubic meter | l = liter | ...
```

## Configuration

```yaml
plugins:
  dsh-units:
    maxDecimals: 6   # display rounding: decimals ≥ 1, significant digits below (1–12)
```

## Safety model

- **Pure math.** No network, no filesystem access, no subprocesses, no code execution.
- **Strict input validation.** Unknown units, cross-category pairs, and non-finite values throw descriptive errors instead of returning garbage.
- **Display-only rounding.** Internal computation keeps full float precision; rounding applies to the returned `result` only.
- **No opinions about validity.** Converting `-10 K` returns the arithmetic result; physical plausibility is the caller's business (documented so agents don't over-trust the tool).

## Development

```sh
pnpm install
pnpm build   # tsc, strict
pnpm test    # vitest, fully offline fixtures
pnpm lint    # oxlint (src + test only)
```

## License

MIT © 2026 TYEclipse
