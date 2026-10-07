#!/usr/bin/env python3
"""Oracle for dsh-units: the independent source of every numeric anchor in the
test suite.

Written from definitional / published identities (inch = 25.4 mm exactly,
pound = 0.45359237 kg, US gallon = 3.785411784 L, g0 = 9.80665 m/s², mechanical
horsepower = 550 ft·lbf/s, BTU(IT) = 1055.05585262 J, eV = 1.602176634e-19 J,
nautical mile = 1852 m, acre = 4046.8564224 m², Julian year = 365.25 d …) and
NOT by copying numbers out of the TypeScript implementation or the test file.

Usage:
  python3 test/oracle/anchors.py            # print every anchor asserted in tests
  python3 test/oracle/anchors.py --check    # self-check the definitional anchors

The rounding rule mirrors the plugin's display rounding: `decimals` decimals for
magnitudes ≥ 1, `decimals` significant digits below 1.
"""

from __future__ import annotations

import math
import sys
from typing import Any, Dict, List, Optional, Sequence, Tuple

# ---------------------------------------------------------------- definitions
INCH = 0.0254                      # international inch, exact
FOOT = 0.3048                      # 12 inches, exact
YARD = 0.9144                      # 3 feet, exact
MILE = 1609.344                    # 1760 yards, exact
NAUTICAL_MILE = 1852.0             # exact
POUND = 0.45359237                 # international avoirdupois pound, exact
OUNCE = POUND / 16
G0 = 9.80665                       # standard gravity, exact
GAL_US = 3.785411784               # US liquid gallon, exact
BTU_IT = 1055.05585262             # BTU(IT), exact
ELECTRONVOLT = 1.602176634e-19     # exact after the 2019 SI redefinition
ACRE = 4046.8564224                # exact
JULIAN_YEAR = 365.25 * 86400
GALLON_PER_FOOT3 = GAL_US / FOOT**3
MMHG = 13.5951 * 1000 / 1000 * G0  # conventional millimetre of mercury column

