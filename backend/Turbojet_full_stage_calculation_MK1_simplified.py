import math
import uuid

import numpy as np
import pandas as pd

try:
    import ipywidgets as widgets
    from IPython.display import HTML, display

    HAS_WIDGETS = True
except Exception:
    widgets = None
    display = None
    HTML = None
    HAS_WIDGETS = False


def _in_notebook():
    try:
        from IPython import get_ipython

        ip = get_ipython()
        return ip is not None and "IPKernelApp" in ip.config
    except Exception:
        return False


def _latexize_headers(df):
    header_map = {
        "A": r"\(A\)",
        "A*": r"\(A^*\)",
        "A/A*": r"\(A/A^*\)",
        "P": r"\(P\)",
        "Pt": r"\(P_t\)",
        "Pt/Pt0": r"\(P_t/P_{t0}\)",
        "P/Pt": r"\(P/P_t\)",
        "T": r"\(T\)",
        "Tt": r"\(T_t\)",
        "Tt/Tt0": r"\(T_t/T_{t0}\)",
        "T/Tt": r"\(T/T_t\)",
        "M": r"\(M\)",
        "U": r"\(U\)",
        "f(M)": r"\(f(M)\)",
        "mdot": r"\(\dot m\)",
        "tau": r"\(\tau\)",
        "pi": r"\(\pi\)",
        "ratio": r"\(\mathrm{ratio}\)",
    }
    rename_map = {key: value for key, value in header_map.items() if key in df.columns}
    if not rename_map:
        return df
    return df.rename(columns=rename_map)


def _render_table(df):
    if _in_notebook() and display is not None and HTML is not None:
        table_id = f"tbl_{uuid.uuid4().hex}"
        table_html = _latexize_headers(df).to_html(index=False, escape=False)
        spaced_html = (
            "<style>"
            "table{border-collapse:separate;border-spacing:18px 6px;width:100%;}"
            "th,td{text-align:center;}"
            "</style>"
            f"<div id=\"{table_id}\" style=\"max-width:80vw;overflow-x:auto;margin:0 auto;\">"
            + table_html
            + "</div>"
            "<script>(function(){"
            f"var el=document.getElementById('{table_id}');"
            "if(!el){return;}"
            "function typeset(){"
            "if(window.MathJax){"
            "if(MathJax.typesetPromise){MathJax.typesetPromise([el]);}"
            "else if(MathJax.Hub&&MathJax.Hub.Queue){MathJax.Hub.Queue(['Typeset',MathJax.Hub,el]);}"
            "}"
            "}"
            "if(!window.MathJax){"
            "var s=document.createElement('script');"
            "s.src='https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js';"
            "s.async=true;"
            "s.onload=typeset;"
            "document.head.appendChild(s);"
            "}else{typeset();}"
            "})();</script>"
        )
        display(HTML(spaced_html))
    else:
        print(df.to_string(index=False))


def _is_invalid_number(value):
    try:
        return isinstance(value, (int, float)) and not math.isfinite(float(value))
    except Exception:
        return False


def _fmt(value):
    if value is None or _is_invalid_number(value):
        return "x"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return f"{value:.4g}"
    return str(value)


def _fmt_pressure(value):
    if value is None or _is_invalid_number(value):
        return "x"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return f"{value:.0f}"
    return str(value)


def _to_kpa(value):
    if _is_invalid_number(value):
        return None
    if isinstance(value, (int, float)):
        return value / 1000.0
    return value


def tau_from_m(mach, gamma):
    return 1.0 + 0.5 * (gamma - 1.0) * mach * mach


def pi_from_tau(tau, gamma):
    return tau ** (gamma / (gamma - 1.0))


def f_mass(mach, gamma):
    g = float(gamma)
    m = float(mach)
    k = (g + 1.0) / 2.0
    exp = (g + 1.0) / (2.0 * (g - 1.0))
    return (k**exp) * m / (1.0 + 0.5 * (g - 1.0) * m * m) ** exp


def area_ratio_from_m(mach, gamma):
    return 1.0 / max(f_mass(mach, gamma), 1e-12)


def mach_from_f(target_f, gamma, supersonic=False, tol=1e-8, iters=120):
    if target_f <= 0:
        return 0.0
    if abs(target_f - 1.0) < 1e-12:
        return 1.0

    if supersonic:
        lo, hi = 1.0 + 1e-9, 30.0
    else:
        lo, hi = 1e-9, 1.0 - 1e-9

    def gfun(mach):
        return f_mass(mach, gamma) - target_f

    fhi = gfun(hi)
    if supersonic and fhi < 0:
        for _ in range(40):
            hi *= 1.5
            fhi = gfun(hi)
            if fhi >= 0:
                break

    for _ in range(iters):
        mid = 0.5 * (lo + hi)
        fmid = gfun(mid)
        if abs(fmid) < tol:
            return mid
        if supersonic:
            if fmid > 0:
                lo = mid
            else:
                hi = mid
        else:
            if fmid > 0:
                hi = mid
            else:
                lo = mid
    return 0.5 * (lo + hi)


def mdot_from_values(area, pt_value, tt_value, f_value, gamma, r_value):
    if area is None or pt_value is None or tt_value is None or f_value is None:
        return None
    if area <= 0.0 or tt_value <= 0.0:
        return None
    if gamma is None or r_value is None or r_value <= 0.0:
        return None
    return pt_value * area * math.sqrt(gamma / r_value) * f_value / math.sqrt(tt_value)


def m_from_a_over_astar(a_over_astar, gamma, supersonic=False):
    if a_over_astar is None or a_over_astar <= 0.0:
        return None
    f_target = 1.0 / a_over_astar
    if f_target <= 0.0 or f_target > 1.0:
        return None
    return mach_from_f(f_target, gamma, supersonic=supersonic)


def m2_from_m1_normal_shock(m1, gamma):
    if m1 is None or m1 <= 1.0:
        return None
    g = float(gamma)
    denom = g * m1 * m1 - 0.5 * (g - 1.0)
    if denom <= 0.0:
        return None
    m2_sq = (1.0 + 0.5 * (g - 1.0) * m1 * m1) / denom
    return math.sqrt(max(m2_sq, 0.0))


