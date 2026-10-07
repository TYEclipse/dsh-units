# CHANGELOG · dsh-units

> 版本口径：patch 修 bug/补测试｜minor 新增用户可见功能｜major 破坏性变更。安装：`dsh plugin --profile web add github:TYEclipse/dsh-units`

## [0.5.0] — 2026-10-08
### Minor · R63
- 新增工具 **`unit_price`**：把 1–6 条报价 `{ price, per, quantity? }` 归一到同一目标单位（默认该类别基准单位），
  逐条给出每 1 个目标单位的价格、`best_index` 与 `spread_percent`；`quantity` 支持包装量（500 g 装 / 2 cup）；
  温度（仿射，零点任意）与油耗（倒数）明确拒绝，报价之间与 `to` 必须同类别（跨类别报价此前会静默错算）。
- 新增类别 **体积流量**（m3/s、m3/h、l/s、l/min、l/h、cfm、gpm）与 **密度**（kg/m3、g/l、g/cm3、g/ml、kg/l、t/m3、lb/ft3、lb/gal）。
  类别总数 20 → 22；`list_units` 描述与 README 同步。
- 期望值出处：oracle 随仓提交（`test/oracle/anchors.py`，42 条定义式锚点 + 往返一致性自检 `--check`），
  两个测试文件均带 `ORACLE:` 标记；本仓 oracle 迁移 6/15 → 7/15。
- 测试 49 → 67（+18），覆盖率 93.65% → 94.66%（基线棘轮上调）。
- 修复：密度表 `lb/gal` 因子曾按 kg/L 记（119.8264 kg/m³ 被写成 0.1198）——由 oracle 的自检当场拦下。

## [0.4.0] — 2026-09-11
### Minor · R35
- [自主进化] R35 dsh-units v0.4.0: add data transfer rate (Mbps vs MB/s), acceleration (g-force) and illumination (lux/foot-candle) categories — 20 total

## [0.3.2] — 2026-09-11
### Patch · R31
- [自主进化] 接入版本与覆盖率门禁（工具链）

## [0.3.1] — 2026-09-11
### Patch · R31
- [自主进化] 接入版本与覆盖率门禁（工具链）