# category -> (base name, kind, {symbol: (name, factor*)})
# * factor = how many base units one of this unit contains (linear categories).
CATEGORIES: "Dict[str, Tuple[str, str, Dict[str, Tuple[str, float]]]]" = {
    "length": ("meter", "linear", {
        "km": ("kilometer", 1000.0), "m": ("meter", 1.0), "cm": ("centimeter", 0.01),
        "mm": ("millimeter", 0.001), "um": ("micrometer", 1e-6), "nm": ("nanometer", 1e-9),
        "in": ("inch", INCH), "ft": ("foot", FOOT), "yd": ("yard", YARD),
        "mi": ("mile", MILE), "nmi": ("nautical mile", NAUTICAL_MILE),
    }),
    "mass": ("kilogram", "linear", {
        "t": ("tonne (metric)", 1000.0), "kg": ("kilogram", 1.0), "g": ("gram", 0.001),
        "mg": ("milligram", 1e-6), "lb": ("pound", POUND), "oz": ("ounce", OUNCE),
    }),
    "temperature": ("celsius", "temperature", {
        "c": ("celsius", 0.0), "f": ("fahrenheit", 0.0), "k": ("kelvin", 0.0),
    }),
    "area": ("square meter", "linear", {
        "km2": ("square kilometer", 1e6), "ha": ("hectare", 1e4), "m2": ("square meter", 1.0),
        "cm2": ("square centimeter", 1e-4), "mm2": ("square millimeter", 1e-6),
        "mi2": ("square mile", MILE**2), "acre": ("acre", ACRE),
        "yd2": ("square yard", YARD**2), "ft2": ("square foot", FOOT**2),
        "in2": ("square inch", INCH**2),
    }),
    "volume": ("liter", "linear", {
        "m3": ("cubic meter", 1000.0), "l": ("liter", 1.0), "ml": ("milliliter", 0.001),
        "cm3": ("cubic centimeter", 0.001), "gal": ("US gallon", GAL_US),
        "qt": ("US quart", GAL_US / 4), "pint": ("US pint", GAL_US / 8),
        "cup": ("US cup", 0.24), "floz": ("US fluid ounce", GAL_US / 128),
        "tbsp": ("tablespoon (US)", GAL_US / 256), "tsp": ("teaspoon (US)", GAL_US / 768),
    }),
    "speed": ("meter per second", "linear", {
        "km/h": ("kilometer per hour", 1000.0 / 3600), "m/s": ("meter per second", 1.0),
        "mph": ("mile per hour", MILE / 3600), "knot": ("knot", NAUTICAL_MILE / 3600),
        "ft/s": ("foot per second", FOOT),
    }),
    "time": ("second", "linear", {
        "yr": ("year (Julian, 365.25 days)", JULIAN_YEAR), "wk": ("week", 604800.0),
        "d": ("day", 86400.0), "h": ("hour", 3600.0), "min": ("minute", 60.0),
        "s": ("second", 1.0), "ms": ("millisecond", 0.001),
    }),
    "data": ("bit", "linear", {
        "tbit": ("terabit", 1e12), "gbit": ("gigabit", 1e9), "mbit": ("megabit", 1e6),
        "kbit": ("kilobit", 1e3), "bit": ("bit", 1.0),
        "pb": ("petabyte (decimal)", 8e15), "tb": ("terabyte (decimal)", 8e12),
        "gb": ("gigabyte (decimal)", 8e9), "mb": ("megabyte (decimal)", 8e6),
        "kb": ("kilobyte (decimal)", 8e3), "b": ("byte", 8.0),
        "pib": ("pebibyte (binary)", 8 * 1024**5), "tib": ("tebibyte (binary)", 8 * 1024**4),
        "gib": ("gibibyte (binary)", 8 * 1024**3), "mib": ("mebibyte (binary)", 8 * 1024**2),
        "kib": ("kibibyte (binary)", 8 * 1024),
    }),
    "pressure": ("pascal", "linear", {
        "mpa": ("megapascal", 1e6), "kpa": ("kilopascal", 1e3), "bar": ("bar", 1e5),
        "atm": ("standard atmosphere", 101325.0),
        "psi": ("pound per square inch", POUND * G0 / INCH**2),
        "mmhg": ("millimeter of mercury", MMHG), "torr": ("torr", 101325.0 / 760),
        "pa": ("pascal", 1.0),
    }),
    "energy": ("joule", "linear", {
        "kwh": ("kilowatt-hour", 3.6e6), "wh": ("watt-hour", 3600.0),
        "kcal": ("kilocalorie", 4184.0), "kj": ("kilojoule", 1e3),
        "cal": ("calorie", 4.184), "j": ("joule", 1.0),
        "ev": ("electronvolt", ELECTRONVOLT),
    }),
    "angle": ("radian", "linear", {
        "deg": ("degree", math.pi / 180), "rad": ("radian", 1.0),
        "grad": ("gradian (gon)", math.pi / 200),
    }),
    "frequency": ("hertz", "linear", {
        "ghz": ("gigahertz", 1e9), "mhz": ("megahertz", 1e6), "khz": ("kilohertz", 1e3),
        "hz": ("hertz", 1.0), "rpm": ("revolution per minute", 1.0 / 60),
    }),
    "typography": ("pixel (96 dpi)", "linear", {
        "px": ("pixel (96 dpi)", 1.0), "pt": ("point (1/72 inch)", 96.0 / 72),
        "pc": ("pica (12 pt)", 16.0), "em": ("em (16 px base font)", 16.0),
        "rem": ("rem (root em, 16 px base)", 16.0),
    }),
    "fuel": ("liter per 100 km", "fuel", {
        "l/100km": ("liters per 100 km", 0.0), "l/km": ("liters per km", 0.0),
        "mpg": ("miles per US gallon", 0.0), "mpg(uk)": ("miles per imperial (UK) gallon", 0.0),
        "km/l": ("kilometers per liter", 0.0),
    }),
    "power": ("watt", "linear", {
        "mw": ("megawatt", 1e6), "kw": ("kilowatt", 1e3), "w": ("watt", 1.0),
        "hp": ("horsepower (mechanical)", 550 * POUND * G0 * FOOT),
        "hp(m)": ("metric horsepower (PS)", 75 * G0),
        "hp(e)": ("electric horsepower", 746.0),
        "btu/h": ("BTU per hour (IT)", BTU_IT / 3600),
        "ftlb/s": ("foot-pound per second", POUND * G0 * FOOT),
    }),
    "force": ("newton", "linear", {
        "kn": ("kilonewton", 1e3), "n": ("newton", 1.0), "dyn": ("dyne", 1e-5),
        "lbf": ("pound-force", POUND * G0), "kgf": ("kilogram-force (kp)", G0),
        "gf": ("gram-force", G0 / 1000),
    }),
    "torque": ("newton meter", "linear", {
        "n.m": ("newton meter", 1.0),
        "kgf.m": ("kilogram-force meter", G0),
        "lbfft": ("pound-force foot", POUND * G0 * FOOT),
        "lbfin": ("pound-force inch", POUND * G0 * FOOT / 12),
    }),
    "datarate": ("bit per second", "linear", {
        "tbit/s": ("terabit per second", 1e12), "gbit/s": ("gigabit per second", 1e9),
        "mbit/s": ("megabit per second", 1e6), "kbit/s": ("kilobit per second", 1e3),
        "bit/s": ("bit per second", 1.0),
        "tb/s": ("terabyte per second (decimal)", 8e12),
        "gb/s": ("gigabyte per second (decimal)", 8e9),
        "mb/s": ("megabyte per second (decimal)", 8e6),
        "kb/s": ("kilobyte per second (decimal)", 8e3), "b/s": ("byte per second", 8.0),
        "tib/s": ("tebibyte per second (binary)", 8 * 1024**4),
        "gib/s": ("gibibyte per second (binary)", 8 * 1024**3),
        "mib/s": ("mebibyte per second (binary)", 8 * 1024**2),
        "kib/s": ("kibibyte per second (binary)", 8 * 1024),
    }),
    "acceleration": ("meter per second squared", "linear", {
        "m/s2": ("meter per second squared", 1.0),
        "g0": ("standard gravity (9.80665 m/s²)", G0),
        "ft/s2": ("foot per second squared", FOOT),
        "mph/s": ("mile per hour per second", MILE / 3600),
    }),
    "illumination": ("lux", "linear", {
        "klx": ("kilolux", 1e3), "lx": ("lux (lumen per square meter)", 1.0),
        "fc": ("foot-candle (lumen per square foot)", 1.0 / FOOT**2),
        "ph": ("phot", 1e4),
    }),
    "flow": ("cubic meter per second", "linear", {
        "m3/s": ("cubic meter per second", 1.0),
        "m3/h": ("cubic meter per hour", 1.0 / 3600),
        "l/s": ("liter per second", 0.001),
        "l/min": ("liter per minute", 0.001 / 60),
        "l/h": ("liter per hour", 0.001 / 3600),
        "cfm": ("cubic foot per minute", FOOT**3 / 60),
        # same one-division form as the plugin so the last ulp agrees
        "gpm": ("US gallon per minute", GAL_US / 60000),
    }),
    "density": ("kilogram per cubic meter", "linear", {
        "kg/m3": ("kilogram per cubic meter", 1.0), "g/l": ("gram per liter", 1.0),
        "g/cm3": ("gram per cubic centimeter", 1e3), "g/ml": ("gram per milliliter", 1e3),
        "kg/l": ("kilogram per liter", 1e3), "t/m3": ("tonne per cubic meter", 1e3),
        "lb/ft3": ("pound per cubic foot", POUND / FOOT**3),
        "lb/gal": ("pound per US gallon", POUND * 1000 / GAL_US),
    }),
}

