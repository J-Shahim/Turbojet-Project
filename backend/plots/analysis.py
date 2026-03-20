from __future__ import annotations

from typing import Any, Dict
import math

import numpy as np

from matching import f_m2_operating_from_pi_c


def _clean_value(value: Any) -> float | None:
    if value is None:
        return None
    try:
        val = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(val):
        return None
    return val


def _clean_array(values: np.ndarray) -> list[float | None]:
    return [_clean_value(val) for val in np.asarray(values).tolist()]


def _series_from_mask(x: np.ndarray, y: np.ndarray, mask: np.ndarray) -> Dict[str, list[float]]:
    if not np.any(mask):
        return {"x": [], "y": []}
    return {
        "x": [float(val) for val in x[mask]],
        "y": [float(val) for val in y[mask]],
    }


def _fuel_air_ratio(tau_r, tau_c, tau_lambda, tau_f):
    tau_r = np.asarray(tau_r, dtype=float)
    tau_c = np.asarray(tau_c, dtype=float)
    denom = float(tau_f) - float(tau_lambda)
    if abs(denom) < 1e-9:
        return np.full_like(tau_r * tau_c, np.nan, dtype=float)
    return (float(tau_lambda) - tau_r * tau_c) / denom


def _tau_turbine(tau_r, tau_c, tau_lambda, tau_f):
    f = _fuel_air_ratio(tau_r, tau_c, tau_lambda, tau_f)
    denom = (1.0 + f) * float(tau_lambda)
    return 1.0 - tau_r * (tau_c - 1.0) / denom


def _thrust_dimless(tau_r, tau_c, gamma, tau_lambda, tau_f):
    f = _fuel_air_ratio(tau_r, tau_c, tau_lambda, tau_f)
    tau_t = _tau_turbine(tau_r, tau_c, tau_lambda, tau_f)
    core = ((tau_r * tau_c * tau_t - 1.0) / (tau_r - 1.0)) * (float(tau_lambda) / (tau_r * tau_c))
    core = np.maximum(core, 0.0)
    return (2.0 * float(gamma) / (float(gamma) - 1.0)) * (tau_r - 1.0) * ((1.0 + f) * np.sqrt(core) - 1.0)


def _m0_from_tau_r(tau_r, gamma):
    tau_r = np.asarray(tau_r, dtype=float)
    return np.sqrt(2.0 * (tau_r - 1.0) / (float(gamma) - 1.0))


def _isp_dimless(tbar, f, m0, gamma):
    return tbar / (f * float(gamma) * m0)


