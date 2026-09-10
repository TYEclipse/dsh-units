# dsh-units 📐

Unit conversion toolbox for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (dsh) — **20 categories, zero runtime dependencies**, pure arithmetic over a static unit table (no network, no filesystem, no code execution).

When your agent needs to answer *"how many miles is 100 km?"*, *"is 1 MB bigger than 1 MiB?"*, *"is 100 Mbps the same as 100 MB/s?"*, *"what's 350°F in Celsius?"*, *"how many tablespoons in 2 cups?"*, *"16px is how many pt?"*, *"20 mpg in L/100km?"*, *"150 kW is how much mechanical horsepower?"* or *"how many g is 9.8 m/s²?"* — instead of doing error-prone mental math, it can call these tools and read exact results.

> 中文简介：dsh-units 是 DeepSeek Harness 的单位换算工具箱插件，覆盖长度、质量、温度、面积、体积（含美制烹饪单位）、速度、时长、数据大小（十进制 MB 与二进制 MiB 严格区分）、数据传输速率（Mbps 与 MB/s 严格区分）、加速度（g-force）、照度（lux / 英尺烛光）、压强、能量、角度、频率、功率（机械/公制/电动马力严格区分）、力、扭矩、排版印刷（px/pt/em/rem）、油耗（L/100km ↔ mpg ↔ km/L）共 20 个类别，零运行时依赖、纯算术实现，无网络无副作用。让 Agent 不再心算——特别是"MB/MiB 混淆""100 Mbps 不等于 100 MB/s""华氏摄氏互转""加仑换升""mpg 与 L/100km 互算""三种马力混淆"这类高频出错点，直接调用工具拿精确结果。

## Why it exists

- **LLMs are unreliable at unit math.** Temperatures are affine (offset), data sizes mix decimal and binary prefixes, fuel economy is reciprocal (mpg vs. L/100km), and compound units (km/h, psi, kcal) hide awkward factors. A wrong conversion silently corrupts reports, recipes, travel plans, and capacity math.
- **Fully deterministic and offline.** Every factor lives in the static table in `src/units.ts` — no API keys, no lookup services, nothing to drift.
- **Structured results.** Each conversion returns the original value, both units (symbol + full name), the result, the formula applied, and the category — so the agent can explain its math instead of just asserting it.

## Tools

| Tool | What it does |
|------|--------------|
| `convert_unit` | Convert `value` from one unit to another within a category. Accepts symbols or full names (case-insensitive, °C, m², "miles", "MiB" all work). Rejects unknown units and cross-category pairs with clear errors. |
| `list_units` | List all 20 categories with every unit symbol and full name (optionally one category, e.g. `"data"` or `"temperature"`) — for discovering the exact symbols to pass to `convert_unit`. |

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
| data size | tbit…bit, pb…b (decimal), pib…kib (binary) — **MB ≠ MiB** |
| data transfer rate | tbit/s…bit/s (decimal bits), tb/s…b/s (decimal bytes), tib/s…kib/s (binary bytes) — **100 Mbps = 12.5 MB/s** |
| acceleration | m/s2, g0 (standard gravity 9.80665 m/s²), ft/s2, mph/s — g-force & automotive |
| illumination | klx, lx (lux), fc (foot-candle), ph (phot) — 1 fc = 10.76391 lx |
| pressure | mpa, kpa, bar, atm, psi, mmhg, torr, pa |
| energy | kwh, wh, kcal, kj, cal, j, ev |
| angle | deg, rad, grad |
| frequency / rotation | ghz, mhz, khz, hz, rpm |
| typography (CSS / print) | px, pt, pc (pica), em, rem — 96 dpi reference, 16 px base font for em/rem |
| fuel economy | l/100km, l/km, mpg (US), mpg(uk) (imperial), km/l — reciprocal, **mpg ≠ linear** |
| power | mw, kw, w, hp (mechanical = 550 ft·lbf/s), hp(m) (metric PS), hp(e) (electric 746 W), btu/h (IT), ftlb/s — **three different horsepower definitions** |
| force | kn, n, dyn, lbf, kgf (kp), gf — lbf/kgf are weight-based at standard gravity 9.80665 m/s² |
| torque | n.m, kgf.m, lbfft (pound-force foot), lbfin (pound-force inch) — force × length |

> **v0.2.0 note:** `pt` now means the typography *point* (previously the US *pint*). Use `pint` for pints — `convert_unit { value: 1, from: "pint", to: "l" }` still works. `em`/`rem` assume the common 16 px browser default base font size; `px` assumes 96 dpi (documented assumptions, not physical absolutes).
>
> **v0.3.0 note (symbol disambiguation):** typed input `kn` resolves to *knot* (speed) — reach kilonewton by its full name (`convert_unit { value: 1, from: "kilonewton", to: "n" }`). Likewise `nm` is the *nanometer* (length); the torque newton meter uses the symbol `n.m` (also `n·m` or full names).
>
> **v0.4.0 note (category split & disambiguation):** the old `data size / transfer` category is now **`data size`** (sizes only); rates live in **`data transfer rate`** — `mb/s` means megabyte per second (following `mb` = megabyte in the data table), while `mbps` / `mbit/s` mean megabit per second, so `100 Mbps → 12.5 MB/s` exactly. In acceleration, typed `g` stays the *gram* (mass) — gravity is `g0` / `gravity` / `g-force`; `gal` stays the US *gallon* (no galileo unit); `ph` is the *phot*, not pH.

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
→ 100 km = 62.137119 mi (length, × 0.621371192237334)

convert_unit { value: 500, from: "MiB", to: "MB" }
→ 500 mib = 524.288 mb (data size, × 1.048576)

convert_unit { value: 100, from: "Mbps", to: "MB/s" }
→ 100 mbit/s = 12.5 mb/s (data transfer rate, × 0.125)

convert_unit { value: 350, from: "fahrenheit", to: "celsius" }
→ 350 f = 176.666667 c (temperature, (x − 32) × 5/9)

convert_unit { value: 16, from: "px", to: "pt" }
→ 16 px = 12 pt (typography (CSS / print), × 0.75)

convert_unit { value: 20, from: "mpg", to: "l/100km" }
→ 20 mpg = 11.760729 l/100km (fuel economy, 235.214583 ÷ x → x)

convert_unit { value: 150, from: "kw", to: "hp" }
→ 150 kw = 201.153313 hp (power, × 1.3410220895950278)

convert_unit { value: 1, from: "lbfft", to: "n.m" }
→ 1 lbfft = 1.355818 n.m (torque, × 1.3558179483314003)

convert_unit { value: 9.8, from: "m/s2", to: "g0" }
→ 9.8 m/s2 = 0.999322 g0 (acceleration, × 0.10197162129779283)

convert_unit { value: 1, from: "fc", to: "lx" }
→ 1 fc = 10.76391 lx (illumination, × 10.763910416709722)

list_units { category: "volume" }
→ volume (volume (incl. cooking), base: liter): m3 = cubic meter | l = liter | ...
```

> All outputs above are captured from the built `dist/` (v0.4.0).

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