def pi_c_from_f_m2(f_m2_target, a4s_over_a2, a4s_over_a8, gamma, pi_c_min=1.01, pi_c_max=60.0, npts=5000):
    expo = 2.0 * (gamma - 1.0) / (gamma + 1.0)
    geom_term = 1.0 - a4s_over_a8**expo
    if geom_term <= 0.0:
        return np.nan
    pi_c_grid = np.linspace(pi_c_min, pi_c_max, int(npts))
    pi_term = pi_c_grid ** ((gamma - 1.0) / gamma) - 1.0
    f_grid = np.full_like(pi_c_grid, np.nan, dtype=float)
    mask = pi_term > 0.0
    f_grid[mask] = (
        a4s_over_a2 * np.sqrt(geom_term) * pi_c_grid[mask] / np.sqrt(pi_term[mask])
    )
    mask = np.isfinite(f_grid) & (f_grid <= 1.0)
    if not np.any(mask):
        return np.nan
    idx = int(np.argmin(np.abs(f_grid[mask] - f_m2_target)))
    return float(pi_c_grid[mask][idx])


def solve_a0_pid_from_fm2(
    f_m2_value,
    inputs,
    f_m0,
    tau_r,
    f_fuel,
    a4s,
):
    results = {}
    a0 = inputs["A1"]
    a2 = inputs["A2"]
    gamma = inputs["gamma"]
    pi_b = inputs["pi_b"]
    pi_d_known = inputs.get("pi_d", None)

    if f_m2_value > 1.0:
        if pi_d_known is not None:
            f_m2_from_a0 = (a0 / a2) * f_m0 / max(pi_d_known, 1e-12)
            results["case"] = "pi_d_known"
            results["A0_assumed"] = a0
            results["pi_d_used"] = pi_d_known
            results["f_M2_from_A0"] = f_m2_from_a0
            results["M2_from_A0"] = mach_from_f(f_m2_from_a0, gamma, supersonic=False)
        else:
            results["case"] = "pi_d_unknown"
            results["error"] = "f(M2) > 1.0: subsonic inlet choke."

        f_m2_a0 = (a0 / a2) * f_m0 / max(inputs.get("pi_d", 1.0), 1e-12)
        results["f_M2_error_reported"] = f_m2_value
        results["f_M2_A0_method"] = f_m2_a0
        results["f_M2_error_delta"] = f_m2_value - f_m2_a0
        results["Tt4_from_error_case"] = inputs["Tt4"]

        f_m2_new = f_m2_a0
        a4s_over_a2 = a4s / a2
        a4s_over_a8 = a4s / inputs["A8"]
        pi_c_new = pi_c_from_f_m2(f_m2_new, a4s_over_a2, a4s_over_a8, gamma)
        results["f_M2_new"] = f_m2_new
        results["pi_c_new"] = pi_c_new
        if not np.isfinite(pi_c_new):
            results["tau_lambda_new"] = np.nan
            results["Tt4_new"] = np.nan
            return results

        c_val = (pi_c_new * pi_b * (a4s / a2)) / max(1.0 + f_fuel, 1e-12)
        tau_lambda_target = tau_r * (c_val / max(f_m2_new, 1e-12)) ** 2
        tt4_target = tau_lambda_target * inputs["T0"]
        tt4_new = min(inputs["Tt4"], tt4_target)
        tau_lambda_new = tt4_new / max(inputs["T0"], 1e-12)
        results["tau_lambda_new"] = tau_lambda_new
        results["Tt4_new"] = tt4_new
    else:
        pi_d_use = 1.0 if pi_d_known is None else pi_d_known
        a0_from_fm2 = a2 * f_m2_value * pi_d_use / max(f_m0, 1e-12)
        results["case"] = "subsonic_compressor_face_match_from_f_M2"
        results["pi_d_used"] = pi_d_use
        results["A0_from_fM2"] = a0_from_fm2
        results["f_M2_used"] = f_m2_value
        results["M2_used"] = mach_from_f(f_m2_value, gamma, supersonic=False)

    return results