L100KM_PER_MPG_US = 100 * GAL_US / (MILE / 1000)
L100KM_PER_MPG_UK = 100 * 4.54609 / (MILE / 1000)

# Alias surface the test suite feeds in (a spec of the *input* contract, not a
# copy of the plugin's alias table): normalization handles case, spaces, °, ²,
# ³ and µ first, then this map folds the remaining names onto canonical symbols.
ALIASES: "Dict[str, str]" = {
    "celsius": "c", "centigrade": "c", "fahrenheit": "f", "kelvin": "k",
    "miles": "mi", "kilometer": "km", "kilometers": "km",
    "squarefeet": "ft2", "sqft": "ft2",
    "litres": "l", "gallons": "gal",
    "footcandles": "fc", "lumenspersquarefoot": "fc", "lux": "lx", "kilolux": "klx",
    "gravity": "g0", "g-force": "g0", "gforce": "g0",
    "kilonewton": "kn", "ps": "hp(m)", "cv": "hp(m)",
    "ftlb": "lbfft", "usmpg": "mpg", "litersper100km": "l/100km", "kmpl": "km/l",
    "ukmpg": "mpg(uk)", "mpguk": "mpg(uk)",
    "mbps": "mbit/s", "gbps": "gbit/s", "kbps": "kbit/s", "bps": "bit/s",
    "kilobytepersecond": "kb/s", "megabytepersecond": "mb/s",
    "mibpersecond": "mib/s", "kibibytepersecond": "kib/s",
}


def normalize(raw: str) -> str:
    key = raw.strip().lower().replace(" ", "").replace("°", "")
    key = key.replace("²", "2").replace("³", "3").replace("^", "")
    return key.replace("µ", "u").replace("μ", "u")


def resolve(raw: str) -> str:
    """Canonical symbol for a test-facing unit string."""
    key = normalize(raw)
    return ALIASES.get(key, key)


MAX_PRICE_OFFERS = 6


def fuel_to_base(value: float, symbol: str) -> float:
    if symbol == "l/100km":
        return value
    if symbol == "l/km":
        return value * 100
    if symbol == "mpg":
        return L100KM_PER_MPG_US / value
    if symbol == "mpg(uk)":
        return L100KM_PER_MPG_UK / value
    if symbol == "km/l":
        return 100 / value
    raise KeyError(symbol)


def fuel_from_base(value: float, symbol: str) -> float:
    return fuel_to_base(value, symbol)


def round_value(value: float, decimals: Optional[int] = 6) -> float:
    """Mirror the plugin's display rounding (decimals for ≥1, sig digits below).

    `decimals=None` returns the raw double, which is what the self-check needs:
    comparing a *rounded* result against an exact definitional value is itself a
    silent trap.
    """
    if decimals is None or not math.isfinite(value):
        return value
    if value == 0:
        return 0.0
    if abs(value) >= 1:
        return float(f"{value:.{decimals}f}")
    return float(f"{value:.{decimals}g}")


