from __future__ import annotations

from typing import Any, Dict, List
import math
import numpy as np

from ..matching import f_m2_operating_from_pi_c

from ..thermo import enthalpy_ideal, entropy_ideal, velocity_from_mach


def _station_x(label: str) -> float:
    if label == "e":
        return 9.0
    return float(label)


def _series_from_raw(rows: List[Dict[str, Any]], key: str) -> List[Any]:
    values = []
    for row in rows:
        value = row.get(key)
        if isinstance(value, float) and not math.isfinite(value):
            value = None
        values.append(value)
    return values


def diagnostics_from_mk1(station_rows: List[Dict[str, Any]], inputs: Dict[str, Any]):
    station_labels = [str(row.get("station")) for row in station_rows]
    x_vals = list(range(len(station_rows)))
    pt_vals = _series_from_raw(station_rows, "Pt")
    tt_vals = _series_from_raw(station_rows, "Tt")
    t_vals = _series_from_raw(station_rows, "T")
    p_vals = _series_from_raw(station_rows, "P")
    m_vals = _series_from_raw(station_rows, "M")

    pt0 = pt_vals[0] if pt_vals else None
    tt0 = tt_vals[0] if tt_vals else None
    t0 = t_vals[0] if t_vals else None
    p0 = p_vals[0] if p_vals else None

    def safe_ratio(num, denom):
        if num is None or denom in (None, 0):
            return None
        try:
            return float(num) / float(denom)
        except Exception:
            return None

    pt_ratio = [safe_ratio(val, pt0) for val in pt_vals]
    tt_ratio = [safe_ratio(val, tt0) for val in tt_vals]

    gamma = inputs["gamma"]
    r_value = inputs["R"]
    cp_value = inputs["cp"]

    v_vals = [
        velocity_from_mach(mach, gamma, r_value, temp)
        for mach, temp in zip(m_vals, t_vals)
    ]
    s_vals = [
        entropy_ideal(cp_value, r_value, temp, pres, t0, p0)
        for temp, pres in zip(t_vals, p_vals)
    ]
    h_vals = [enthalpy_ideal(cp_value, temp) for temp in t_vals]
    s_vals_kj = [val / 1000.0 if val is not None else None for val in s_vals]
    h_vals_mj = [val / 1_000_000.0 if val is not None else None for val in h_vals]

    return {
        "series": {
            "x": x_vals,
            "station_labels": station_labels,
            "mach": m_vals,
            "pt_ratio": pt_ratio,
            "tt_ratio": tt_ratio,
            "velocity": v_vals,
            "ts": {"s": s_vals_kj, "t": t_vals},
            "hs": {"s": s_vals_kj, "h": h_vals_mj},
        },
        "labels": {
            "x": r"$\mathrm{Station}$",
            "mach": r"$\mathrm{Mach\ Number}\ M$",
            "pt_ratio": r"$\mathrm{Total\ Pressure\ Ratio}\ P_t/P_{t0}$",
            "tt_ratio": r"$\mathrm{Total\ Temperature\ Ratio}\ T_t/T_{t0}$",
            "velocity": r"$\mathrm{Velocity}\ U$",
            "ts": {
                "x": r"$\mathrm{Entropy}\ s\ (\mathrm{kJ/(kg\cdot K)})$",
                "y": r"$\mathrm{Temperature}\ T\ (\mathrm{K})$",
            },
            "hs": {
                "x": r"$\mathrm{Entropy}\ s\ (\mathrm{kJ/(kg\cdot K)})$",
                "y": r"$\mathrm{Enthalpy}\ h\ (\mathrm{MJ/kg})$",
            },
        },
            "title": "",
    }


def _f_me(me: float, gamma: float) -> float:
    g = float(gamma)
    return ((g + 1.0) / 2.0) ** ((g + 1.0) / (2.0 * (g - 1.0))) * me / (1.0 + (g - 1.0) * 0.5 * me * me) ** (
        (g + 1.0) / (2.0 * (g - 1.0))
    )


def _tbar_of_me(me, gamma, m0, tte_over_t0, pte_over_p0, a8_over_a0):
    term_temp = 1.0 / (1.0 + (gamma - 1.0) * 0.5 * me * me)
    term_pres = term_temp ** (gamma / (gamma - 1.0))
    return (
        gamma * m0 * m0 * ((me / m0) * np.sqrt(tte_over_t0 * term_temp) - 1.0)
        + (pte_over_p0 * term_pres - 1.0) * a8_over_a0 * (1.0 / _f_me(me, gamma))
    )


def _pe_over_p0_of_me(me, gamma, pte_over_p0):
    term_temp = 1.0 / (1.0 + (gamma - 1.0) * 0.5 * me * me)
    return pte_over_p0 * term_temp ** (gamma / (gamma - 1.0))


