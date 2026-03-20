from __future__ import annotations

from typing import Any, Dict
import math

import numpy as np


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


def ideal_tau_sweeps_from_mk1(state: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
    gamma = float(inputs.get("gamma", 1.4))
    m0 = float(inputs.get("M0", 0.0))
    t0 = float(inputs.get("T0", 288.15))
    cp = float(inputs.get("cp", 1004.0))
    lhv = float(inputs.get("lhv", 43e6))
    eta_b = float(inputs.get("eta_b", 1.0))

    tau_r_ref = _clean_value(state.get("tau_r"))
    if tau_r_ref is None:
        tau_r_ref = 1.0 + 0.5 * (gamma - 1.0) * m0 * m0

    tau_c_ref = _clean_value(state.get("tau_c"))
    if tau_c_ref is None:
        tau_c_ref = 1.0

    tau_lambda = _clean_value(state.get("tau_lambda"))
    if tau_lambda is None:
        tt4 = float(inputs.get("Tt4", t0))
        tau_lambda = tt4 / max(t0, 1e-9)

    tau_f = (lhv * eta_b) / max(cp * t0, 1e-9)

    tau_c_min = 1.05
    tau_c_max = max(40.0, tau_c_ref * 1.5)
    tau_r_min = 1.05
    tau_r_max = max(3.0, min(6.0, tau_r_ref * 1.5))
    npts = 400

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
            "tau_r_ref": tau_r_ref,
            "tau_c_ref": tau_c_ref,
            "tau_lambda": tau_lambda,
            "tau_f": tau_f,
            "gamma": gamma,
            "tau_c_min": tau_c_min,
            "tau_c_max": tau_c_max,
            "tau_r_min": tau_r_min,
            "tau_r_max": tau_r_max,
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