def convert(value: float, from_symbol: str, to_symbol: str, decimals: Optional[int] = 6) -> float:
    """Expected `result` for convert(value, from, to); decimals=None → raw."""
    source, target = resolve(from_symbol), resolve(to_symbol)
    for _cid, (_base, kind, units) in CATEGORIES.items():
        if source in units and target in units:
            if kind == "temperature":
                celsius = {"c": value, "f": (value - 32) * 5 / 9, "k": value - 273.15}[source]
                out = {"c": celsius, "f": celsius * 9 / 5 + 32, "k": celsius + 273.15}[target]
                return round_value(out, decimals)
            if kind == "fuel":
                return round_value(fuel_from_base(fuel_to_base(value, source), target), decimals)
            return round_value(value * units[source][1] / units[target][1], decimals)
    raise KeyError(f"{from_symbol} -> {to_symbol}")


def exact(value: float, from_symbol: str, to_symbol: str) -> float:
    """Unrounded conversion — the self-check's measuring stick."""
    return convert(value, from_symbol, to_symbol, None)


def category_of(symbol: str) -> Tuple[str, str, Dict[str, Tuple[str, float]]]:
    canonical = resolve(symbol)
    for cid, entry in CATEGORIES.items():
        if canonical in entry[2]:
            return cid, entry[1], entry[2]
    raise KeyError(symbol)


def base_symbol(cid: str) -> str:
    for symbol, (_name, factor) in CATEGORIES[cid][2].items():
        if factor == 1.0:
            return symbol
    raise KeyError(cid)


def unit_price(offers: Sequence[Tuple[float, str, float]], to: Optional[str] = None,
               decimals: int = 6) -> Dict[str, Any]:
    """Expected unit_price output for offers of (price, per, quantity)."""
    first_cid, _first_kind, first_units = category_of(offers[0][1])
    target = resolve(to) if to is not None else base_symbol(first_cid)
    target_factor = first_units[target][1]
    quotes: List[Dict[str, Any]] = []
    per_targets: List[float] = []
    for index, (price, per, quantity) in enumerate(offers):
        cid, _kind, units = category_of(per)
        assert cid == first_cid, per
        symbol = resolve(per)
        factor = units[symbol][1]
        total_target = quantity * factor / target_factor
        per_target = price / total_target
        per_targets.append(per_target)
        quotes.append({
            "index": index,
            "price": price,
            "quantity": quantity,
            "per_symbol": symbol,
            "total_target": round_value(total_target, decimals),
            "price_per_target": round_value(per_target, decimals),
            "formula": f"{price} ÷ ({quantity} × {_fmt_factor(factor)}) × {_fmt_factor(target_factor)}",
        })
    lowest = min(per_targets)
    highest = max(per_targets)
    best = per_targets.index(lowest)
    spread = ((highest - lowest) / highest * 100) if highest > 0 else 0.0
    return {
        "target_symbol": target,
        "offers": quotes,
        "best_index": best,
        "best_price_per_target": round_value(lowest, decimals),
        "spread_percent": round_value(spread, decimals),
    }


def _fmt_factor(value: float) -> str:
    """Mirror the plugin's roundForFormula: toFixed(6), then String(Number(...))."""
    rounded = float(f"{value:.6f}")
    if rounded == int(rounded):
        return str(int(rounded))
    return repr(rounded)


TEMP_FORMULAS: "Dict[str, str]" = {
    "c->f": "× 9/5 + 32", "c->k": "+ 273.15", "f->c": "(x − 32) × 5/9",
    "f->k": "(x − 32) × 5/9 + 273.15", "k->c": "− 273.15", "k->f": "(x − 273.15) × 9/5 + 32",
}


def js_num(value: float) -> str:
    """Mirror JavaScript String(Number) for the values this table produces."""
    if value == int(value):
        return str(int(value))
    return repr(value)


def unit_entry(symbol: str) -> Tuple[str, str, Dict[str, Tuple[str, float]], str]:
    """(category id, category name, unit map, canonical symbol) for a unit string."""
    canonical = resolve(symbol)
    for cid, (base, kind, units) in CATEGORIES.items():
        if canonical in units:
            return cid, base, units, canonical
    raise KeyError(symbol)


def category_label(cid: str) -> str:
    return {
        "length": "length", "mass": "mass", "temperature": "temperature", "area": "area",
        "volume": "volume (incl. cooking)", "speed": "speed", "time": "time duration",
        "data": "data size", "pressure": "pressure", "energy": "energy", "angle": "angle",
        "frequency": "frequency / rotation", "typography": "typography (CSS / print)",
        "fuel": "fuel economy", "power": "power", "force": "force", "torque": "torque",
        "datarate": "data transfer rate", "acceleration": "acceleration",
        "illumination": "illumination", "flow": "volumetric flow rate", "density": "density",
    }[cid]