def analysis_tau_sweeps(inputs: Dict[str, Any]) -> Dict[str, Any]:
    gamma = float(inputs.get("gamma", 1.4))
    tau_lambda = float(inputs.get("tau_lambda", 8.4))
    tau_f = float(inputs.get("tau_f", 170.0))
    tau_r_ref = float(inputs.get("tau_r_ref", 1.45))
    tau_c_ref = float(inputs.get("tau_c_ref", 2.5))
    tau_c_min = float(inputs.get("tau_c_min", 1.05))
    tau_c_max = float(inputs.get("tau_c_max", 40.0))
    tau_r_min = float(inputs.get("tau_r_min", 1.05))
    tau_r_max = float(inputs.get("tau_r_max", 3.0))
    npts = int(inputs.get("npts", 400))

    tau_c_vec = np.linspace(tau_c_min, tau_c_max, int(npts))
    tau_r_vec = np.linspace(tau_r_min, tau_r_max, int(npts))

    t_tau_c = _thrust_dimless(tau_r_ref, tau_c_vec, gamma, tau_lambda, tau_f)
    f_tau_c = _fuel_air_ratio(tau_r_ref, tau_c_vec, tau_lambda, tau_f)
    m0_tau_c = _m0_from_tau_r(tau_r_ref, gamma)
    isp_tau_c = _isp_dimless(t_tau_c, f_tau_c, m0_tau_c, gamma)

    t_tau_r = _thrust_dimless(tau_r_vec, tau_c_ref, gamma, tau_lambda, tau_f)
    f_tau_r = _fuel_air_ratio(tau_r_vec, tau_c_ref, tau_lambda, tau_f)
    m0_tau_r = _m0_from_tau_r(tau_r_vec, gamma)
    isp_tau_r = _isp_dimless(t_tau_r, f_tau_r, m0_tau_r, gamma)

    mask_tau_c = f_tau_c > 0
    mask_tau_r = f_tau_r > 0
    warn_tau_c = not np.any(mask_tau_c)
    warn_tau_r = not np.any(mask_tau_r)

    if not warn_tau_c:
        t_tau_c = np.where(mask_tau_c, t_tau_c, np.nan)
        isp_tau_c = np.where(mask_tau_c, isp_tau_c, np.nan)
    if not warn_tau_r:
        t_tau_r = np.where(mask_tau_r, t_tau_r, np.nan)
        isp_tau_r = np.where(mask_tau_r, isp_tau_r, np.nan)

    warnings: Dict[str, str] = {}
    if warn_tau_c:
        warnings["tau_c"] = "No f>0 points: raise tau_lambda or lower tau_c."
    if warn_tau_r:
        warnings["tau_r"] = "No f>0 points: raise tau_lambda or lower tau_c."

    return {
        "series": {
            "tau_c": {
                "x": _clean_array(tau_c_vec),
                "tbar": _clean_array(t_tau_c),
                "isp": _clean_array(isp_tau_c),
            },
            "tau_r": {
                "x": _clean_array(tau_r_vec),
                "tbar": _clean_array(t_tau_r),
                "isp": _clean_array(isp_tau_r),
            },
        },
        "params": {
            "gamma": gamma,
            "tau_lambda": tau_lambda,
            "tau_f": tau_f,
            "tau_r_ref": tau_r_ref,
            "tau_c_ref": tau_c_ref,
            "tau_c_min": tau_c_min,
            "tau_c_max": tau_c_max,
            "tau_r_min": tau_r_min,
            "tau_r_max": tau_r_max,
            "npts": npts,
        },
        "labels": {
            "tau_c": r"$\tau_c$",
            "tau_r": r"$\tau_r$",
            "tbar": r"$\mathbb{T}/(P_0A_0)$",
            "isp": r"$(I_{sp}g)/a_0$",
            "titles": {
                "tbar_tau_c": r"$\mathbb{T}/(P_0A_0)$ vs $\tau_c$",
                "isp_tau_c": r"$(I_{sp}g)/a_0$ vs $\tau_c$",
                "tbar_tau_r": r"$\mathbb{T}/(P_0A_0)$ vs $\tau_r$",
                "isp_tau_r": r"$(I_{sp}g)/a_0$ vs $\tau_r$",
            },
        },
        "warnings": warnings,
    }