def compute_state(inputs):
    state = {}
    warnings_list = []
    continuity_failed = False

    m0 = inputs["M0"]
    t0 = inputs["T0"]
    p0 = inputs["P0"]
    gamma = inputs["gamma"]
    r_value = inputs["R"]
    pi_d = inputs.get("pi_d", 1.0)
    pi_b = inputs["pi_b"]
    pi_n = inputs["pi_n"]
    tt4 = inputs["Tt4"]
    f_fuel = inputs.get("f_fuel", 0.0)

    tau_r = tau_from_m(m0, gamma)
    pi_r = pi_from_tau(tau_r, gamma)
    tt0 = t0 * tau_r
    pt0 = p0 * pi_r
    f_m0 = f_mass(m0, gamma)
    tau_lambda = tt4 / t0

    state.update(
        {
            "tau_r": tau_r,
            "pi_r": pi_r,
            "Tt0": tt0,
            "Pt0": pt0,
            "f_M0": f_m0,
            "tau_lambda": tau_lambda,
        }
    )

    m4 = None
    tau_m4 = None
    t4 = None

    a4s = 1.0
    a4_val = inputs.get("A4")
    if a4_val is None or not math.isfinite(float(a4_val)):
        a4_val = a4s
    a4s_over_a8 = a4s / inputs["A8"]
    expo = 2.0 * (gamma - 1.0) / (gamma + 1.0)
    tau_t = a4s_over_a8**expo
    pi_t = tau_t ** (gamma / (gamma - 1.0))

    state.update({"A4s": a4s, "tau_t": tau_t, "pi_t": pi_t})

    tau_c = 1.0 + ((1.0 + f_fuel) * tau_lambda / tau_r) * (1.0 - tau_t)
    pi_c = tau_c ** (gamma / (gamma - 1.0))
    tau_d = 1.0
    tau_b = tau_lambda / max(tau_r * tau_d * tau_c, 1e-12)
    tt5 = t0 * tau_r * tau_d * tau_c * tau_b * tau_t

    state.update(
        {
            "tau_c": tau_c,
            "pi_c": pi_c,
            "tau_d": tau_d,
            "tau_b": tau_b,
            "Tt5": tt5,
        }
    )

    a4s_over_a2 = a4s / inputs["A2"]
    tau_lambda_over_tau_r = tau_lambda / tau_r
    f_m2 = (
        pi_c
        * pi_b
        / math.sqrt(tau_lambda_over_tau_r)
        * a4s_over_a2
        / (1.0 + f_fuel)
    )
    m2_from_core = (
        mach_from_f(f_m2, gamma, supersonic=False)
        if 0.0 < f_m2 <= 1.0
        else None
    )

    state.update({"f_M2": f_m2, "M2_from_core": m2_from_core})
    if f_m2 > 1.0:
        warnings_list.append(
            "Station 2: f(M2) > 1.0. Subsonic inlet choke or geometry/matching mismatch. "
            f"Reduce throttle (lower Tt4) from {tt4:.3g} K until f(M2) <= 1.0."
        )

    results = solve_a0_pid_from_fm2(f_m2, inputs, f_m0, tau_r, f_fuel, a4s)

    a0 = (
        results.get("A0_assumed")
        or results.get("A0_from_fM2")
        or inputs.get("A1")
    )

    pt1 = pt0
    pt15 = pt0
    pt2_isentropic = pt0
    tt1 = tt0
    tt15 = tt0
    tt2 = tt0
    critical_pt_over_p = pi_from_tau(tau_from_m(1.0, gamma), gamma)

    mdot0 = mdot_from_values(a0, pt0, tt0, f_m0, gamma, r_value)

    a0_over_astar = 1.0 / max(f_m0, 1e-12)
    astar_inlet = a0 / max(a0_over_astar, 1e-12)

    a8_over_astar_noz = None
    if inputs.get("A8") is not None and astar_inlet is not None:
        a8_over_astar_noz = inputs["A8"] / astar_inlet

    a15_input = inputs.get("A1.5")
    a15_over_astar = None
    if a15_input is not None and astar_inlet is not None and a15_input > 0.0:
        a15_over_astar = a15_input / astar_inlet

    case_label = None
    tol = 1e-6
    if a8_over_astar_noz is not None:
        if a8_over_astar_noz < 1.0 - tol:
            case_label = "a"
        elif abs(a8_over_astar_noz - 1.0) <= tol:
            case_label = "b"
        elif a15_over_astar is not None and a8_over_astar_noz < a15_over_astar - tol:
            case_label = "c"
        elif (
            a15_over_astar is not None
            and abs(a8_over_astar_noz - a15_over_astar) <= tol
        ):
            case_label = "d"
        elif a15_over_astar is not None and a8_over_astar_noz > a15_over_astar + tol:
            case_label = "e"
        else:
            case_label = "a"

    if m0 < 1.0 and case_label == "e":
        case_label = "d"

    def solve_subsonic_machs():
        m1_val = None
        m15_val = None
        m2_val = None
        f_m1_val = None
        f_m15_val = None
        f_target_15_val = None
        f_target_inlet_val = None
        a1_val = inputs.get("A1")
        if a1_val is not None and astar_inlet is not None:
            m1_supersonic = m0 > 1.0
            m1_val = m_from_a_over_astar(
                a1_val / astar_inlet, gamma, supersonic=m1_supersonic
            )
            f_m1_val = f_mass(m1_val, gamma) if m1_val is not None else None
        if a15_over_astar is not None:
            f_target_15_val = 1.0 / a15_over_astar
            m15_val = m_from_a_over_astar(a15_over_astar, gamma, supersonic=False)
            f_m15_val = f_mass(m15_val, gamma) if m15_val is not None else None
        a2_val = inputs.get("A2")
        if a2_val is not None and astar_inlet is not None:
            f_target_inlet_val = astar_inlet / a2_val
            m2_val = m_from_a_over_astar(a2_val / astar_inlet, gamma, supersonic=False)
        return (
            m1_val,
            m15_val,
            m2_val,
            f_m1_val,
            f_m15_val,
            f_target_15_val,
            f_target_inlet_val,
        )

    m1 = None
    m15 = None
    m2 = None
    f_m1 = None
    f_m15 = None
    f_target_15 = None
    f_target_inlet = None
    inlet_choked_subsonic = False
    shock_downstream_subsonic = False
    m15_up = None
    m15_down = None

    if case_label in ("a", "b", "c"):
        (
            m1,
            m15,
            m2,
            f_m1,
            f_m15,
            f_target_15,
            f_target_inlet,
        ) = solve_subsonic_machs()
    elif case_label == "d":
        (
            m1,
            m15,
            m2,
            f_m1,
            f_m15,
            f_target_15,
            f_target_inlet,
        ) = solve_subsonic_machs()
        m15 = 1.0
        f_m15 = 1.0
        inlet_choked_subsonic = True
    elif case_label == "e":
        (
            m1,
            m15,
            m2,
            f_m1,
            f_m15,
            f_target_15,
            f_target_inlet,
        ) = solve_subsonic_machs()
        inlet_choked_subsonic = True
        shock_downstream_subsonic = True
        if a15_over_astar is not None:
            m15_up = m_from_a_over_astar(a15_over_astar, gamma, supersonic=True)
            m15_down = m2_from_m1_normal_shock(m15_up, gamma)
            m15 = m15_down
            f_m15 = f_mass(m15, gamma) if m15 is not None else None

    m2_from_core = (
        mach_from_f(f_m2, gamma, supersonic=False) if 0.0 < f_m2 <= 1.0 else None
    )

    def static_from_m(mach, tt_value, pt_value):
        if mach is None or tt_value is None or pt_value is None:
            return None, None
        tau = tau_from_m(mach, gamma)
        pi = pi_from_tau(tau, gamma)
        return tt_value / tau, pt_value / pi

    def velocity_from_m(mach, temp):
        if mach is None or temp is None:
            return None
        try:
            return float(mach) * math.sqrt(gamma * r_value * float(temp))
        except Exception:
            return None

    t1, p1 = static_from_m(m1, tt0, pt0)
    t15, p15 = static_from_m(m15, tt0, pt0)
    t2, p2 = static_from_m(m2, tt0, pt0)

    f_m2_inlet = f_mass(m2, gamma) if m2 is not None else None
    mdot1 = mdot_from_values(inputs.get("A1"), pt1, tt1, f_m1, gamma, r_value)
    mdot15 = mdot_from_values(a15_input, pt15, tt15, f_m15, gamma, r_value)
    mdot2 = mdot_from_values(inputs.get("A2"), pt2_isentropic, tt2, f_m2_inlet, gamma, r_value)

    if m0 < 1.0:
        p1 = p0
        if p15 is not None:
            p15 = max(p15, p1 * 1.000001)

    state.update(
        {
            "A0": a0,
            "A0_over_Astar": a0_over_astar,
            "Astar_inlet": astar_inlet,
            "A8_over_Astar_noz": a8_over_astar_noz,
            "A15_over_Astar": a15_over_astar,
            "case": case_label,
            "M1": m1,
            "M15": m15,
            "M2": m2,
            "M2_from_core": m2_from_core,
            "M15_up": m15_up,
            "M15_down": m15_down,
            "T1": t1,
            "T15": t15,
            "T2": t2,
            "P1": p1,
            "P15": p15,
            "P2": p2,
            "Tt1": tt1,
            "Tt15": tt15,
            "Tt2": tt2,
            "Pt1": pt1,
            "Pt15": pt15,
            "Pt2_isentropic": pt2_isentropic,
            "f_M1": f_m1,
            "f_M15": f_m15,
            "f_M2_inlet": f_m2_inlet,
            "f_target_inlet": f_target_inlet,
            "f_target_15": f_target_15,
            "mdot0": mdot0,
            "mdot1": mdot1,
            "mdot15": mdot15,
            "mdot2": mdot2,
            "inlet_choked_subsonic": inlet_choked_subsonic,
            "shock_downstream_subsonic": shock_downstream_subsonic,
        }
    )

    mdot_core = mdot2 * (1.0 + f_fuel) if mdot2 is not None else None
    state["mdot_core"] = mdot_core

    tau_lambda_eff = results.get("tau_lambda_new", tau_lambda)
    tt4_eff = results.get("Tt4_new", tt4)
    if tau_m4 is not None and tt4_eff is not None:
        t4 = tt4_eff / max(tau_m4, 1e-12)
    tau_c_eff = 1.0 + ((1.0 + f_fuel) * tau_lambda_eff / tau_r) * (1.0 - tau_t)
    pi_c_eff = results.get("pi_c_new")
    if pi_c_eff is None or not math.isfinite(float(pi_c_eff)):
        pi_c_eff = tau_c_eff ** (gamma / (gamma - 1.0))
    tau_b_eff = tau_lambda_eff / max(tau_r * tau_d * tau_c_eff, 1e-12)
    tt3 = tt4_eff / max(tau_b_eff, 1e-12)

    pi_d_used = results.get("pi_d_used", pi_d)
    pt4_eff = pt0 * pi_d_used * pi_c_eff * pi_b
    pt3 = pt4_eff / max(pi_b, 1e-12)

    p4 = None

    tt5_eff = tt4_eff * tau_t
    pt5_eff = pt4_eff * pi_t

    a5_val = inputs.get("A5")
    m5_val = inputs.get("M5")
    f_m5_val = None
    f_m5_from_mdot = None
    if (
        mdot_core is not None
        and a5_val is not None
        and pt5_eff is not None
        and tt5_eff is not None
        and gamma is not None
        and r_value is not None
        and a5_val > 0.0
        and tt5_eff > 0.0
        and pt5_eff > 0.0
        and gamma > 1.0
        and r_value > 0.0
    ):
        f_m5_from_mdot = (
            mdot_core
            * math.sqrt(tt5_eff)
            / (pt5_eff * a5_val * math.sqrt(gamma / r_value))
        )
        if f_m5_from_mdot > 1.0:
            continuity_failed = True
            a5_min_for_f1 = a5_val * f_m5_from_mdot
            mdot5_max_for_f1 = (
                pt5_eff * a5_val * math.sqrt(gamma / r_value) / math.sqrt(tt5_eff)
            )
            warnings_list.append(
                "Station 5: f(M5) > 1.0. "
                f"Required A5 for f=1: {a5_min_for_f1:.6g}. "
                f"Max mdot5 for f=1: {mdot5_max_for_f1:.6g}."
            )
        if 0.0 < f_m5_from_mdot <= 1.0:
            m5_val = mach_from_f(f_m5_from_mdot, gamma, supersonic=False)
            f_m5_val = f_m5_from_mdot

    if f_m5_val is None:
        if m5_val is not None:
            f_m5_val = f_mass(m5_val, gamma)
        elif a5_val is not None and a4s is not None and a5_val > 0.0:
            f_m5_val = a4s / a5_val
            if 0.0 < f_m5_val <= 1.0:
                m5_val = mach_from_f(f_m5_val, gamma, supersonic=False)
            else:
                warnings_list.append(
                    "Station 5: A5 < A* (A4s). f(M5) > 1.0, no subsonic solution."
                )
                f_m5_val = None

    a5s_val = None
    if a5_val is not None and f_m5_val is not None:
        a5s_val = a5_val * f_m5_val

    t5 = None
    p5 = None
    if m5_val is not None:
        tau_m5 = tau_from_m(m5_val, gamma)
        pi_m5 = pi_from_tau(tau_m5, gamma)
        t5 = tt5_eff / max(tau_m5, 1e-12)
        p5 = pt5_eff / max(pi_m5, 1e-12)

    state.update(
        {
            "tau_lambda_eff": tau_lambda_eff,
            "tau_c_eff": tau_c_eff,
            "pi_c_eff": pi_c_eff,
            "tau_b_eff": tau_b_eff,
            "Tt3": tt3,
            "Pt3": pt3,
            "Pt4": pt4_eff,
            "P4": p4,
            "Tt4": tt4_eff,
            "T4": t4,
            "pi_d_used": pi_d_used,
            "Tt5": tt5_eff,
            "Pt5": pt5_eff,
            "P5": p5,
            "T5": t5,
            "M5": m5_val,
            "f_M5": f_m5_val,
            "A5s": a5s_val,
        }
    )

    mdot3_value = mdot2 if mdot2 is not None else (mdot1 if mdot1 is not None else mdot0)
    a3_val = inputs.get("A3")
    f_m3_from_mdot = None
    a3s_val = None
    m3 = None
    if (
        mdot3_value is not None
        and tt3 is not None
        and pt3 is not None
        and gamma is not None
        and r_value is not None
        and a3_val is not None
        and a3_val > 0.0
        and gamma > 1.0
        and r_value > 0.0
        and tt3 > 0.0
        and pt3 > 0.0
    ):
        f_m3_from_mdot = (
            mdot3_value * math.sqrt(tt3) / (pt3 * a3_val * math.sqrt(gamma / r_value))
        )
        if f_m3_from_mdot > 1.0:
            continuity_failed = True
            a3_min_for_f1 = a3_val * f_m3_from_mdot
            mdot3_max_for_f1 = (
                pt3 * a3_val * math.sqrt(gamma / r_value) / math.sqrt(tt3)
            )
            warnings_list.append(
                "Station 3: f(M3) > 1.0. "
                f"Required A3 for f=1: {a3_min_for_f1:.6g}. "
                f"Max mdot3 for f=1: {mdot3_max_for_f1:.6g}."
            )
        if 0.0 < f_m3_from_mdot <= 1.0:
            a3s_val = a3_val * f_m3_from_mdot
            m3 = mach_from_f(f_m3_from_mdot, gamma, supersonic=False)

    f_m3 = f_m3_from_mdot if m3 is not None else None
    t3, p3 = (None, None)
    if m3 is not None:
        t3, p3 = static_from_m(m3, tt3, pt3)

    state.update(
        {
            "mdot3": mdot3_value,
            "A3s": a3s_val,
            "M3": m3,
            "f_M3": f_m3,
            "T3": t3,
            "P3": p3,
        }
    )

    if p3 is not None and pt4_eff is not None and gamma is not None and gamma > 1.0:
        if p3 > 0.0:
            p4 = p3
            pi_m4 = pt4_eff / p4 if p4 > 0.0 else None
            if pi_m4 is not None and pi_m4 >= 1.0:
                tau_m4 = pi_m4 ** ((gamma - 1.0) / gamma)
                m4 = math.sqrt(max(0.0, 2.0 * (tau_m4 - 1.0) / (gamma - 1.0)))
                t4 = tt4_eff / max(tau_m4, 1e-12) if tt4_eff is not None else None
        state.update({"M4": m4, "tau_M4": tau_m4, "T4": t4, "P4": p4})

    pi_total = pi_d_used * pi_c_eff * pi_b * pi_t * pi_n
    pt_e = pt0 * pi_total

    state.update({"Pt_e": pt_e, "pi_total": pi_total})

    pt_e_over_p0 = None
    choked = None
    m8 = None
    p8 = None
    if pt_e is not None and p0 is not None and p0 > 0.0:
        pt_e_over_p0 = pt_e / p0
        choked = pt_e_over_p0 >= critical_pt_over_p
        if choked:
            m8 = 1.0
            p8 = pt_e / max(critical_pt_over_p, 1e-12)

    state.update({"Pt_e_over_P0": pt_e_over_p0, "choked": choked, "M8": m8, "P8": p8})

    pe = None
    me_from_pe = None
    me = None
    ae_over_a8 = None
    ae = inputs.get("Ae")
    if ae is not None:
        try:
            ae_value = float(ae)
        except Exception:
            ae_value = None
        if ae_value is None or not math.isfinite(ae_value) or ae_value <= 0.0:
            ae = None
        else:
            ae = ae_value

    if inputs.get("nozzle_fully_expanded", False):
        pe = p0
        pt_over_pe = pt_e / max(pe, 1e-12)
        tau_e = pt_over_pe ** ((gamma - 1.0) / gamma)
        me_from_pe = math.sqrt(max((2.0 / (gamma - 1.0)) * (tau_e - 1.0), 0.0))
        me = me_from_pe
        ae_over_a8 = area_ratio_from_m(me_from_pe, gamma)

        if ae is not None and inputs.get("A8") is not None:
            ae_equals_a8 = abs(ae - inputs["A8"]) <= 1e-12
        else:
            ae_equals_a8 = False

        if ae_equals_a8 and choked:
            me = 1.0
            me_from_pe = 1.0
            ae_over_a8 = 1.0

        if ae is None and inputs.get("A8") is not None and ae_over_a8 is not None:
            ae = inputs["A8"] * ae_over_a8

    state.update({"Pe": pe, "Me": me, "Me_from_pe": me_from_pe, "Ae": ae, "Ae_over_A8": ae_over_a8})

    tt_e_over_tt0 = (tau_lambda_eff / tau_r) * tau_t
    tt_e = tt0 * tt_e_over_tt0

    state.update({"Tt_e_over_Tt0": tt_e_over_tt0, "Tt_e": tt_e})

    def f_from_mdot(mdot, area, pt_value, tt_value, gamma_value, r_val):
        if (
            mdot is None
            or area is None
            or pt_value is None
            or tt_value is None
            or gamma_value is None
            or r_val is None
        ):
            return None
        if area <= 0.0 or tt_value <= 0.0 or pt_value <= 0.0:
            return None
        if gamma_value <= 1.0 or r_val <= 0.0:
            return None
        return mdot * math.sqrt(tt_value) / (
            pt_value * area * math.sqrt(gamma_value / r_val)
        )

    f_m8_from_mdot = f_from_mdot(mdot_core, inputs.get("A8"), pt_e, tt_e, gamma, r_value)
    if f_m8_from_mdot is not None:
        if f_m8_from_mdot > 1.0:
            continuity_failed = True
            a8_val = inputs.get("A8")
            if a8_val is not None and a8_val > 0.0:
                a8_min_for_f1 = a8_val * f_m8_from_mdot
                mdot8_max_for_f1 = (
                    pt_e * a8_val * math.sqrt(gamma / r_value) / math.sqrt(tt_e)
                )
                warnings_list.append(
                    "Station 8: f(M8) > 1.0. "
                    f"Required A8 for f=1: {a8_min_for_f1:.6g}. "
                    f"Max mdot8 for f=1: {mdot8_max_for_f1:.6g}."
                )
        if 0.0 < f_m8_from_mdot <= 1.0:
            m8 = mach_from_f(f_m8_from_mdot, gamma, supersonic=False)
            tau_m8 = tau_from_m(m8, gamma)
            pi_m8 = pi_from_tau(tau_m8, gamma)
            p8 = pt_e / max(pi_m8, 1e-12)
            choked = abs(f_m8_from_mdot - 1.0) <= 1e-4

    if m8 is None and choked:
        m8 = 1.0

    f_me_from_mdot = f_from_mdot(mdot_core, ae, pt_e, tt_e, gamma, r_value)
    if f_me_from_mdot is not None:
        if f_me_from_mdot > 1.0 and ae is not None and ae > 0.0:
            continuity_failed = True
            ae_min_for_f1 = ae * f_me_from_mdot
            mdot_e_max_for_f1 = (
                pt_e * ae * math.sqrt(gamma / r_value) / math.sqrt(tt_e)
            )
            warnings_list.append(
                "Station e: f(Me) > 1.0. "
                f"Required Ae for f=1: {ae_min_for_f1:.6g}. "
                f"Max mdot_e for f=1: {mdot_e_max_for_f1:.6g}."
            )
        if 0.0 < f_me_from_mdot <= 1.0:
            use_supersonic = bool(choked)
            me = mach_from_f(f_me_from_mdot, gamma, supersonic=use_supersonic)
            tau_me = tau_from_m(me, gamma)
            pi_me = pi_from_tau(tau_me, gamma)
            pe = pt_e / max(pi_me, 1e-12)

    if continuity_failed:
        warnings_list.append(
            "Mass-flow continuity check failed: f(M) > 1.0 at one or more stations."
        )

    f_m8_val = f_mass(m8, gamma) if m8 is not None else None
    f_me_val = f_mass(me, gamma) if me is not None else None
    a8s_val = inputs.get("A8") * f_m8_val if f_m8_val is not None else None
    aes_val = ae * f_me_val if (ae is not None and f_me_val is not None) else None

    t8 = None
    te = None
    if tt_e is not None and gamma is not None:
        if m8 is not None:
            t8 = tt_e / tau_from_m(m8, gamma)
        if me is not None:
            te = tt_e / tau_from_m(me, gamma)

    state.update(
        {
            "M8": m8,
            "P8": p8,
            "Me": me,
            "Pe": pe,
            "f_M8": f_m8_val,
            "f_Me": f_me_val,
            "A8s": a8s_val,
            "Aes": aes_val,
            "T8": t8,
            "Te": te,
            "choked": choked,
        }
    )

    shock_present = bool(shock_downstream_subsonic)
    if pt1 is not None and pt2_isentropic is not None:
        shock_present = shock_present or (pt2_isentropic < pt1 * 0.999999)

    inlet_choked = inlet_choked_subsonic
    nozzle_choked = bool(choked)

    def pt_ratio(pt_value):
        if pt_value is None or pt0 is None:
            return None
        return pt_value / pt0

    def tt_ratio(tt_value):
        if tt_value is None or tt0 is None:
            return None
        return tt_value / tt0

    def p_over_pt(p_value, pt_value):
        if p_value is None or pt_value is None:
            return None
        return p_value / pt_value

    def t_over_tt(t_value, tt_value):
        if t_value is None or tt_value is None:
            return None
        return t_value / tt_value

    m2_val_effective = m2_from_core if m2_from_core is not None else m2
    f_m2_val = results.get("f_M2_new", f_m2)

    mdot2_table = None
    if f_m2_val is not None:
        mdot2_table = mdot_from_values(inputs.get("A2"), pt2_isentropic, tt2, f_m2_val, gamma, r_value)

    mdot3_source = mdot2_table
    if mdot3_source is None:
        mdot3_source = mdot2 if mdot2 is not None else (mdot1 if mdot1 is not None else mdot0)

    a_star_inlet = astar_inlet
    f_m4_val = f_mass(m4, gamma) if m4 is not None else None
    a_star_core = a4_val * f_m4_val if (a4_val is not None and f_m4_val is not None) else a4s
    a_star_5 = state.get("A5s")
    if a_star_core is not None:
        state["A4s"] = a_star_core

    station_rows = [
        {
            "station": "0",
            "A": a0,
            "A*": a_star_inlet,
            "A/A*": a0 / a_star_inlet if a0 and a_star_inlet else None,
            "shock": None,
            "choked": None,
            "P": p0,
            "Pt": pt0,
            "Pt/Pt0": pt_ratio(pt0),
            "P/Pt": p_over_pt(p0, pt0),
            "T": t0,
            "Tt": tt0,
            "Tt/Tt0": tt_ratio(tt0),
            "T/Tt": t_over_tt(t0, tt0),
            "M": m0,
            "U": velocity_from_m(m0, t0),
            "f(M)": f_m0,
            "mdot": mdot_from_values(a0, pt0, tt0, f_m0, gamma, r_value),
        },
        {
            "station": "1",
            "A": inputs.get("A1"),
            "A*": a_star_inlet,
            "A/A*": inputs.get("A1") / a_star_inlet if inputs.get("A1") and a_star_inlet else None,
            "shock": shock_present,
            "choked": None,
            "P": p1,
            "Pt": pt1,
            "Pt/Pt0": pt_ratio(pt1),
            "P/Pt": p_over_pt(p1, pt1),
            "T": t1,
            "Tt": tt1,
            "Tt/Tt0": tt_ratio(tt1),
            "T/Tt": t_over_tt(t1, tt1),
            "M": m1,
            "U": velocity_from_m(m1, t1),
            "f(M)": f_m1,
            "mdot": mdot_from_values(inputs.get("A1"), pt1, tt1, f_m1, gamma, r_value),
        },
        {
            "station": "1.5",
            "A": inputs.get("A1.5"),
            "A*": a_star_inlet,
            "A/A*": inputs.get("A1.5") / a_star_inlet if inputs.get("A1.5") and a_star_inlet else None,
            "shock": None,
            "choked": inlet_choked,
            "P": p15,
            "Pt": pt15,
            "Pt/Pt0": pt_ratio(pt15),
            "P/Pt": p_over_pt(p15, pt15),
            "T": t15,
            "Tt": tt15,
            "Tt/Tt0": tt_ratio(tt15),
            "T/Tt": t_over_tt(t15, tt15),
            "M": m15,
            "U": velocity_from_m(m15, t15),
            "f(M)": f_m15,
            "mdot": mdot_from_values(inputs.get("A1.5"), pt15, tt15, f_m15, gamma, r_value),
        },
        {
            "station": "2",
            "A": inputs.get("A2"),
            "A*": a_star_inlet,
            "A/A*": inputs.get("A2") / a_star_inlet if inputs.get("A2") and a_star_inlet else None,
            "shock": shock_present,
            "choked": None,
            "P": p2,
            "Pt": pt2_isentropic,
            "Pt/Pt0": pt_ratio(pt2_isentropic),
            "P/Pt": p_over_pt(p2, pt2_isentropic),
            "T": t2,
            "Tt": tt2,
            "Tt/Tt0": tt_ratio(tt2),
            "T/Tt": t_over_tt(t2, tt2),
            "M": m2_val_effective,
            "U": velocity_from_m(m2_val_effective, t2),
            "f(M)": f_m2_val,
            "mdot": mdot2_table,
        },
        {
            "station": "3",
            "A": inputs.get("A3"),
            "A*": a3s_val,
            "A/A*": inputs.get("A3") / a3s_val if inputs.get("A3") and a3s_val else None,
            "shock": None,
            "choked": None,
            "P": p3,
            "Pt": pt3,
            "Pt/Pt0": pt_ratio(pt3),
            "P/Pt": p_over_pt(p3, pt3),
            "T": t3,
            "Tt": tt3,
            "Tt/Tt0": tt_ratio(tt3),
            "T/Tt": t_over_tt(t3, tt3),
            "M": m3,
            "U": velocity_from_m(m3, t3),
            "f(M)": f_m3,
            "mdot": mdot3_source,
        },
        {
            "station": "4",
            "A": a4_val,
            "A*": a_star_core,
            "A/A*": a4_val / a_star_core if a_star_core else None,
            "shock": None,
            "choked": None,
            "P": p4,
            "Pt": pt4_eff,
            "Pt/Pt0": pt_ratio(pt4_eff),
            "P/Pt": p_over_pt(p4, pt4_eff),
            "T": t4,
            "Tt": tt4_eff,
            "Tt/Tt0": tt_ratio(tt4_eff),
            "T/Tt": t_over_tt(t4, tt4_eff),
            "M": m4,
            "U": velocity_from_m(m4, t4),
            "f(M)": f_m4_val,
            "mdot": mdot_core,
        },
        {
            "station": "5",
            "A": inputs.get("A5"),
            "A*": a_star_5,
            "A/A*": inputs.get("A5") / a_star_5 if inputs.get("A5") and a_star_5 else None,
            "shock": None,
            "choked": None,
            "P": state.get("P5"),
            "Pt": state.get("Pt5"),
            "Pt/Pt0": pt_ratio(state.get("Pt5")),
            "P/Pt": p_over_pt(state.get("P5"), state.get("Pt5")),
            "T": state.get("T5"),
            "Tt": tt5_eff,
            "Tt/Tt0": tt_ratio(tt5_eff),
            "T/Tt": t_over_tt(state.get("T5"), tt5_eff),
            "M": state.get("M5"),
            "U": velocity_from_m(state.get("M5"), state.get("T5")),
            "f(M)": state.get("f_M5"),
            "mdot": mdot_from_values(inputs.get("A5"), state.get("Pt5"), tt5_eff, state.get("f_M5"), gamma, r_value),
        },
        {
            "station": "8",
            "A": inputs.get("A8"),
            "A*": a8s_val,
            "A/A*": inputs.get("A8") / a8s_val if inputs.get("A8") and a8s_val else None,
            "shock": None,
            "choked": nozzle_choked,
            "P": p8,
            "Pt": pt_e,
            "Pt/Pt0": pt_ratio(pt_e),
            "P/Pt": p_over_pt(p8, pt_e),
            "T": t8,
            "Tt": tt_e,
            "Tt/Tt0": tt_ratio(tt_e),
            "T/Tt": t_over_tt(t8, tt_e),
            "M": m8,
            "U": velocity_from_m(m8, t8),
            "f(M)": f_m8_val,
            "mdot": mdot_from_values(inputs.get("A8"), pt_e, tt_e, f_m8_val, gamma, r_value),
        },
        {
            "station": "e",
            "A": ae,
            "A*": aes_val,
            "A/A*": ae / aes_val if ae and aes_val else None,
            "shock": None,
            "choked": None,
            "P": pe,
            "Pt": pt_e,
            "Pt/Pt0": pt_ratio(pt_e),
            "P/Pt": p_over_pt(pe, pt_e),
            "T": te,
            "Tt": tt_e,
            "Tt/Tt0": tt_ratio(tt_e),
            "T/Tt": t_over_tt(te, tt_e),
            "M": me,
            "U": velocity_from_m(me, te),
            "f(M)": f_me_val,
            "mdot": mdot_from_values(ae, pt_e, tt_e, f_me_val, gamma, r_value),
        },
    ]

    station_headers = [
        "station",
        "A",
        "A*",
        "A/A*",
        "shock",
        "choked",
        "P",
        "Pt",
        "Pt/Pt0",
        "P/Pt",
        "T",
        "Tt",
        "Tt/Tt0",
        "T/Tt",
        "M",
        "U",
        "f(M)",
        "mdot",
    ]

    station_df_raw = pd.DataFrame.from_records(station_rows).reindex(columns=station_headers)
    station_df = station_df_raw.copy()
    station_df["P"] = station_df["P"].map(_to_kpa)
    station_df["Pt"] = station_df["Pt"].map(_to_kpa)
    for col in station_df.columns:
        if col in ("P", "Pt"):
            station_df[col] = station_df[col].map(_fmt_pressure)
        else:
            station_df[col] = station_df[col].map(_fmt)

    status_fields = [
        "A*",
        "P",
        "Pt",
        "Pt/Pt0",
        "P/Pt",
        "T",
        "Tt",
        "Tt/Tt0",
        "T/Tt",
        "M",
        "U",
        "f(M)",
        "mdot",
    ]

    field_relations = {
        "A*": r"\(A^* = A f(M)\)",
        "P": r"\(P = \frac{P_t}{\pi(\tau(M))}\)",
        "Pt": r"\(P_t\) (from cascade)",
        "Pt/Pt0": r"\(P_t / P_{t0}\)",
        "P/Pt": r"\(P / P_t\)",
        "T": r"\(T = \frac{T_t}{\tau(M)}\)",
        "Tt": r"\(T_t\) (from cascade)",
        "Tt/Tt0": r"\(T_t / T_{t0}\)",
        "T/Tt": r"\(T / T_t\)",
        "M": r"\(M\) from \(A/A^*\) or \(f(M)\)",
        "U": r"\(U = M\sqrt{\gamma R T}\)",
        "f(M)": r"\(f(M)\)",
        "mdot": r"\(\dot m = \frac{P_t A}{\sqrt{T_t}}\sqrt{\gamma/R}\, f(M)\)",
    }

    station_relations = {
        ("0", "A*"): r"\(A^* = A_0 f(M_0)\)",
        ("1", "A*"): r"\(A^* = A_0 f(M_0)\)",
        ("1.5", "A*"): r"\(A^* = A_0 f(M_0)\)",
        ("2", "A*"): r"\(A^* = A_0 f(M_0)\)",
        ("3", "A*"): r"\(A_3^* = A_3 f(M_3)\)",
        ("4", "A*"): r"\(A_4^* = A_4 f(M_4)\)",
        ("5", "A*"): r"\(A_5^* = A_5 f(M_5)\)",
        ("8", "A*"): r"\(A_8^* = A_8 f(M_8)\)",
        ("e", "A*"): r"\(A_e^* = A_e f(M_e)\)",
    }

    def status(value):
        if value is None or _is_invalid_number(value):
            return "pending"
        return "done"

    status_rows = []
    for row in station_rows:
        station_label = str(row.get("station"))
        status_row = {"station": station_label, "row": "status"}
        formula_row = {"station": station_label, "row": "formula"}
        for field in status_fields:
            status_row[field] = status(row.get(field))
            formula_row[field] = station_relations.get(
                (station_label, field), field_relations.get(field, "")
            )
        status_rows.append(status_row)
        status_rows.append(formula_row)

    status_df = pd.DataFrame.from_records(status_rows)

    ratio_rows = [
        {"ratio": r"\(r\)", "tau": tau_r, "pi": pi_r},
        {"ratio": r"\(\lambda\)", "tau": tau_lambda_eff, "pi": None},
        {"ratio": r"\(d\)", "tau": tau_d, "pi": pi_d_used},
        {"ratio": r"\(c\)", "tau": tau_c_eff, "pi": pi_c_eff},
        {"ratio": r"\(b\)", "tau": tau_b_eff, "pi": pi_b},
        {"ratio": r"\(t\)", "tau": tau_t, "pi": pi_t},
        {"ratio": r"\(n\)", "tau": 1.0, "pi": pi_n},
    ]

    ratio_df_raw = pd.DataFrame.from_records(ratio_rows)
    ratio_df = ratio_df_raw.apply(lambda col: col.map(_fmt))

    return {
        "station_table": station_df,
        "station_table_raw": station_df_raw,
        "status_table": status_df,
        "ratio_table": ratio_df,
        "ratio_table_raw": ratio_df_raw,
        "warnings": warnings_list,
    }