def formula(from_symbol: str, to_symbol: str) -> str:
    """Mirror the plugin's formula string for a conversion."""
    _cf, _bf, cf_units, source = unit_entry(from_symbol)
    _ct, _bt, ct_units, target = unit_entry(to_symbol)
    kind = next(entry[1] for entry in CATEGORIES.values() if source in entry[2])
    if kind == "temperature":
        return TEMP_FORMULAS.get(f"{source}->{target}", "× 1")
    if kind == "fuel":
        def to_base_text(symbol: str) -> str:
            return {"l/km": "x × 100", "mpg": f"{_js_round(L100KM_PER_MPG_US)} ÷ x",
                    "mpg(uk)": f"{_js_round(L100KM_PER_MPG_UK)} ÷ x", "km/l": "100 ÷ x"}.get(symbol, "x")

        def from_base_text(symbol: str) -> str:
            return {"l/km": "x ÷ 100", "mpg": f"{_js_round(L100KM_PER_MPG_US)} ÷ x",
                    "mpg(uk)": f"{_js_round(L100KM_PER_MPG_UK)} ÷ x", "km/l": "100 ÷ x"}.get(symbol, "x")

        return f"{to_base_text(source)} → {from_base_text(target)}"
    from_factor = cf_units[source][1]
    to_factor = ct_units[target][1]
    return "× 1" if from_factor == to_factor else f"× {js_num(from_factor / to_factor)}"


def _js_round(value: float) -> str:
    """roundForFormula: toFixed(6) then String(Number)."""
    return js_num(float(f"{value:.6f}"))


def render_convert(value: float, from_symbol: str, to_symbol: str) -> str:
    """Exact one-line text the convert_unit renderer must produce."""
    _cf, _bf, _uf, source = unit_entry(from_symbol)
    _ct, _bt, _ut, target = unit_entry(to_symbol)
    cid = next(cid for cid, entry in CATEGORIES.items() if source in entry[2])
    result = convert(value, from_symbol, to_symbol)
    return (f"{js_num(value)} {source} = {js_num(result)} {target} "
            f"({category_label(cid)}, {formula(from_symbol, to_symbol)})")


def render_price(offers: Sequence[Tuple[float, str, float]], to: Optional[str] = None) -> str:
    """Exact multi-line text the unit_price renderer must produce."""
    outcome = unit_price(offers, to)
    quotes = outcome["offers"]
    assert isinstance(quotes, list)
    lines = [f"unit prices per {outcome['target_symbol']} "
             f"({category_label(category_of(offers[0][1])[0])}):"]
    for quote in quotes:
        symbol = str(quote["per_symbol"])
        quantity = float(quote["quantity"])
        suffix = "" if quantity == 1 else f" ({js_num(quantity)} {symbol}) = {js_num(float(quote['total_target']))} {outcome['target_symbol']}"  # noqa: E501
        lines.append(f"  #{int(quote['index']) + 1} {js_num(float(quote['price']))} per {symbol}{suffix}"
                     f" → {js_num(float(quote['price_per_target']))} per {outcome['target_symbol']}")
    lines.append(f"cheapest: #{int(outcome['best_index']) + 1} at "
                 f"{js_num(float(outcome['best_price_per_target']))} per {outcome['target_symbol']} "
                 f"(spread {js_num(float(outcome['spread_percent']))}%)")
    return "\n".join(lines)