def analysis_velocity_ratio(inputs: Dict[str, Any]) -> Dict[str, Any]:
    gamma = float(inputs.get("gamma", 1.4))
    tau_r = float(inputs.get("tau_r", 1.45))
    tau_lambda = float(inputs.get("tau_lambda", 8.4))
    tau_f = float(inputs.get("tau_f", 170.0))
    tau_c_min = float(inputs.get("tau_c_min", 1.05))
    tau_c_max = float(inputs.get("tau_c_max", 7.0))
    npts = int(inputs.get("npts", 400))

    tau_c_grid = np.linspace(tau_c_min, tau_c_max, int(npts))
    vr2 = (tau_lambda - tau_r * (tau_c_grid - 1.0) - (tau_lambda / (tau_r * tau_c_grid))) / (tau_r - 1.0)
    vr = np.sqrt(np.maximum(vr2, 0.0))

    tau_t = _tau_turbine(tau_r, tau_c_grid, tau_lambda, tau_f)
    me2 = (2.0 / (gamma - 1.0)) * (tau_r * tau_c_grid * tau_t - 1.0)
    me = np.sqrt(np.clip(me2, 0.0, None))

    tbar = _thrust_dimless(tau_r, tau_c_grid, gamma, tau_lambda, tau_f)

    tau_c_calc = math.sqrt(tau_lambda) / tau_r if tau_r > 0.0 else float("nan")
    tau_c_fuel_off = tau_lambda / tau_r if tau_r > 0.0 else float("nan")

    def _point_at(tau_c_val: float) -> Dict[str, float]:
        if not math.isfinite(tau_c_val):
            return {"tau_c": float("nan"), "velocity_ratio": float("nan"), "me": float("nan"), "tbar": float("nan")}
        vr2_val = (tau_lambda - tau_r * (tau_c_val - 1.0) - (tau_lambda / (tau_r * tau_c_val))) / (tau_r - 1.0)
        vr_val = math.sqrt(max(vr2_val, 0.0))
        tau_t_val = float(_tau_turbine(tau_r, tau_c_val, tau_lambda, tau_f))
        me2_val = (2.0 / (gamma - 1.0)) * (tau_r * tau_c_val * tau_t_val - 1.0)
        me_val = math.sqrt(max(me2_val, 0.0))
        tbar_val = float(_thrust_dimless(tau_r, tau_c_val, gamma, tau_lambda, tau_f))
        return {
            "tau_c": float(tau_c_val),
            "velocity_ratio": float(vr_val),
            "me": float(me_val),
            "tbar": float(tbar_val),
        }

    i_max = int(np.nanargmax(vr)) if np.any(np.isfinite(vr)) else 0
    tau_c_num = float(tau_c_grid[i_max])

    markers = {
        "calc": _point_at(tau_c_calc),
        "numeric": _point_at(tau_c_num),
        "fuel_off": _point_at(tau_c_fuel_off),
    }

    warnings = {}
    if not np.any(np.isfinite(vr)):
        warnings["curve"] = "No finite velocity-ratio values for the chosen range."

    return {
        "series": {
            "tau_c": {
                "x": _clean_array(tau_c_grid),
                "velocity_ratio": _clean_array(vr),
                "me": _clean_array(me),
                "tbar": _clean_array(tbar),
            }
        },
        "markers": markers,
        "params": {
            "gamma": gamma,
            "tau_r": tau_r,
            "tau_lambda": tau_lambda,
            "tau_f": tau_f,
            "tau_c_min": tau_c_min,
            "tau_c_max": tau_c_max,
            "npts": npts,
            "m0": float(_m0_from_tau_r(tau_r, gamma)),
        },
        "labels": {
            "tau_c": r"$\tau_c$",
            "velocity_ratio": r"$U_e/U_0$",
            "me": r"$M_e$",
            "tbar": r"$\mathbb{T}/(P_0A_0)$",
            "m0": r"$M_0$",
            "title": r"Velocity Ratio, Exit Mach, Thrust, and $M_0$ vs $\tau_c$",
        },
        "warnings": warnings,
    }


def _f_me(me, gamma):
    return (
        ((gamma + 1.0) / 2.0) ** ((gamma + 1.0) / (2.0 * (gamma - 1.0)))
        * me
        / (1.0 + (gamma - 1.0) / 2.0 * me**2) ** ((gamma + 1.0) / (2.0 * (gamma - 1.0)))
    )


def _tbar_of_me(me, gamma, m0, tte_over_t0, pte_over_p0, a8_over_a0):
    term_temp = 1.0 / (1.0 + (gamma - 1.0) / 2.0 * me**2)
    term_pres = term_temp ** (gamma / (gamma - 1.0))
    return (
        gamma * m0**2 * ((me / m0) * np.sqrt(tte_over_t0 * term_temp) - 1.0)
        + (pte_over_p0 * term_pres - 1.0) * a8_over_a0 * (1.0 / _f_me(me, gamma))
    )


def _pe_over_p0_of_me(me, gamma, pte_over_p0):
    term_temp = 1.0 / (1.0 + (gamma - 1.0) / 2.0 * me**2)
    return pte_over_p0 * term_temp ** (gamma / (gamma - 1.0))


def _me_at_pe_equals_p0(gamma, pte_over_p0):
    if pte_over_p0 < 1.0:
        return float("nan")
    base = pte_over_p0 ** ((gamma - 1.0) / gamma)
    value = (2.0 / (gamma - 1.0)) * (base - 1.0)
    if value < 0.0:
        return float("nan")
    return float(math.sqrt(value))