def operating_line_from_mk1(station_rows: List[Dict[str, Any]], inputs: Dict[str, Any]):
    a4s = next(
        (row.get("A*") for row in station_rows if str(row.get("station")) == "4" and row.get("A*") is not None),
        None
    )
    if a4s is None:
        a4s = next((row.get("A") for row in station_rows if str(row.get("station")) == "4"), None)
    a2 = inputs.get("A2")
    a8 = inputs.get("A8")
    gamma = inputs.get("gamma")

    if not a4s or not a2 or not a8:
        return {
            "error": "Missing A4*, A2, or A8 for operating line.",
        }

    a4s_over_a2 = float(a4s) / float(a2)
    a4s_over_a8 = float(a4s) / float(a8)

    pi_c_min = 1.01
    pi_c_max = 60.0
    npts = 220
    pi_c = np.linspace(pi_c_min, pi_c_max, int(npts))
    f_m2 = f_m2_operating_from_pi_c(pi_c, a4s_over_a2, a4s_over_a8, gamma)

    mask = np.isfinite(f_m2) & (f_m2 <= 1.0)
    pi_c_v = pi_c[mask]
    f_m2_v = f_m2[mask]

    if f_m2_v.size == 0:
        return {"error": "No real-valued f(M2) <= 1 for this geometry."}

    pick = next((row.get("f(M)") for row in station_rows if str(row.get("station")) == "2"), None)
    pick_val = float(pick) if pick is not None and math.isfinite(float(pick)) else None

    return {
        "series": {
            "f_m2": f_m2_v.tolist(),
            "pi_c": pi_c_v.tolist(),
            "pick": pick_val,
            "min_point": {
                "f_m2": float(f_m2_v.min()) if f_m2_v.size else None,
                "pi_c": float(pi_c_v[f_m2_v.argmin()]) if f_m2_v.size else None,
            },
        },
        "labels": {
            "x": r"$\mathrm{Mass\ Flow\ Function}\ f(M_2)$",
            "y": r"$\mathrm{Compressor\ Pressure\ Ratio}\ \pi_c$",
            "title": r"$\mathrm{Compressor\ Operating\ Line}$",
        },
    }


def tbar_vs_me_from_mk1(station_rows: List[Dict[str, Any]], inputs: Dict[str, Any]):
    gamma = inputs.get("gamma")
    m0 = inputs.get("M0")
    a0 = next((row.get("A") for row in station_rows if str(row.get("station")) == "0"), None)
    a8 = inputs.get("A8")

    t0 = next((row.get("T") for row in station_rows if str(row.get("station")) == "0"), None)
    tt_e = next((row.get("Tt") for row in station_rows if str(row.get("station")) == "e"), None)
    p0 = next((row.get("P") for row in station_rows if str(row.get("station")) == "0"), None)
    pt_e = next((row.get("Pt") for row in station_rows if str(row.get("station")) == "e"), None)

    if not a0 or not a8 or not t0 or not tt_e or not p0 or not pt_e:
        return {"error": "Missing MK1 station data for tbar vs Me."}

    tte_over_t0 = float(tt_e) / float(t0)
    pte_over_p0 = float(pt_e) / float(p0)
    a8_over_a0 = float(a8) / float(a0)

    me = np.linspace(1.0, 12.0, 240)
    tbar = _tbar_of_me(me, gamma, m0, tte_over_t0, pte_over_p0, a8_over_a0)

    mask = (me > 0.0) & (tbar > 0.0) & np.isfinite(tbar)
    me_v = me[mask]
    tbar_v = tbar[mask]

    me_pick = next((row.get("M") for row in station_rows if str(row.get("station")) == "e"), None)
    if me_pick is None or not math.isfinite(float(me_pick)):
        me_pick = float(me_v[len(me_v) // 2]) if me_v.size else None

    tbar_pick = float(_tbar_of_me(np.array([me_pick]), gamma, m0, tte_over_t0, pte_over_p0, a8_over_a0)[0]) if me_pick else None
    pe_over_p0_pick = float(_pe_over_p0_of_me(np.array([me_pick]), gamma, pte_over_p0)[0]) if me_pick else None
    ae_over_a8_pick = float(1.0 / _f_me(float(me_pick), gamma)) if me_pick else None

    if tbar_pick is not None and not math.isfinite(tbar_pick):
        tbar_pick = None
    if pe_over_p0_pick is not None and not math.isfinite(pe_over_p0_pick):
        pe_over_p0_pick = None
    if ae_over_a8_pick is not None and not math.isfinite(ae_over_a8_pick):
        ae_over_a8_pick = None

    return {
        "series": {
            "me": me_v.tolist(),
            "tbar": tbar_v.tolist(),
            "pick": {
                "me": me_pick,
                "tbar": tbar_pick,
                "pe_over_p0": pe_over_p0_pick,
                "ae_over_a8": ae_over_a8_pick,
            },
            "params": {
                "tte_over_t0": tte_over_t0,
                "pte_over_p0": pte_over_p0,
                "a8_over_a0": a8_over_a0,
            },
        },
        "labels": {
            "x": r"$\mathrm{Exit\ Mach}\ M_e$",
            "y": r"$\mathrm{Thrust\ Coefficient}\ \mathbb{T}/(P_0A_0)$",
            "title": r"$\mathbb{T}/(P_0A_0)(M_e)$",
        },
    }