# ------------------------------------------------------------------ --check
def self_check() -> int:
    """Assert the table against definitional / published identities."""
    checks: List[Tuple[str, float, float, float]] = [
        # label, oracle value, published/definitional value, tolerance
        ("1 in = 25.4 mm", exact(1, "in", "mm"), 25.4, 0.0),
        ("1 mi = 1609.344 m", exact(1, "mi", "m"), 1609.344, 0.0),
        ("1 nmi = 1852 m", exact(1, "nmi", "m"), 1852.0, 0.0),
        ("1 acre = 4046.8564224 m²", exact(1, "acre", "m2"), 4046.8564224, 0.0),
        ("1 lb = 0.45359237 kg", exact(1, "lb", "kg"), 0.45359237, 0.0),
        ("1 oz = 28.349523125 g", exact(1, "oz", "g"), 28.349523125, 0.0),
        ("1 gal = 3.785411784 L", exact(1, "gal", "l"), 3.785411784, 0.0),
        ("1 cal = 4.184 J", exact(1, "cal", "j"), 4.184, 0.0),
        ("1 BTU/h = 0.293071070 W", exact(1, "btu/h", "w"), 0.2930711, 1e-7),
        ("1 atm = 101325 Pa", exact(1, "atm", "pa"), 101325.0, 0.0),
        ("1 torr = 101325/760 Pa", exact(1, "torr", "pa"), 133.32236842105263, 1e-6),
        ("1 mmHg = 133.322387415 Pa", exact(1, "mmhg", "pa"), 133.322387415, 1e-6),
        ("1 psi = 6894.757293168 Pa", exact(1, "psi", "pa"), 6894.757293168, 1e-6),
        ("1 eV = 1.602176634e-19 J", exact(1, "ev", "j"), 1.602176634e-19, 0.0),
        ("1 kgf = 9.80665 N", exact(1, "kgf", "n"), 9.80665, 0.0),
        ("1 ft·lbf = 1.355817948 J", exact(1, "lbfft", "n.m"), 1.3558179, 1e-7),
        ("mechanical hp = 550 ft·lbf/s = 745.6998716 W", exact(1, "hp", "w"), 745.699872, 1e-6),
        ("metric hp (PS) = 735.49875 W", exact(1, "hp(m)", "w"), 735.49875, 0.0),
        ("electric hp = 746 W", exact(1, "hp(e)", "w"), 746.0, 0.0),
        ("1 knot = 1852/3600 m/s", exact(1, "knot", "m/s"), 0.5144444444444445, 1e-6),
        ("1 Julian year = 365.25 d", exact(1, "yr", "d"), 365.25, 0.0),
        ("1 week = 604800 s", exact(1, "wk", "s"), 604800.0, 0.0),
        ("1 mpg (US) = 235.2145833 L/100km", exact(1, "mpg", "l/100km"), 235.214583, 1e-6),
        ("1 mpg (UK) = 282.4809363 L/100km", exact(1, "mpg(uk)", "l/100km"), 282.480936, 1e-6),
        ("1 fc = 10.7639104167 lx", exact(1, "fc", "lx"), 10.76391, 1e-5),
        ("1 phot = 10^4 lx", exact(1, "ph", "lx"), 10000.0, 0.0),
        ("1 g/cm³ = 1000 kg/m³", exact(1, "g/cm3", "kg/m3"), 1000.0, 0.0),
        ("1 lb/ft³ = 16.0184633740 kg/m³", exact(1, "lb/ft3", "kg/m3"), 16.018463, 1e-5),
        ("1 lb/gal (US) = 119.8264273169 kg/m³", exact(1, "lb/gal", "kg/m3"), 119.826427, 1e-5),
        ("1 cfm = 0.4719474432 L/s", exact(1, "cfm", "l/s"), 0.4719474432, 1e-9),
        ("1 gpm = 0.0630901964 L/s", exact(1, "gpm", "l/s"), 0.0630901964, 1e-9),
        ("1 m³/h = 1/3.6 L/s", exact(1, "m3/h", "l/s"), 1000.0 / 3600, 0.0),
        ("1000 L/s = 1 m³/s", exact(1000, "l/s", "m3/s"), 1.0, 0.0),
        ("1 MB = 1e6 bytes", exact(1, "mb", "b"), 1000000.0, 0.0),
        ("1 MiB = 1048576 bytes", exact(1, "mib", "b"), 1048576.0, 0.0),
        ("1 KiB/s = 1024 B/s", exact(1, "kib/s", "b/s"), 1024.0, 0.0),
        ("16 px = 12 pt at 96 dpi", exact(16, "px", "pt"), 12.0, 0.0),
        ("100 °C = 212 °F", exact(100, "c", "f"), 212.0, 0.0),
        ("0 K = -273.15 °C", exact(0, "k", "c"), -273.15, 0.0),
        ("60 rpm = 1 Hz", exact(60, "rpm", "hz"), 1.0, 0.0),
        ("180° = π rad", exact(180, "deg", "rad"), math.pi, 1e-6),
        ("1 hp = 1.013869665 metric hp", exact(1, "hp", "hp(m)"), 1.01387, 1e-5),
    ]
    failures = 0
    for label, got, want, tol in checks:
        # Absorb last-ulp differences between derived and literal constants only:
        # 1e-9 relative is far too tight to hide a wrong factor (see lb/gal: 1000×).
        ok = abs(got - want) <= tol + 1e-9 * max(1.0, abs(want))
        if not ok:
            failures += 1
            print(f"FAIL {label}: got {got!r}, want {want!r} (±{tol})")
    # round-trip identities: every unit must survive a round trip to its base unit
    mismatches = 0
    for cid, (_base, kind, units) in CATEGORIES.items():
        if kind != "linear":
            continue
        base = base_symbol(cid)
        for symbol in units:
            for value in (1.0, 7.125, -3.5):
                there = convert(value, symbol, base, 12)
                back = convert(there, base, symbol, 12)
                if abs(back - value) > abs(value) * 1e-9 + 1e-12:
                    mismatches += 1
                    print(f"FAIL round trip {cid}: {value} {symbol} -> {base} -> {back}")
    # the target of a unit-price comparison must be the category base unit
    for cid, (_base, kind, units) in CATEGORIES.items():
        if kind == "linear" and base_symbol(cid) not in units:
            mismatches += 1
            print(f"FAIL base unit of {cid} not in table")
    print(f"oracle self-check: {len(checks)} definitional anchors, "
          f"{sum(1 for e in CATEGORIES.values() if e[1] == 'linear')} linear categories round-tripped, "
          f"{failures + mismatches} failure(s)")
    return 1 if failures + mismatches else 0