def analysis_tbar_vs_me(inputs: Dict[str, Any]) -> Dict[str, Any]:
    gamma = float(inputs.get("gamma", 1.4))
    m0 = float(inputs.get("M0", 3.0))
    tte_over_t0 = float(inputs.get("Tte_over_T0", 5.658))
    pte_over_p0 = float(inputs.get("Pte_over_P0", 85.955))
    a8_over_a0 = float(inputs.get("A8_over_A0", 0.143))
    npts = int(inputs.get("npts", 500))
    me_pick = float(inputs.get("Me_pick", 2.5))

    me_min = 1.0
    me_max = max(12.0, me_min + 0.2)
    me_grid = np.linspace(me_min, me_max, int(npts))
    tbar = _tbar_of_me(me_grid, gamma, m0, tte_over_t0, pte_over_p0, a8_over_a0)

    pos_mask = (me_grid > 0.0) & (tbar > 0.0) & np.isfinite(tbar)
    me_pos = me_grid[pos_mask]
    tbar_pos = tbar[pos_mask]

    me_pick_val = me_pick
    if not np.isfinite(me_pick_val):
        me_pick_val = _me_at_pe_equals_p0(gamma, pte_over_p0)
    if not np.isfinite(me_pick_val):
        me_pick_val = float(me_pos[len(me_pos) // 2]) if me_pos.size else float(me_min)

    if me_pos.size:
        i_pick = int(np.argmin(np.abs(me_pos - me_pick_val)))
        me_snap = float(me_pos[i_pick])
    else:
        me_snap = float(me_pick_val)

    tbar_val = float(_tbar_of_me(np.array([me_snap]), gamma, m0, tte_over_t0, pte_over_p0, a8_over_a0)[0])
    pe_over_p0_val = float(_pe_over_p0_of_me(np.array([me_snap]), gamma, pte_over_p0)[0])
    ae_over_a8_val = float(1.0 / _f_me(me_snap, gamma)) if math.isfinite(me_snap) else float("nan")
    ae_over_a0_val = float(ae_over_a8_val * a8_over_a0) if math.isfinite(ae_over_a8_val) else float("nan")

    warnings = {}
    if not np.any(pos_mask):
        warnings["curve"] = "No positive thrust values in the selected range."

    return {
        "series": {
            "me": _clean_array(me_pos),
            "tbar": _clean_array(tbar_pos),
        },
        "selected": {
            "me": me_snap,
            "tbar": tbar_val,
            "pe_over_p0": pe_over_p0_val,
            "ae_over_a8": ae_over_a8_val,
            "ae_over_a0": ae_over_a0_val,
        },
        "params": {
            "gamma": gamma,
            "m0": m0,
            "tte_over_t0": tte_over_t0,
            "pte_over_p0": pte_over_p0,
            "a8_over_a0": a8_over_a0,
            "npts": npts,
            "me_pick": me_pick,
            "me_pe_eq": _me_at_pe_equals_p0(gamma, pte_over_p0),
        },
        "labels": {
            "me": r"$M_e$",
            "tbar": r"$\mathbb{T}/(P_0A_0)$",
            "title": r"$\mathbb{T}/(P_0A_0)(M_e)$",
        },
        "warnings": warnings,
    }


def analysis_operating_line(inputs: Dict[str, Any]) -> Dict[str, Any]:
    gamma = float(inputs.get("gamma", 1.4))
    a4s_over_a2 = float(inputs.get("A4s_over_A2", 1.0 / 14.0))
    a4s_over_a8 = float(inputs.get("A4s_over_A8", 1.0 / 4.0))
    pi_c_min = float(inputs.get("pi_c_min", 1.01))
    pi_c_max = float(inputs.get("pi_c_max", 60.0))
    npts = int(inputs.get("npts", 800))
    f_m2_pick = float(inputs.get("fM2_pick", 0.20))

    if pi_c_max <= pi_c_min:
        return {"error": "Set pi_c_max > pi_c_min."}

    pi_c = np.linspace(pi_c_min, pi_c_max, int(npts))
    f_m2 = f_m2_operating_from_pi_c(pi_c, a4s_over_a2=a4s_over_a2, a4s_over_a8=a4s_over_a8, gamma=gamma)

    mask = np.isfinite(f_m2) & (f_m2 <= 1.0)
    if not np.any(mask):
        return {"error": "No real-valued f(M2) <= 1 for current parameters."}

    pi_c_v = pi_c[mask]
    f_m2_v = f_m2[mask]

    i_min = int(np.nanargmin(f_m2_v))
    min_point = {
        "f_m2": float(f_m2_v[i_min]),
        "pi_c": float(pi_c_v[i_min]),
    }

    f_m2_pick_clip = float(np.clip(f_m2_pick, float(np.min(f_m2_v)), float(np.max(f_m2_v))))
    i_pick = int(np.argmin(np.abs(f_m2_v - f_m2_pick_clip)))
    pick_point = {
        "f_m2": float(f_m2_v[i_pick]),
        "pi_c": float(pi_c_v[i_pick]),
    }

    return {
        "series": {
            "f_m2": _clean_array(f_m2_v),
            "pi_c": _clean_array(pi_c_v),
        },
        "markers": {
            "min": min_point,
            "pick": pick_point,
        },
        "params": {
            "gamma": gamma,
            "a4s_over_a2": a4s_over_a2,
            "a4s_over_a8": a4s_over_a8,
            "pi_c_min": pi_c_min,
            "pi_c_max": pi_c_max,
            "npts": npts,
            "f_m2_pick": f_m2_pick,
        },
        "labels": {
            "f_m2": r"$f(M_2)$",
            "pi_c": r"$\pi_c$",
            "title": "Compressor Operating Line",
        },
    }


def _tau_c_strip_model_current(
    f_m2,
    mb_corr,
    n_stages=8.0,
    gamma=1.4,
    alpha2a_deg=10.0,
    beta2b_deg=60.0,
):
    f_m2 = np.asarray(f_m2, dtype=float)
    mb_corr = float(mb_corr)

    if mb_corr <= 0.0:
        shape = np.full_like(f_m2, np.nan)
        return shape, shape, shape

    k = ((gamma + 1.0) / 2.0) ** ((gamma + 1.0) / (2.0 * (gamma - 1.0)))
    phi = f_m2 / (k * mb_corr)

    tana = np.tan(np.deg2rad(alpha2a_deg))
    tanb = np.tan(np.deg2rad(beta2b_deg))
    psi = 1.0 - phi * (tanb + tana)

    tau_c = 1.0 + n_stages * (gamma - 1.0) * (mb_corr**2) * psi
    return tau_c, psi, phi


def _pi_c_from_tau_c(tau_c, gamma=1.4):
    tau_c = np.asarray(tau_c, dtype=float)
    out = np.full_like(tau_c, np.nan, dtype=float)
    valid = tau_c > 1.0
    out[valid] = tau_c[valid] ** (gamma / (gamma - 1.0))
    return out


def _pi_c_f1_matching(f_m2, tau_lambda_over_tau_r=6.0, a2_over_a4s=14.0, f=0.02, pi_b=0.95):
    coeff = ((1.0 + f) / pi_b) * a2_over_a4s * math.sqrt(tau_lambda_over_tau_r)
    return coeff * np.asarray(f_m2, dtype=float)


def _intersection_same_grid(f_m2: np.ndarray, pi_a: np.ndarray, pi_b: np.ndarray):
    f_m2 = np.asarray(f_m2, dtype=float)
    pi_a = np.asarray(pi_a, dtype=float)
    pi_b = np.asarray(pi_b, dtype=float)

    mask = np.isfinite(f_m2) & np.isfinite(pi_a) & np.isfinite(pi_b)
    if np.sum(mask) < 2:
        return None

    f_vals = f_m2[mask]
    diff = pi_a[mask] - pi_b[mask]
    if diff.size < 2:
        return None

    sign_changes = np.where(np.sign(diff[1:]) != np.sign(diff[:-1]))[0]
    if sign_changes.size == 0:
        return None

    i0 = int(sign_changes[0])
    i1 = i0 + 1
    x0, x1 = float(f_vals[i0]), float(f_vals[i1])
    y0, y1 = float(diff[i0]), float(diff[i1])
    t = 0.0 if y1 == y0 else -y0 / (y1 - y0)
    f_int = x0 + t * (x1 - x0)
    pi_int = float(np.interp(f_int, f_vals, pi_a[mask]))
    return {
        "f_m2": float(f_int),
        "pi_c": float(pi_int),
    }


def analysis_strip_model(inputs: Dict[str, Any]) -> Dict[str, Any]:
    gamma = float(inputs.get("gamma", 1.4))
    n_stages = float(inputs.get("n_stages", 8.0))
    alpha2a_deg = float(inputs.get("alpha2a_deg", 10.0))
    beta2b_deg = float(inputs.get("beta2b_deg", 60.0))
    tau_r = float(inputs.get("tau_r", 1.0))
    t0 = float(inputs.get("t0", 288.15))

    f_m2_min = float(inputs.get("f_m2_min", 0.15))
    f_m2_max = float(inputs.get("f_m2_max", 0.95))
    n_f_m2 = int(inputs.get("n_f_m2", 220))

    mb_corr_min = float(inputs.get("mb_corr_min", 0.50))
    mb_corr_max = float(inputs.get("mb_corr_max", 1.20))
    n_speed_lines = int(inputs.get("n_speed_lines", 8))
    mb_user = float(inputs.get("mb_user", 0.85))

    a2_over_a4s = float(inputs.get("a2_over_a4s", 14.0))
    a4s_over_a8 = float(inputs.get("a4s_over_a8", 1.0 / 4.0))

    tau_min = float(inputs.get("tau_min", 3.0))
    tau_max = float(inputs.get("tau_max", 9.0))
    n_tau_lines = int(inputs.get("n_tau_lines", 6))
    tau_user = float(inputs.get("tau_user", 6.0))

    fuel_to_air = float(inputs.get("fuel_to_air", 0.02))
    pi_b = float(inputs.get("pi_b", 0.95))

    pi_c_operating_min = float(inputs.get("pi_c_operating_min", 1.01))
    pi_c_operating_max = float(inputs.get("pi_c_operating_max", 40.0))
    n_pi_operating = int(inputs.get("n_pi_operating", 300))

    f_m2_max_eff = min(f_m2_max, 1.0)
    if f_m2_max_eff <= f_m2_min:
        return {"error": "Set fM2 max > fM2 min (and <= 1.0)."}
    if pi_c_operating_max <= pi_c_operating_min:
        return {"error": "Set pi_c operating max > min."}
    if tau_max <= tau_min:
        return {"error": "Set tau_lambda/tau_r max > min."}

    f_m2 = np.linspace(f_m2_min, f_m2_max_eff, int(max(30, n_f_m2)))
    mb_lines = np.linspace(mb_corr_min, mb_corr_max, int(max(2, n_speed_lines)))
    tau_lines = np.linspace(tau_min, tau_max, int(max(2, n_tau_lines)))

    pi_c_operating = np.linspace(pi_c_operating_min, pi_c_operating_max, int(max(50, n_pi_operating)))
    a4s_over_a2 = 1.0 / max(a2_over_a4s, 1e-12)
    f_m2_oper = f_m2_operating_from_pi_c(
        pi_c_operating,
        a4s_over_a2=a4s_over_a2,
        a4s_over_a8=a4s_over_a8,
        gamma=gamma,
    )
    valid_oper_all = np.isfinite(f_m2_oper) & np.isfinite(pi_c_operating)
    valid_oper = valid_oper_all.copy()
    pi_min_at_fmin = None
    if np.any(valid_oper):
        order = np.argsort(f_m2_oper[valid_oper])
        f_sorted = f_m2_oper[valid_oper][order]
        pi_sorted = pi_c_operating[valid_oper][order]
        pi_min_at_fmin = float(np.interp(f_m2_min, f_sorted, pi_sorted))
        keep = pi_c_operating >= pi_min_at_fmin
        valid_oper = valid_oper & keep
    operating_line = _series_from_mask(f_m2_oper, pi_c_operating, valid_oper)

    operating_meta = {
        "pi_min_at_fmin": float(pi_min_at_fmin) if pi_min_at_fmin is not None else None,
        "f_m2_min": float(f_m2_min),
    }

    f1_lines = []
    for tau_ratio in tau_lines:
        pi_f1 = _pi_c_f1_matching(
            f_m2=f_m2,
            tau_lambda_over_tau_r=float(tau_ratio),
            a2_over_a4s=a2_over_a4s,
            f=fuel_to_air,
            pi_b=pi_b,
        )
        valid_f1 = np.isfinite(pi_f1) & (pi_f1 > 1.0)
        f1_lines.append({
            "tau_ratio": float(tau_ratio),
            **_series_from_mask(f_m2, pi_f1, valid_f1),
        })

    pi_f1_user = _pi_c_f1_matching(
        f_m2=f_m2,
        tau_lambda_over_tau_r=float(tau_user),
        a2_over_a4s=a2_over_a4s,
        f=fuel_to_air,
        pi_b=pi_b,
    )
    valid_f1_user = np.isfinite(pi_f1_user) & (pi_f1_user > 1.0)
    f1_user_line = {
        "tau_ratio": float(tau_user),
        **_series_from_mask(f_m2, pi_f1_user, valid_f1_user),
    }

    speed_lines = []
    for mb in mb_lines:
        tau_cur, psi_cur, _ = _tau_c_strip_model_current(
            f_m2=f_m2,
            mb_corr=mb,
            n_stages=n_stages,
            gamma=gamma,
            alpha2a_deg=alpha2a_deg,
            beta2b_deg=beta2b_deg,
        )
        pi_cur = _pi_c_from_tau_c(tau_cur, gamma=gamma)
        valid_cur = np.isfinite(pi_cur) & (pi_cur > 1.0) & np.isfinite(psi_cur) & (psi_cur > 0.0)
        speed_lines.append({
            "mb_corr": float(mb),
            **_series_from_mask(f_m2, pi_cur, valid_cur),
        })

    tau_user_line, psi_user, _ = _tau_c_strip_model_current(
        f_m2=f_m2,
        mb_corr=mb_user,
        n_stages=n_stages,
        gamma=gamma,
        alpha2a_deg=alpha2a_deg,
        beta2b_deg=beta2b_deg,
    )
    pi_user_line = _pi_c_from_tau_c(tau_user_line, gamma=gamma)
    valid_user_line = np.isfinite(pi_user_line) & (pi_user_line > 1.0) & np.isfinite(psi_user) & (psi_user > 0.0)
    speed_user_line = {
        "mb_corr": float(mb_user),
        **_series_from_mask(f_m2, pi_user_line, valid_user_line),
    }

    intersection = None
    if np.any(valid_f1_user) and np.any(valid_user_line):
        intersection = _intersection_same_grid(f_m2, pi_f1_user, pi_user_line)
        if intersection is not None:
            status_label = "unknown"
            status_color = "#111111"
            if pi_min_at_fmin is not None and np.any(valid_oper):
                order = np.argsort(f_m2_oper[valid_oper])
                f_sorted = f_m2_oper[valid_oper][order]
                pi_sorted = pi_c_operating[valid_oper][order]
                f_int = intersection["f_m2"]
                pi_oper_at_int = float(np.interp(f_int, f_sorted, pi_sorted))
                if intersection["pi_c"] <= pi_oper_at_int:
                    status_label = "viable"
                    status_color = "#3adb76"
                else:
                    status_label = "stalled"
                    status_color = "#ff6b6b"
            intersection.update({
                "status": status_label,
                "status_color": status_color,
            })

    user_mb_oper_intersection = None
    if np.any(valid_user_line) and np.any(valid_oper):
        order = np.argsort(f_m2_oper[valid_oper])
        f_sorted = f_m2_oper[valid_oper][order]
        pi_sorted = pi_c_operating[valid_oper][order]
        oper_interp = np.interp(f_m2, f_sorted, pi_sorted)
        user_mb_oper_intersection = _intersection_same_grid(f_m2, pi_user_line, oper_interp)
        if user_mb_oper_intersection is not None:
            f_int = user_mb_oper_intersection["f_m2"]
            pi_oper_at_int = float(np.interp(f_int, f_sorted, pi_sorted))
            user_mb_oper_intersection.update({
                "pi_oper": pi_oper_at_int,
                "mb_corr": float(mb_user),
            })

    return {
        "series": {
            "operating": operating_line,
            "operating_meta": operating_meta,
            "f1_lines": f1_lines,
            "f1_user": f1_user_line,
            "speed_lines": speed_lines,
            "speed_user": speed_user_line,
            "intersection": intersection,
            "user_mb_oper_intersection": user_mb_oper_intersection,
        },
        "params": {
            "gamma": gamma,
            "n_stages": n_stages,
            "alpha2a_deg": alpha2a_deg,
            "beta2b_deg": beta2b_deg,
            "tau_r": tau_r,
            "t0": t0,
            "f_m2_min": f_m2_min,
            "f_m2_max": f_m2_max_eff,
            "n_f_m2": n_f_m2,
            "mb_corr_min": mb_corr_min,
            "mb_corr_max": mb_corr_max,
            "n_speed_lines": n_speed_lines,
            "mb_user": mb_user,
            "a2_over_a4s": a2_over_a4s,
            "a4s_over_a8": a4s_over_a8,
            "tau_min": tau_min,
            "tau_max": tau_max,
            "n_tau_lines": n_tau_lines,
            "tau_user": tau_user,
            "fuel_to_air": fuel_to_air,
            "pi_b": pi_b,
            "pi_c_operating_min": pi_c_operating_min,
            "pi_c_operating_max": pi_c_operating_max,
            "n_pi_operating": n_pi_operating,
            "has_overrides": True,
        },
        "labels": {
            "x": r"$f(M_2)$",
            "y": r"$\pi_c$",
            "title": "Compressor Map (Strip Model)",
        },
    }


def analysis_strip_model_equations() -> Dict[str, Any]:
    equations = [
        {
            "title": "Mass-flow function f(M)",
            "latex": r"f(M)=\left(\frac{\gamma+1}{2}\right)^{\frac{\gamma+1}{2(\gamma-1)}}\frac{M}{\left(1+\frac{\gamma-1}{2}M^2\right)^{\frac{\gamma+1}{2(\gamma-1)}}}",
        },
        {
            "title": "Flow coefficient phi",
            "latex": r"\phi=\frac{1}{\left(\frac{\gamma+1}{2}\right)^{\frac{\gamma+1}{2(\gamma-1)}}}\frac{f(M_2)}{\left(\frac{M_{b0}}{\sqrt{\tau_r}}\right)}",
        },
        {
            "title": "Stage loading psi",
            "latex": r"\psi=1-\phi\left(\tan\beta_{2b}+\tan\alpha_{2a}\right)",
        },
        {
            "title": "Current tau_c form",
            "latex": r"\tau_c=1+n(\gamma-1)\left(\frac{M_{b0}}{\sqrt{\tau_r}}\right)^2\psi",
        },
        {
            "title": "Explicit tau_c form",
            "latex": r"\tau_c=1+n(\gamma-1)\left(\frac{M_{b0}}{\sqrt{\tau_r}}\right)^2-\frac{n(\gamma-1)}{\left(\frac{\gamma+1}{2}\right)^{\frac{\gamma+1}{2(\gamma-1)}}}\left(\tan\beta_{2b}+\tan\alpha_{2a}\right)\left(\frac{M_{b0}}{\sqrt{\tau_r}}\right)f(M_2)",
        },
        {
            "title": "Pressure ratio from tau_c",
            "latex": r"\pi_c=\tau_c^{\frac{\gamma}{\gamma-1}}",
        },
        {
            "title": "F1 matching line",
            "latex": r"\pi_c=\left(\frac{1+f}{\pi_b}\frac{A_2}{A_4^*}\right)\sqrt{\frac{\tau_\lambda}{\tau_r}}\,f(M_2)",
        },
        {
            "title": "Speed of sound",
            "latex": r"a_0=\sqrt{\gamma R T_0}",
        },
        {
            "title": "Blade speed (normalized)",
            "latex": r"\frac{U_b}{a_0}=\frac{M_{b0}}{\sqrt{\tau_r}}",
        },
        {
            "title": "Axial velocity (normalized)",
            "latex": r"\frac{c_z}{a_0}=\phi\,\frac{M_{b0}}{\sqrt{\tau_r}}",
        },
        {
            "title": "Blade speed (dimensional)",
            "latex": r"U_b=a_0\,\frac{M_{b0}}{\sqrt{\tau_r}}",
        },
        {
            "title": "Axial velocity (dimensional)",
            "latex": r"c_z=a_0\,\phi\,\frac{M_{b0}}{\sqrt{\tau_r}}",
        },
    ]

    return {
        "equations": equations,
        "labels": {
            "title": "Strip-Model Equations",
        },
    }