def run_simulation(
    M0,
    T0,
    P0,
    gamma,
    R,
    cp,
    pi_d,
    pi_b,
    pi_n,
    Tt4,
    eta_b,
    lhv,
    f_fuel,
    A1,
    A15,
    A2,
    A3,
    A5,
    A8,
    Ae,
    M5,
    nozzle_fully_expanded,
):
    def _optional(value):
        if value is None:
            return None
        if isinstance(value, (int, float)) and value <= 0.0:
            return None
        return float(value)

    inputs = {
        "M0": float(M0),
        "T0": float(T0),
        "P0": float(P0),
        "gamma": float(gamma),
        "R": float(R),
        "cp": float(cp),
        "pi_d": float(pi_d),
        "pi_b": float(pi_b),
        "pi_n": float(pi_n),
        "Tt4": float(Tt4),
        "eta_b": float(eta_b),
        "lhv": float(lhv),
        "f_fuel": float(f_fuel),
        "A1": float(A1),
        "A1.5": float(A15),
        "A2": float(A2),
        "A3": float(A3),
        "A5": float(A5),
        "A8": float(A8),
        "Ae": _optional(Ae),
        "M5": _optional(M5),
        "nozzle_fully_expanded": bool(nozzle_fully_expanded),
    }

    state = compute_state(inputs)
    warnings_list = state.get("warnings", [])
    if warnings_list:
        warnings_df = pd.DataFrame({"warning": warnings_list})
        _render_table(warnings_df)
    _render_table(state["station_table"])
    _render_table(state["ratio_table"])
    _render_table(state["status_table"])