# ------------------------------------------------------------------- anchors
# Every numeric expectation in test/units.test.ts and test/tools.test.ts.
CONVERT_ANCHORS: "List[Tuple[float, str, str]]" = [
    # length, mass, pressure, speed, time
    (100, "km", "mi"), (1, "mi", "km"), (12, "in", "cm"), (1, "kg", "lb"),
    (1, "atm", "pa"), (16, "oz", "lb"), (100, "km/h", "mph"), (1.5, "h", "min"),
    (1, "wk", "d"), (1, "yr", "d"), (60, "rpm", "hz"), (180, "deg", "rad"),
    (1, "kwh", "j"), (1, "gal", "l"), (1, "cup", "ml"), (-10, "km", "m"),
    # data size: decimal vs binary (aliases as the tests feed them)
    (1, "MB", "MiB"), (500, "MiB", "MB"), (1, "MB", "b"), (1, "MiB", "b"),
    (8, "bit", "b"), (1, "gb", "mbit"),
    # temperature (affine)
    (100, "c", "f"), (32, "f", "c"), (0, "c", "k"), (-40, "c", "f"),
    (0, "f", "k"), (300, "k", "c"),
    # typography
    (16, "px", "pt"), (72, "pt", "px"), (1, "pc", "pt"), (2, "pt", "px"),
    (2, "em", "px"), (16, "px", "em"), (1.5, "rem", "pt"), (1, "pint", "l"),
    # fuel economy (reciprocal)
    (20, "mpg", "l/100km"), (10, "mpg(uk)", "l/100km"), (1, "mpg", "km/l"),
    (1, "l/100km", "km/l"), (8.5, "km/l", "l/100km"), (1, "km/l", "mpg"),
    (8.5, "km/l", "mpg(uk)"), (20, "usmpg", "litersper100km"), (20, "mpg", "km/l"),
    (20, "UK mpg", "kmpl"),
    # power
    (1, "hp", "w"), (1, "hp(m)", "w"), (1, "hp(e)", "w"), (1, "hp", "hp(m)"),
    (1, "kw", "hp"), (1, "kw", "btu/h"), (550, "ftlb/s", "hp"), (1, "ps", "w"),
    (1, "cv", "hp"),
    # force
    (1, "lbf", "n"), (1, "kgf", "n"), (1, "lbf", "kgf"), (1, "n", "dyn"),
    (1, "kilonewton", "n"),
    # torque
    (1, "lbfft", "n.m"), (1, "kgf.m", "n.m"), (12, "lbfin", "lbfft"),
    (1, "lbfft", "kgf.m"), (1, "ftlb", "n.m"),
    # data transfer rate
    (100, "Mbps", "MB/s"), (100, "mbit/s", "mb/s"), (1, "MiB/s", "Mbit/s"),
    (1, "Gbit/s", "MiB/s"), (500, "MB/s", "Gbit/s"), (1, "Tbit/s", "GB/s"),
    (1, "KiB/s", "kB/s"), (1, "TiB/s", "TB/s"),
    # acceleration
    (1, "g0", "m/s2"), (1, "g0", "ft/s2"), (1, "m/s2", "g0"), (0.5, "g0", "mph/s"),
    (1, "gravity", "m/s²"), (60, "mph/s", "m/s2"), (100, "ft/s2", "m/s2"),
    (9.8, "m/s2", "g-force"),
    # illumination
    (1, "fc", "lx"), (100, "lx", "fc"), (1, "ph", "lx"), (1, "klx", "fc"),
    (20, "footcandles", "lux"), (500, "lux", "kilolux"),
    # aliases / normalization the tests exercise
    (1, "miles", "kilometers"), (100, "°C", "F"), (1, "  KILOMETER ", "m"),
    (1, "sqft", "m2"), (1, "litres", "gallons"), (1, "µm", "nm"),
    (1, "m²", "ft2"), (1, "m^3", "l"),
    # rounding
    (1, "nm", "km"), (1, "ev", "j"), (1, "km", "mi"),
    # v0.5.0 flow rate
    (1, "m3/s", "l/s"), (1, "m3/h", "l/s"), (1, "l/s", "m3/h"), (6, "l/min", "l/s"),
    (1, "cfm", "l/s"), (1, "gpm", "l/s"), (100, "cfm", "m3/h"), (60, "l/min", "l/h"),
    (1, "l/min", "gpm"), (1, "m3/s", "cfm"), (2.5, "gpm", "l/min"),
    # v0.5.0 density
    (1, "g/cm3", "kg/m3"), (1, "kg/m3", "g/l"), (1, "g/ml", "kg/l"),
    (1, "lb/ft3", "kg/m3"), (1, "lb/gal", "kg/m3"), (1000, "kg/m3", "t/m3"),
    (1, "kg/l", "lb/gal"), (8.345, "lb/gal", "g/ml"), (1, "g/cm3", "lb/ft3"),
]

