# dsh-units 📐（中文简介）

dsh-units 是 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（dsh）的单位换算工具箱插件：**14 个类别、零运行时依赖**，纯算术实现（无网络、无文件系统、无代码执行）。

## 解决什么问题

大模型心算单位换算是高频出错点：温度是仿射换算（有偏移）、数据大小混用十进制与二进制前缀、复合单位（km/h、psi、kcal）因子难记。算错一个单位，报告、菜谱、行程、容量估算全部静默出错。dsh-units 把换算交给确定性的静态单位表，返回结构化结果（原值、两侧单位符号与全名、结果、所用公式、类别），Agent 还能据此解释自己的计算过程。

## 工具

| 工具 | 功能 |
|------|------|
| `convert_unit` | 同一类别内换算数值。符号或全名均可（大小写不敏感，°C、m²、"miles"、"MiB" 都认）；未知单位、跨类别、非有限数值均报清晰错误 |
| `list_units` | 列出全部 14 个类别及每个单位的符号与全名（可按类别过滤，如 `"data"`、`"temperature"`） |

## 类别覆盖

长度（km…nmi）、质量（t/kg/g/mg/lb/oz）、温度（c/f/k，仿射）、面积（km2…in2、ha、acre）、体积含美制烹饪单位（gal/qt/pint/cup/floz/tbsp/tsp）、速度（km/h、m/s、mph、knot、ft/s）、时长（yr=儒略年/wk/d/h/min/s/ms）、数据大小（bit 到 tbit、B 到 PB、KiB 到 PiB，**MB 与 MiB 严格区分**）、压强（pa…psi、bar、atm、torr）、能量（j/kj/cal/kcal/wh/kwh/ev）、角度（deg/rad/grad）、频率（hz…ghz、rpm）、排版印刷（px/pt/pc/em/rem，96 dpi 基准，em/rem 按 16px 默认字号）、油耗（l/100km、l/km、mpg 美制、mpg(uk) 英制、km/l——倒数关系，mpg 与 L/100km 互算最容易翻车）。

> **v0.2.0 注意**：`pt` 现指印刷"点"（point，此前为美制品脱 pint）。品脱请用 `pint`——`convert_unit { value: 1, from: "pint", to: "l" }` 依然可用。em/rem 按浏览器常见默认 16px 基准字号换算，px 按 96 dpi——均为文档化的约定假设。

## 安装

```sh
dsh plugin --profile default add github:TYEclipse/dsh-units
```

## 配置

```yaml
plugins:
  dsh-units:
    maxDecimals: 6   # 显示舍入：≥1 用小数位，<1 用有效数字（1–12）
```

## 安全模型

纯算术、零副作用、严格输入校验、仅对显示结果舍入（内部保留全精度）。物理合理性（如负开尔文）不做判断，交给调用方。

## 许可

MIT © 2026 TYEclipse