def build_widgets():
    sliders = {
        "M0": widgets.FloatSlider(value=3.0, min=0.1, max=6.0, step=0.05, description="M0"),
        "T0": widgets.FloatSlider(value=216.0725, min=150.0, max=350.0, step=1.0, description="T0"),
        "P0": widgets.FloatSlider(value=101.325e3, min=5e3, max=2.5e5, step=1e3, description="P0"),
        "gamma": widgets.FloatSlider(value=1.4, min=1.2, max=1.6, step=0.01, description="gamma"),
        "R": widgets.FloatSlider(value=287.0, min=200.0, max=400.0, step=1.0, description="R"),
        "cp": widgets.FloatSlider(value=1004.0, min=800.0, max=1400.0, step=1.0, description="cp"),
        "pi_d": widgets.FloatSlider(value=1.0, min=0.7, max=1.0, step=0.01, description="pi_d"),
        "pi_b": widgets.FloatSlider(value=1.0, min=0.7, max=1.0, step=0.01, description="pi_b"),
        "pi_n": widgets.FloatSlider(value=1.0, min=0.7, max=1.0, step=0.01, description="pi_n"),
        "Tt4": widgets.FloatSlider(value=1944.0, min=800.0, max=2600.0, step=10.0, description="Tt4"),
        "eta_b": widgets.FloatSlider(value=1.0, min=0.7, max=1.0, step=0.01, description="eta_b"),
        "lhv": widgets.FloatSlider(value=43e6, min=2e7, max=5e7, step=1e6, description="lhv"),
        "f_fuel": widgets.FloatSlider(value=0.23, min=0.0, max=0.4, step=0.005, description="f_fuel"),
        "A1": widgets.FloatSlider(value=45.0, min=1.0, max=100.0, step=0.5, description="A1"),
        "A15": widgets.FloatSlider(value=12.0, min=0.5, max=50.0, step=0.1, description="A1.5"),
        "A2": widgets.FloatSlider(value=14.0, min=0.5, max=50.0, step=0.1, description="A2"),
        "A3": widgets.FloatSlider(value=2.5, min=0.1, max=20.0, step=0.1, description="A3"),
        "A5": widgets.FloatSlider(value=14.0, min=0.5, max=50.0, step=0.1, description="A5"),
        "A8": widgets.FloatSlider(value=4.0, min=0.1, max=30.0, step=0.1, description="A8"),
        "Ae": widgets.FloatSlider(value=0.0, min=0.0, max=60.0, step=0.1, description="Ae"),
        "M5": widgets.FloatSlider(value=0.0, min=0.0, max=1.0, step=0.01, description="M5"),
        "nozzle_fully_expanded": widgets.Checkbox(value=True, description="nozzle_fully_expanded"),
    }

    row_layout = widgets.Layout(display="flex", flex_flow="row wrap", width="80%")
    slider_layout = widgets.Layout(min_width="220px", flex="1 1 220px")
    ui = widgets.VBox(
        [
            widgets.HBox(
                [
                    sliders["M0"],
                    sliders["T0"],
                    sliders["P0"],
                    sliders["gamma"],
                    sliders["R"],
                    sliders["cp"],
                ],
                layout=row_layout,
            ),
            widgets.HBox(
                [
                    sliders["pi_d"],
                    sliders["pi_b"],
                    sliders["pi_n"],
                    sliders["Tt4"],
                    sliders["eta_b"],
                    sliders["lhv"],
                    sliders["f_fuel"],
                ],
                layout=row_layout,
            ),
            widgets.HBox(
                [
                    sliders["A1"],
                    sliders["A15"],
                    sliders["A2"],
                    sliders["A3"],
                    sliders["A5"],
                    sliders["A8"],
                    sliders["Ae"],
                    sliders["M5"],
                    sliders["nozzle_fully_expanded"],
                ],
                layout=row_layout,
            ),
        ],
        layout=widgets.Layout(width="90%"),
    )

    for slider in sliders.values():
        if hasattr(slider, "layout"):
            slider.layout = slider_layout

    out = widgets.interactive_output(
        run_simulation,
        {name: sliders[name] for name in sliders},
    )

    display(ui, out)


if __name__ == "__main__":
    if HAS_WIDGETS and _in_notebook():
        build_widgets()
    else:
        run_simulation(
            M0=3.0,
            T0=216.0725,
            P0=101.325e3,
            gamma=1.4,
            R=287.0,
            cp=1004.0,
            pi_d=1.0,
            pi_b=1.0,
            pi_n=1.0,
            Tt4=1944.0,
            eta_b=1.0,
            lhv=43e6,
            f_fuel=0.23,
            A1=45.0,
            A15=12.0,
            A2=14.0,
            A3=2.5,
            A5=14.0,
            A8=4.0,
            Ae=0.0,
            M5=0.0,
            nozzle_fully_expanded=True,
        )
