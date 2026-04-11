from __future__ import annotations

from typing import Any, Dict
import math

import numpy as np

try:
    from ..matching import f_m2_operating_from_pi_c
except ImportError:
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


def _station_f_m2(state: Dict[str, Any]) -> float | None:
    table = state.get("station_table_raw")
    if table is None:
        return None
    try:
        if hasattr(table, "columns") and "station" in table.columns and "f(M)" in table.columns:
            station_col = table["station"].astype(str)
            matches = table.loc[station_col == "2", "f(M)"]
            if getattr(matches, "empty", False):
                return None
            if len(matches) > 0:
                return _clean_value(matches.iloc[0])
    except Exception:
        pass
    if isinstance(table, dict):
        rows = table.get("rows")
        if isinstance(rows, list):
            for row in rows:
                if str(row.get("station")) == "2":
                    return _clean_value(row.get("f(M)"))
    if isinstance(table, list):
        for row in table:
            if isinstance(row, dict) and str(row.get("station")) == "2":
                return _clean_value(row.get("f(M)"))
    return None


def _series_from_mask(x: np.ndarray, y: np.ndarray, mask: np.ndarray) -> Dict[str, list[float]]:
    if not np.any(mask):
        return {"x": [], "y": []}
    return {
        "x": [float(val) for val in x[mask]],
        "y": [float(val) for val in y[mask]],
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


def _mb_corr_from_f_tau(
    f_m2: float,
    tau_c: float,
    gamma: float,
    n_stages: float,
    alpha2a_deg: float,
    beta2b_deg: float,
) -> float | None:
    if not math.isfinite(f_m2) or not math.isfinite(tau_c):
        return None
    if f_m2 <= 0.0 or tau_c <= 1.0:
        return None

    g = float(gamma)
    a_term = float(n_stages) * (g - 1.0)
    if a_term <= 0.0:
        return None

    k = ((g + 1.0) / 2.0) ** ((g + 1.0) / (2.0 * (g - 1.0)))
    tana = math.tan(math.radians(alpha2a_deg))
    tanb = math.tan(math.radians(beta2b_deg))
    b_term = (f_m2 * (tanb + tana)) / max(k, 1e-12)

    disc = b_term * b_term - 4.0 * (1.0 - tau_c) / max(a_term, 1e-12)
    if disc < 0.0:
        return None
    root = math.sqrt(disc)
    mb1 = 0.5 * (b_term + root)
    mb2 = 0.5 * (b_term - root)
    candidates = [mb for mb in (mb1, mb2) if mb > 0.0 and math.isfinite(mb)]
    if not candidates:
        return None
    return max(candidates)


def _intersection_f1_oper(f_m2: np.ndarray, pi_f1: np.ndarray, f_oper: np.ndarray, pi_oper: np.ndarray):
    if f_oper.size < 2:
        return None
    order = np.argsort(f_oper)
    f_sorted = f_oper[order]
    pi_sorted = pi_oper[order]
    if f_sorted.size < 2:
        return None

    mask = np.isfinite(f_m2) & np.isfinite(pi_f1)
    mask = mask & (f_m2 >= f_sorted[0]) & (f_m2 <= f_sorted[-1])
    if not np.any(mask):
        return None

    f_masked = f_m2[mask]
    pi_f1_masked = pi_f1[mask]
    pi_oper_interp = np.interp(f_masked, f_sorted, pi_sorted)
    diff = pi_f1_masked - pi_oper_interp
    if diff.size < 2:
        return None

    sign_changes = np.where(np.sign(diff[1:]) != np.sign(diff[:-1]))[0]
    if sign_changes.size == 0:
        return None

    i0 = int(sign_changes[0])
    i1 = i0 + 1
    x0, x1 = float(f_masked[i0]), float(f_masked[i1])
    y0, y1 = float(diff[i0]), float(diff[i1])
    t = 0.0 if y1 == y0 else -y0 / (y1 - y0)
    f_int = x0 + t * (x1 - x0)
    pi_int = float(np.interp(f_int, f_masked, pi_f1_masked))
    return {
        "f_m2": float(f_int),
        "pi_c": float(pi_int),
    }


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


def strip_model_from_mk1(
    state: Dict[str, Any],
    inputs: Dict[str, Any],
    overrides: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    overrides = overrides or {}
    has_overrides = any(val is not None for val in overrides.values())

    def _float_override(key: str, default: float) -> float:
        value = overrides.get(key, None)
        if value is None:
            return float(default)
        clean = _clean_value(value)
        return float(clean) if clean is not None else float(default)

    def _int_override(key: str, default: int) -> int:
        value = overrides.get(key, None)
        if value is None:
            return int(default)
        clean = _clean_value(value)
        return int(round(clean)) if clean is not None else int(default)

    mk1_gamma = float(inputs.get("gamma", 1.4))
    gamma = _float_override("gamma", mk1_gamma)
    t0 = _float_override("t0", float(inputs.get("T0", 288.15)))
    r_value = float(inputs.get("R", 287.0))
    f_fuel = _float_override("fuel_to_air", float(inputs.get("f_fuel", 0.02)))
    pi_b = _float_override("pi_b", float(inputs.get("pi_b", 0.95)))

    tau_r_state = _clean_value(state.get("tau_r"))
    if tau_r_state is None:
        m0 = float(inputs.get("M0", 0.0))
        tau_r_state = 1.0 + 0.5 * (mk1_gamma - 1.0) * m0 * m0
    tau_r = _float_override("tau_r", float(tau_r_state))

    tau_lambda_state = _clean_value(state.get("tau_lambda"))
    if tau_lambda_state is None:
        t0_val = float(inputs.get("T0", 288.15))
        tt4_val = float(inputs.get("Tt4", t0_val))
        tau_lambda_state = tt4_val / max(t0_val, 1e-9)

    tau_user_default = float(tau_lambda_state / tau_r_state) if tau_r_state else 6.0
    tau_user = _float_override("tau_user", tau_user_default)

    a4s = _clean_value(state.get("A4s")) or 1.0
    a2 = float(inputs.get("A2", 14.0))
    a8 = float(inputs.get("A8", 4.0))

    a2_over_a4s_default = a2 / max(a4s, 1e-9)
    a4s_over_a8_default = a4s / max(a8, 1e-9)
    mk1_a2_over_a4s = a2_over_a4s_default
    mk1_a4s_over_a8 = a4s_over_a8_default
    a2_over_a4s = _float_override("a2_over_a4s", a2_over_a4s_default)
    a4s_over_a8 = _float_override("a4s_over_a8", a4s_over_a8_default)

    n_stages = _float_override("n_stages", 8.0)
    alpha2a_deg = _float_override("alpha2a_deg", 10.0)
    beta2b_deg = _float_override("beta2b_deg", 60.0)

    f_m2_min = _float_override("f_m2_min", 0.15)
    f_m2_max = _float_override("f_m2_max", 0.95)
    n_f_m2 = _int_override("n_f_m2", 220)
    mb_corr_min = _float_override("mb_corr_min", 0.50)
    mb_corr_max = _float_override("mb_corr_max", 1.20)
    n_speed_lines = _int_override("n_speed_lines", 8)
    mb_user = _float_override("mb_user", 0.85)

    tau_min_default = 3.0
    tau_max_default = 9.0
    tau_min = _float_override("tau_min", tau_min_default)
    tau_max = _float_override("tau_max", tau_max_default)
    if tau_user < tau_min:
        tau_min = max(1.2, tau_user * 0.8)
    if tau_user > tau_max:
        tau_max = max(tau_user * 1.1, tau_min + 0.5)
    n_tau_lines = _int_override("n_tau_lines", 6)

    pi_c_operating_min = _float_override("pi_c_operating_min", 1.01)
    pi_c_operating_max = _float_override("pi_c_operating_max", 40.0)
    n_pi_operating = _int_override("n_pi_operating", 300)

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
    f_m2_mk1 = _clean_value(state.get("f_M2"))
    if f_m2_mk1 is None:
        f_m2_mk1 = _station_f_m2(state)
    mk1_oper_point = None
    mk1_operating_line = None
    mk1_oper_mb_line = None
    pi_oper_at_mk1 = None
    f_m2_oper_mk1 = None
    valid_oper_mk1 = None
    a4s_over_a2_mk1 = 1.0 / max(mk1_a2_over_a4s, 1e-12)
    f_m2_oper_mk1 = f_m2_operating_from_pi_c(
        pi_c_operating,
        a4s_over_a2=a4s_over_a2_mk1,
        a4s_over_a8=mk1_a4s_over_a8,
        gamma=mk1_gamma,
    )
    valid_oper_mk1 = np.isfinite(f_m2_oper_mk1) & np.isfinite(pi_c_operating)
    mk1_operating_line = _series_from_mask(f_m2_oper_mk1, pi_c_operating, valid_oper_mk1)
    if np.any(valid_oper_all):
        order = np.argsort(f_m2_oper_mk1[valid_oper_mk1])
        f_sorted = f_m2_oper_mk1[valid_oper_mk1][order]
        pi_sorted = pi_c_operating[valid_oper_mk1][order]
        if f_sorted.size > 1 and f_m2_mk1 is not None:
            f_clamped = float(np.clip(f_m2_mk1, f_sorted[0], f_sorted[-1]))
            mk1_oper_point = {
                "f_m2": f_clamped,
                "f_m2_raw": float(f_m2_mk1),
                "pi_c": float(np.interp(f_clamped, f_sorted, pi_sorted)),
            }

    if f_m2_mk1 is not None and np.any(valid_oper):
        order = np.argsort(f_m2_oper[valid_oper])
        f_sorted = f_m2_oper[valid_oper][order]
        pi_sorted = pi_c_operating[valid_oper][order]
        if f_sorted.size > 1:
            f_clamped = float(np.clip(f_m2_mk1, f_sorted[0], f_sorted[-1]))
            pi_oper_at_mk1 = float(np.interp(f_clamped, f_sorted, pi_sorted))

    if mk1_oper_point is not None and f_m2_mk1 is not None:
        pi_c_oper_mk1 = mk1_oper_point.get("pi_c")
        if pi_c_oper_mk1 is not None and pi_c_oper_mk1 > 1.0:
            tau_c_oper_mk1 = pi_c_oper_mk1 ** ((mk1_gamma - 1.0) / mk1_gamma)
            mb_oper_mk1 = _mb_corr_from_f_tau(
                f_m2=f_m2_mk1,
                tau_c=tau_c_oper_mk1,
                gamma=mk1_gamma,
                n_stages=8.0,
                alpha2a_deg=10.0,
                beta2b_deg=60.0,
            )
            if mb_oper_mk1 is not None:
                f_min_mk1 = max(0.01, min(f_m2_min, f_m2_mk1 * 0.8))
                f_max_mk1 = min(1.0, max(f_m2_max_eff, f_m2_mk1 * 1.2))
                if f_max_mk1 <= f_min_mk1:
                    f_max_mk1 = min(1.0, f_min_mk1 + 0.05)
                f_m2_mk1_oper_grid = np.linspace(f_min_mk1, f_max_mk1, int(max(30, n_f_m2)))
                tau_oper_line, psi_oper_line, _ = _tau_c_strip_model_current(
                    f_m2=f_m2_mk1_oper_grid,
                    mb_corr=mb_oper_mk1,
                    n_stages=8.0,
                    gamma=mk1_gamma,
                    alpha2a_deg=10.0,
                    beta2b_deg=60.0,
                )
                pi_oper_line = _pi_c_from_tau_c(tau_oper_line, gamma=mk1_gamma)
                valid_oper_line = np.isfinite(pi_oper_line) & (pi_oper_line > 1.0) & np.isfinite(psi_oper_line) & (psi_oper_line > 0.0)
                mk1_oper_mb_line = {
                    "mb_corr": float(mb_oper_mk1),
                    **_series_from_mask(f_m2_mk1_oper_grid, pi_oper_line, valid_oper_line),
                }

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
            f=f_fuel,
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
        f=f_fuel,
        pi_b=pi_b,
    )
    valid_f1_user = np.isfinite(pi_f1_user) & (pi_f1_user > 1.0)
    f1_user_line = {
        "tau_ratio": float(tau_user),
        **_series_from_mask(f_m2, pi_f1_user, valid_f1_user),
    }

    mk1_f1_line = None
    pi_f1_mk1 = None
    valid_f1_mk1 = None
    tau_user_mk1 = float(tau_user_default)
    pi_f1_mk1 = _pi_c_f1_matching(
        f_m2=f_m2,
        tau_lambda_over_tau_r=tau_user_mk1,
        a2_over_a4s=mk1_a2_over_a4s,
        f=float(inputs.get("f_fuel", 0.02)),
        pi_b=float(inputs.get("pi_b", 0.95)),
    )
    valid_f1_mk1 = np.isfinite(pi_f1_mk1) & (pi_f1_mk1 > 1.0)
    mk1_f1_line = {
        "tau_ratio": tau_user_mk1,
        **_series_from_mask(f_m2, pi_f1_mk1, valid_f1_mk1),
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

    user_mb_oper_intersection = None
    if np.any(valid_user_line) and np.any(valid_oper):
        user_mb_oper_intersection = _intersection_f1_oper(
            f_m2,
            pi_user_line,
            f_m2_oper[valid_oper],
            pi_c_operating[valid_oper],
        )
        if user_mb_oper_intersection is not None:
            f_int = user_mb_oper_intersection["f_m2"]
            order = np.argsort(f_m2_oper[valid_oper])
            f_sorted = f_m2_oper[valid_oper][order]
            pi_sorted = pi_c_operating[valid_oper][order]
            pi_oper_at_int = float(np.interp(f_int, f_sorted, pi_sorted))
            user_mb_oper_intersection.update({
                "pi_oper": pi_oper_at_int,
                "mb_corr": float(mb_user),
            })

    intersection = None
    if np.any(valid_f1_user) and np.any(valid_user_line):
        diff = np.full_like(f_m2, np.nan, dtype=float)
        valid_intersection = valid_f1_user & valid_user_line
        diff[valid_intersection] = pi_f1_user[valid_intersection] - pi_user_line[valid_intersection]
        finite_idx = np.where(np.isfinite(diff))[0]
        if finite_idx.size > 1:
            sign_changes = finite_idx[np.where(np.sign(diff[finite_idx][1:]) != np.sign(diff[finite_idx][:-1]))[0]]
            if sign_changes.size > 0:
                i0 = sign_changes[0]
                i1 = i0 + 1
                x0, x1 = f_m2[i0], f_m2[i1]
                y0, y1 = diff[i0], diff[i1]
                t = 0.0 if y1 == y0 else -y0 / (y1 - y0)
                f_int = float(x0 + t * (x1 - x0))
                pi_int = float(np.interp(f_int, f_m2, pi_f1_user))

                k_int = ((gamma + 1.0) / 2.0) ** ((gamma + 1.0) / (2.0 * (gamma - 1.0)))
                if mb_user > 0.0:
                    phi_int = f_int / (k_int * mb_user)
                    u_blade = mb_user
                    c_z = phi_int * u_blade
                else:
                    u_blade = float("nan")
                    c_z = float("nan")

                a0 = math.sqrt(max(0.0, gamma * r_value * t0))
                u_blade_dim = u_blade * a0
                c_z_dim = c_z * a0

                status_label = "unknown"
                status_color = "#111111"
                if pi_min_at_fmin is not None and np.any(valid_oper):
                    order = np.argsort(f_m2_oper[valid_oper])
                    f_sorted = f_m2_oper[valid_oper][order]
                    pi_sorted = pi_c_operating[valid_oper][order]
                    pi_oper_at_int = float(np.interp(f_int, f_sorted, pi_sorted))
                    if pi_int <= pi_oper_at_int:
                        status_label = "viable"
                        status_color = "#3adb76"
                    else:
                        status_label = "stalled"
                        status_color = "#ff6b6b"

                intersection = {
                    "f_m2": f_int,
                    "pi_c": pi_int,
                    "c_z": c_z_dim,
                    "u_blade": u_blade_dim,
                    "status": status_label,
                    "status_color": status_color,
                }

    mk1_intersection = None

    mk1_mb_intersection = None
    mk1_tau_mb_oper_point = None
    mk1_tau_mb_oper_mb_line = None
    if pi_f1_mk1 is not None and pi_user_line is not None:
        mk1_mb_intersection = _intersection_same_grid(
            f_m2,
            pi_f1_mk1,
            pi_user_line,
        )
        if mk1_mb_intersection is not None and np.any(valid_oper):
            f_int = mk1_mb_intersection["f_m2"]
            order = np.argsort(f_m2_oper[valid_oper])
            f_sorted = f_m2_oper[valid_oper][order]
            pi_sorted = pi_c_operating[valid_oper][order]
            if f_sorted.size > 1:
                f_clamped = float(np.clip(f_int, f_sorted[0], f_sorted[-1]))
                pi_oper_at_int = float(np.interp(f_clamped, f_sorted, pi_sorted))
                mk1_tau_mb_oper_point = {
                    "f_m2": f_clamped,
                    "f_m2_raw": float(f_int),
                    "pi_c": pi_oper_at_int,
                    "pi_oper": pi_oper_at_int,
                }
                if pi_oper_at_int > 1.0:
                    tau_c_oper_int = pi_oper_at_int ** ((mk1_gamma - 1.0) / mk1_gamma)
                    mb_oper_int = _mb_corr_from_f_tau(
                        f_m2=f_clamped,
                        tau_c=tau_c_oper_int,
                        gamma=mk1_gamma,
                        n_stages=8.0,
                        alpha2a_deg=10.0,
                        beta2b_deg=60.0,
                    )
                    if mb_oper_int is not None:
                        mk1_tau_mb_oper_point["mb_corr"] = float(mb_oper_int)
                        f_min_int = max(0.01, min(f_m2_min, f_clamped * 0.8))
                        f_max_int = min(1.0, max(f_m2_max_eff, f_clamped * 1.2))
                        if f_max_int <= f_min_int:
                            f_max_int = min(1.0, f_min_int + 0.05)
                        f_m2_int_grid = np.linspace(f_min_int, f_max_int, int(max(30, n_f_m2)))
                        tau_int_line, psi_int_line, _ = _tau_c_strip_model_current(
                            f_m2=f_m2_int_grid,
                            mb_corr=mb_oper_int,
                            n_stages=8.0,
                            gamma=mk1_gamma,
                            alpha2a_deg=10.0,
                            beta2b_deg=60.0,
                        )
                        pi_int_line = _pi_c_from_tau_c(tau_int_line, gamma=mk1_gamma)
                        valid_int_line = np.isfinite(pi_int_line) & (pi_int_line > 1.0) & np.isfinite(psi_int_line) & (psi_int_line > 0.0)
                        mk1_tau_mb_oper_mb_line = {
                            "mb_corr": float(mb_oper_int),
                            **_series_from_mask(f_m2_int_grid, pi_int_line, valid_int_line),
                        }

    mk1_tau_mb_point = None
    mk1_mb_line = None
    mk1_mb_oper_intersection = None
    mk1_tau_point = None
    if f_m2_mk1 is not None:
        tau_status_label = None
        tau_status_color = None
        pi_c_tau_mk1 = _pi_c_f1_matching(
            f_m2=f_m2_mk1,
            tau_lambda_over_tau_r=tau_user_mk1,
            a2_over_a4s=mk1_a2_over_a4s,
            f=float(inputs.get("f_fuel", 0.02)),
            pi_b=float(inputs.get("pi_b", 0.95)),
        )
        pi_c_tau_mk1 = float(pi_c_tau_mk1) if math.isfinite(float(pi_c_tau_mk1)) else None
        if pi_c_tau_mk1 is not None:
            if pi_oper_at_mk1 is not None:
                tau_status_label = "viable" if pi_c_tau_mk1 <= pi_oper_at_mk1 else "stalled"
                tau_status_color = "#3adb76" if tau_status_label == "viable" else "#ff6b6b"
            f_tau_clamped = float(np.clip(f_m2_mk1, f_m2_min, f_m2_max_eff))
            mk1_tau_point = {
                "f_m2": f_tau_clamped,
                "f_m2_raw": float(f_m2_mk1),
                "pi_c": float(pi_c_tau_mk1),
                "pi_oper": pi_oper_at_mk1,
                "status": tau_status_label,
                "status_color": tau_status_color,
            }
        if pi_c_tau_mk1 is not None and pi_c_tau_mk1 > 1.0:
            tau_c_tau_mk1 = pi_c_tau_mk1 ** ((mk1_gamma - 1.0) / mk1_gamma)
            mb_mk1 = _mb_corr_from_f_tau(
                f_m2=f_m2_mk1,
                tau_c=tau_c_tau_mk1,
                gamma=mk1_gamma,
                n_stages=8.0,
                alpha2a_deg=10.0,
                beta2b_deg=60.0,
            )
            if mb_mk1 is not None:
                f_min_mk1 = max(0.01, min(f_m2_min, f_m2_mk1 * 0.8))
                f_max_mk1 = min(1.0, max(f_m2_max_eff, f_m2_mk1 * 1.2))
                if f_max_mk1 <= f_min_mk1:
                    f_max_mk1 = min(1.0, f_min_mk1 + 0.05)
                f_m2_mk1_grid = np.linspace(f_min_mk1, f_max_mk1, int(max(30, n_f_m2)))
                tau_mk1_line, psi_mk1_line, _ = _tau_c_strip_model_current(
                    f_m2=f_m2_mk1_grid,
                    mb_corr=mb_mk1,
                    n_stages=8.0,
                    gamma=mk1_gamma,
                    alpha2a_deg=10.0,
                    beta2b_deg=60.0,
                )
                pi_mk1_line = _pi_c_from_tau_c(tau_mk1_line, gamma=mk1_gamma)
                valid_mk1_line = np.isfinite(pi_mk1_line) & (pi_mk1_line > 1.0) & np.isfinite(psi_mk1_line) & (psi_mk1_line > 0.0)
                mk1_mb_line = {
                    "mb_corr": float(mb_mk1),
                    **_series_from_mask(f_m2_mk1_grid, pi_mk1_line, valid_mk1_line),
                }
                mk1_tau_mb_point = {
                    "f_m2": float(f_m2_mk1),
                    "pi_c": float(pi_c_tau_mk1),
                    "mb_corr": float(mb_mk1),
                }
                mk1_intersection = {
                    "f_m2": float(f_m2_mk1),
                    "pi_c": float(pi_c_tau_mk1),
                    "mb_corr": float(mb_mk1),
                    "pi_oper": pi_oper_at_mk1,
                    "status": tau_status_label,
                    "status_color": tau_status_color,
                }
                if np.any(valid_oper) and np.any(valid_mk1_line):
                    mk1_mb_oper_intersection = _intersection_f1_oper(
                        f_m2_mk1_grid,
                        pi_mk1_line,
                        f_m2_oper[valid_oper],
                        pi_c_operating[valid_oper],
                    )
                    if mk1_mb_oper_intersection is not None:
                        f_int = mk1_mb_oper_intersection["f_m2"]
                        order = np.argsort(f_m2_oper[valid_oper])
                        f_sorted = f_m2_oper[valid_oper][order]
                        pi_sorted = pi_c_operating[valid_oper][order]
                        pi_oper_at_int = float(np.interp(f_int, f_sorted, pi_sorted))
                        status_label = "viable" if mk1_mb_oper_intersection["pi_c"] <= pi_oper_at_int else "stalled"
                        status_color = "#3adb76" if status_label == "viable" else "#ff6b6b"
                        mk1_mb_oper_intersection.update({
                            "pi_oper": pi_oper_at_int,
                            "status": status_label,
                            "status_color": status_color,
                        })

    mk1_point = None
    f_m2_mk1 = _clean_value(state.get("f_M2"))
    pi_c_mk1 = _clean_value(state.get("pi_c"))
    if f_m2_mk1 is not None and pi_c_mk1 is not None:
        status_label = "unknown"
        status_color = "#111111"
        pi_oper_at_mk1 = None
        if np.any(valid_oper):
            order = np.argsort(f_m2_oper[valid_oper])
            f_sorted = f_m2_oper[valid_oper][order]
            pi_sorted = pi_c_operating[valid_oper][order]
            pi_oper_at_mk1 = float(np.interp(f_m2_mk1, f_sorted, pi_sorted))
            if pi_c_mk1 <= pi_oper_at_mk1:
                status_label = "viable"
                status_color = "#3adb76"
            else:
                status_label = "stalled"
                status_color = "#ff6b6b"
        mk1_point = {
            "f_m2": float(f_m2_mk1),
            "pi_c": float(pi_c_mk1),
            "pi_oper": pi_oper_at_mk1,
            "status": status_label,
            "status_color": status_color,
        }

    mk1_tau_min = float(tau_min_default)
    mk1_tau_max = float(tau_max_default)
    if tau_user_default < mk1_tau_min:
        mk1_tau_min = max(1.2, tau_user_default * 0.8)
    if tau_user_default > mk1_tau_max:
        mk1_tau_max = max(tau_user_default * 1.1, mk1_tau_min + 0.5)

    mk1_params = {
        "gamma": mk1_gamma,
        "n_stages": 8.0,
        "alpha2a_deg": 10.0,
        "beta2b_deg": 60.0,
        "tau_r": float(tau_r_state),
        "t0": float(inputs.get("T0", 288.15)),
        "f_m2_min": 0.15,
        "f_m2_max": min(0.95, 1.0),
        "n_f_m2": 220,
        "mb_corr_min": 0.50,
        "mb_corr_max": 1.20,
        "n_speed_lines": 8,
        "mb_user": 0.85,
        "a2_over_a4s": mk1_a2_over_a4s,
        "a4s_over_a8": mk1_a4s_over_a8,
        "tau_min": mk1_tau_min,
        "tau_max": mk1_tau_max,
        "n_tau_lines": 6,
        "tau_user": tau_user_default,
        "fuel_to_air": float(inputs.get("f_fuel", 0.02)),
        "pi_b": float(inputs.get("pi_b", 0.95)),
        "pi_c_operating_min": 1.01,
        "pi_c_operating_max": 40.0,
        "n_pi_operating": 300,
        "has_overrides": False,
    }

    return {
        "series": {
            "operating": operating_line,
            "mk1_operating": mk1_operating_line,
            "mk1_oper_point": mk1_oper_point,
            "operating_meta": operating_meta,
            "f1_lines": f1_lines,
            "f1_user": f1_user_line,
            "mk1_f1": mk1_f1_line,
            "speed_lines": speed_lines,
            "speed_user": speed_user_line,
            "mk1_oper_mb_line": mk1_oper_mb_line,
            "mk1_mb_line": mk1_mb_line,
            "mk1_tau_mb_oper_point": mk1_tau_mb_oper_point,
            "mk1_tau_mb_oper_mb_line": mk1_tau_mb_oper_mb_line,
            "intersection": intersection,
            "user_mb_oper_intersection": user_mb_oper_intersection,
            "mk1_intersection": mk1_intersection,
            "mk1_mb_intersection": mk1_mb_intersection,
            "mk1_mb_oper_intersection": mk1_mb_oper_intersection,
            "mk1_tau_mb_point": mk1_tau_mb_point,
                "mk1_tau_point": mk1_tau_point,
            "mk1_point": mk1_point,
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
            "fuel_to_air": f_fuel,
            "pi_b": pi_b,
            "pi_c_operating_min": pi_c_operating_min,
            "pi_c_operating_max": pi_c_operating_max,
            "n_pi_operating": n_pi_operating,
            "has_overrides": has_overrides,
        },
        "mk1_params": mk1_params,
        "labels": {
            "x": r"$f(M_2)$",
            "y": r"$\pi_c$",
            "title": "Compressor Map (Strip Model)",
        },
    }