PRICE_ANCHORS: "List[Tuple[List[Tuple[float, str, float]], Optional[str]]]" = [
    ([(3.99, "lb", 1), (8.5, "kg", 1)], "kg"),
    ([(3.99, "lb", 1), (8.5, "kg", 1)], None),
    ([(4.29, "g", 500), (3.59, "lb", 1)], "kg"),
    ([(2.5, "l", 1), (9.9, "gal", 1)], "l"),
    ([(1.2, "kwh", 1), (0.4, "kj", 1)], "kwh"),
    ([(12.0, "m2", 1), (0.9, "ft2", 1)], None),
    ([(9.99, "gb", 1), (0.05, "mb", 1)], "gb"),
    ([(0.0, "kg", 1), (1.0, "kg", 1)], None),
    ([(3.49, "cup", 2), (2.79, "l", 1)], "l"),
]

# Renderer anchors are *generated* (formula strings included) so the expected
# text comes from the oracle too, not from a hand copy of the plugin's output.
RENDER_CONVERT: "List[Tuple[float, str, str]]" = [
    (100, "c", "f"), (100, "km", "mi"), (500, "MiB", "MB"), (100, "Mbps", "MB/s"),
    (350, "fahrenheit", "celsius"), (16, "px", "pt"), (20, "mpg", "l/100km"),
    (150, "kw", "hp"), (1, "lbfft", "n.m"), (9.8, "m/s2", "g0"), (1, "fc", "lx"),
    (1, "gpm", "l/s"), (100, "cfm", "m3/h"), (1, "lb/ft3", "kg/m3"), (2, "cup", "l"),
]

RENDER_PRICE: "List[Tuple[List[Tuple[float, str, float]], Optional[str]]]" = [
    ([(3.99, "lb", 1), (8.5, "kg", 1)], "kg"),
    ([(4.29, "g", 500), (3.59, "lb", 1)], "kg"),
]


def print_anchors() -> None:
    linear = sum(1 for entry in CATEGORIES.values() if entry[1] == "linear")
    print(f"# dsh-units oracle anchors")
    print(f"CATEGORY_COUNT = {len(CATEGORIES)}")
    print(f"LINEAR_CATEGORY_COUNT = {linear}")
    print(f"MAX_PRICE_OFFERS = {MAX_PRICE_OFFERS}")
    print(f"MAX_DECIMALS = 6")
    print(f"EM_BASE_PX = 16")
    print(f"CSS_DPI = 96")
    for cid, (_base, _kind, units) in CATEGORIES.items():
        print(f"UNITS[{cid}] = {len(units)} units")
    print()
    print("# convert_unit anchors (value, from, to) -> expected result")
    for value, from_symbol, to_symbol in CONVERT_ANCHORS:
        result = convert(value, from_symbol, to_symbol)
        print(f"convert({value}, '{from_symbol}', '{to_symbol}') = {result}")
    print()
    print("# unit_price anchors")
    for offers, to in PRICE_ANCHORS:
        outcome = unit_price(offers, to)
        quotes = outcome["offers"]
        assert isinstance(quotes, list)
        rendered = "; ".join(
            f"#{int(quote['index']) + 1} {quote['price']}/{quote['per_symbol']}" for quote in quotes
        )
        print(f"unit_price({offers}, to={to!r}) -> target {outcome['target_symbol']}, "
              f"best #{int(outcome['best_index']) + 1}, best_per_target {outcome['best_price_per_target']}, "
              f"spread {outcome['spread_percent']}% | {rendered}")
        for quote in quotes:
            print(f"    #{int(quote['index']) + 1} total_target {quote['total_target']} "
                  f"price_per_target {quote['price_per_target']} formula {quote['formula']}")
    print()
    print("# renderer anchors (exact text, numbers must match above)")
    for value, from_symbol, to_symbol in RENDER_CONVERT:
        print(f"render_convert({value}, '{from_symbol}', '{to_symbol}') = {render_convert(value, from_symbol, to_symbol)}")
    for offers, to in RENDER_PRICE:
        print(f"render_price({offers}, to={to!r}) =")
        for line in render_price(offers, to).split("\n"):
            print(f"  | {line}")


def main(argv: Sequence[str]) -> int:
    if "--check" in argv:
        return self_check()
    print_anchors()
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
