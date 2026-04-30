from __future__ import annotations

from typing import Any, Dict, List
import math

try:
    from ..models import FuelDissociationSweepInputs
except ImportError:
    from models import FuelDissociationSweepInputs

from combustion_solver import (
    adiabatic_flame_temperature,
    products_dissociation,
    products_ideal,
    stoich_afr,
    stoich_oxygen_moles,
    air_model_params,
)


ELEMENT_MW = {
    "C": 12.011,
    "H": 1.008,
    "O": 15.999,
    "N": 14.007,
    "Ar": 39.948,
}


def _build_range(min_val: float, max_val: float, step: float) -> list[float]:
    if step <= 0:
        raise ValueError("Step must be positive.")
    if max_val < min_val:
        raise ValueError("Max must be greater than or equal to min.")
    count = int(math.floor((max_val - min_val) / step)) + 1
    return [min_val + idx * step for idx in range(count)]


def _build_log_range(min_val: float, max_val: float, points: int) -> list[float]:
    if min_val <= 0 or max_val <= 0:
        raise ValueError("Log range requires positive bounds.")
    if points < 2:
        raise ValueError("Log range requires at least 2 points.")
    log_min = math.log10(min_val)
    log_max = math.log10(max_val)
    step = (log_max - log_min) / (points - 1)
    return [10 ** (log_min + idx * step) for idx in range(points)]


def _parse_formula(formula: str) -> dict[str, float]:
    import re

    counts: dict[str, float] = {}
    for element, count_str in re.findall(r"([A-Z][a-z]?)(\d*)", formula):
        count = float(count_str) if count_str else 1.0
        counts[element] = counts.get(element, 0.0) + count
    return counts


def _mw_for_species(species: str) -> float | None:
    if species == "C_s":
        return ELEMENT_MW.get("C")
    parts = _parse_formula(species)
    if not parts:
        return None
    total = 0.0
    for element, count in parts.items():
        mw = ELEMENT_MW.get(element)
        if mw is None:
            return None
        total += mw * count
    return total


def _element_totals(species_mol: dict[str, float]) -> dict[str, float]:
    totals = {"C": 0.0, "H": 0.0, "O": 0.0, "N": 0.0}
    for species, mol in species_mol.items():
        if not mol:
            continue
        if species == "C_s":
            totals["C"] += mol
            continue
        parts = _parse_formula(species)
        for element in totals:
            totals[element] += mol * parts.get(element, 0.0)
    return totals


def _reactant_elements(formula: str, phi: float, air_model: str | None) -> dict[str, float]:
    counts = _parse_formula(formula)
    a = stoich_oxygen_moles(formula)
    n2_o2_ratio, _ = air_model_params(air_model)
    air_o2 = a / phi
    air_n2 = air_o2 * n2_o2_ratio
    totals = {"C": 0.0, "H": 0.0, "O": 0.0, "N": 0.0}
    for el in totals:
        totals[el] += counts.get(el, 0.0)
    totals["O"] += air_o2 * 2.0
    totals["N"] += air_n2 * 2.0
    return totals


def _percent_dissociation(ideal: float | None, eq_val: float | None) -> float | None:
    if ideal is None or not math.isfinite(ideal) or ideal <= 0.0:
        return None
    if eq_val is None or not math.isfinite(eq_val):
        return None
    return (ideal - eq_val) / ideal * 100.0


def _mole_fractions(species_mol: dict[str, float]) -> tuple[dict[str, float], float]:
    total = sum(val for val in species_mol.values() if val and val > 0.0)
    if total <= 0.0:
        return {}, 0.0
    return {name: val / total for name, val in species_mol.items() if val and val > 0.0}, total


def _mass_fractions(species_mol: dict[str, float]) -> tuple[dict[str, float], float | None]:
    total_mass = 0.0
    masses: dict[str, float] = {}
    for name, mol in species_mol.items():
        if not mol or mol <= 0.0:
            continue
        mw = _mw_for_species(name)
        if mw is None:
            return {}, None
        mass = mol * mw
        masses[name] = mass
        total_mass += mass
    if total_mass <= 0.0:
        return {}, None
    return {name: mass / total_mass for name, mass in masses.items()}, total_mass


def _sanity_checks(
    *,
    products: dict[str, float],
    reactant_elements: dict[str, float],
) -> dict[str, Any]:
    def to_float(value: float | None) -> float | None:
        if value is None:
            return None
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    def to_bool(value: Any) -> bool | None:
        if value is None:
            return None
        try:
            return bool(value)
        except Exception:
            return None

    element_totals = _element_totals(products)
    element_residuals = {
        key: float(element_totals.get(key, 0.0) - reactant_elements.get(key, 0.0))
        for key in reactant_elements
    }
    element_residual_max = max((abs(val) for val in element_residuals.values()), default=0.0)

    mol_fracs, total_mol = _mole_fractions(products)
    sum_x = sum(mol_fracs.values()) if mol_fracs else (1.0 if total_mol > 0 else None)

    mass_fracs, total_mass = _mass_fractions(products)
    sum_y = sum(mass_fracs.values()) if mass_fracs else (None if total_mass is None else 1.0)

    min_mol = min((val for val in products.values()), default=0.0)
    nonnegative = min_mol >= -1.0e-12

    return {
        "element_residuals": element_residuals,
        "element_residual_max": to_float(element_residual_max),
        "sum_x": to_float(sum_x),
        "sum_y": to_float(sum_y),
        "mass_fraction_available": to_bool(total_mass is not None),
        "min_mol": to_float(min_mol),
        "nonnegative": to_bool(nonnegative),
    }


def _compute_point(
    *,
    formula: str,
    fuel_mw: float,
    phi: float,
    p_pa: float,
    temp_mode: str,
    t_k: float,
    t_fuel_k: float,
    t_air_k: float,
    air_model: str,
    adiabatic_basis: str,
    compare_temp_mode: str,
    compare_t_k: float,
    ideal_cache: dict[tuple[float, float, str], Any],
    eq_cache: dict[tuple[float, float, float, str], Any],
    reactant_cache: dict[float, dict[str, float]],
) -> dict[str, Any]:
    afr_st = stoich_afr(formula, fuel_mw, air_model)
    f_over_a = phi / max(afr_st, 1e-12)

    ideal_temp = None
    eq_temp = None
    compare_temp = None
    diag_eq = None
    diag_ideal = None

    if compare_temp_mode == "fixed":
        compare_temp = compare_t_k
        ideal_temp = compare_t_k
        eq_temp = compare_t_k
    else:
        if adiabatic_basis not in {"equilibrium", "ideal", "user"}:
            raise ValueError("adiabatic_basis must be equilibrium, ideal, or user.")

        if adiabatic_basis in {"equilibrium"}:
            t_ad_eq, _, diag_eq = adiabatic_flame_temperature(
                formula,
                f_over_a,
                fuel_mw,
                t_fuel_k,
                t_air_k,
                p_pa,
                air_model,
                "dissociation",
            )
            eq_temp = t_ad_eq

        if adiabatic_basis in {"ideal"}:
            t_ad_ideal, _, diag_ideal = adiabatic_flame_temperature(
                formula,
                f_over_a,
                fuel_mw,
                t_fuel_k,
                t_air_k,
                p_pa,
                air_model,
                "ideal",
            )
            ideal_temp = t_ad_ideal

        if adiabatic_basis == "equilibrium":
            compare_temp = eq_temp
            ideal_temp = compare_temp
        elif adiabatic_basis == "ideal":
            compare_temp = ideal_temp
            eq_temp = compare_temp
        elif adiabatic_basis == "user":
            compare_temp = compare_t_k
            ideal_temp = compare_temp
            eq_temp = compare_temp
        else:
            compare_temp = None

    if ideal_temp is None or eq_temp is None:
        return {
            "phi": phi,
            "p_pa": p_pa,
            "ideal_temp_k": ideal_temp,
            "eq_temp_k": eq_temp,
            "compare_temp_k": compare_temp,
            "note": "Adiabatic solve failed.",
            "percent": {},
            "ideal": {},
            "equilibrium": {},
            "sanity": {},
            "comparison_consistent": False,
            "adiabatic_diag": {
                "ideal": diag_ideal,
                "equilibrium": diag_eq,
            },
        }

    ideal_result = products_ideal(
        formula,
        f_over_a,
        fuel_mw,
        ideal_temp,
        air_model,
    ) if (phi, ideal_temp, air_model) not in ideal_cache else ideal_cache[(phi, ideal_temp, air_model)]
    ideal_cache[(phi, ideal_temp, air_model)] = ideal_result

    eq_key = (phi, eq_temp, p_pa, air_model)
    eq_result = products_dissociation(
        formula,
        f_over_a,
        fuel_mw,
        eq_temp,
        p_pa,
        air_model,
    ) if eq_key not in eq_cache else eq_cache[eq_key]
    eq_cache[eq_key] = eq_result

    ideal_products = ideal_result.products_mol or {}
    eq_products = eq_result.products_mol or {}

    ideal_co2 = ideal_products.get("CO2", 0.0)
    ideal_h2o = ideal_products.get("H2O", 0.0)
    eq_co2 = eq_products.get("CO2", 0.0)
    eq_h2o = eq_products.get("H2O", 0.0)

    percent = {
        "CO2": _percent_dissociation(ideal_co2, eq_co2),
        "H2O": _percent_dissociation(ideal_h2o, eq_h2o),
    }

    reactant_elements = reactant_cache.get(phi)
    if reactant_elements is None:
        reactant_elements = _reactant_elements(formula, phi, air_model)
        reactant_cache[phi] = reactant_elements
    sanity = _sanity_checks(products=eq_products, reactant_elements=reactant_elements)
    comparison_consistent = compare_temp is not None and abs(ideal_temp - eq_temp) <= 1.0e-6

    return {
        "phi": phi,
        "p_pa": p_pa,
        "ideal_temp_k": ideal_temp,
        "eq_temp_k": eq_temp,
        "compare_temp_k": compare_temp,
        "note": eq_result.note or "",
        "percent": percent,
        "ideal": {
            "CO2": ideal_co2,
            "H2O": ideal_h2o,
        },
        "equilibrium": {
            "CO2": eq_co2,
            "H2O": eq_h2o,
        },
        "sanity": sanity,
        "comparison_consistent": comparison_consistent,
        "adiabatic_diag": {
            "ideal": diag_ideal,
            "equilibrium": diag_eq,
        },
    }


def _empty_matrix(rows: int, cols: int) -> list[list[float | None]]:
    return [[None for _ in range(cols)] for _ in range(rows)]


def fuel_dissociation_sweep(
    inputs: FuelDissociationSweepInputs,
    *,
    fuel_formula: str,
    fuel_mw: float,
) -> Dict[str, Any]:
    if inputs.compare_temp_mode not in {"fixed", "adiabatic"}:
        raise ValueError("compare_temp_mode must be fixed or adiabatic.")
    if inputs.adiabatic_basis not in {"equilibrium", "ideal", "user"}:
        raise ValueError("adiabatic_basis must be equilibrium, ideal, or user.")
    compare_t_k = inputs.compare_t_k if inputs.compare_t_k is not None else inputs.t_k

    ideal_cache: dict[tuple[float, float, str], Any] = {}
    eq_cache: dict[tuple[float, float, float, str], Any] = {}
    reactant_cache: dict[float, dict[str, float]] = {}

    phi_values = _build_range(inputs.phi_min, inputs.phi_max, inputs.phi_step)

    pressure_values = inputs.pressure_values_pa or [101325.0, 5.0 * 101325.0, 10.0 * 101325.0, 30.0 * 101325.0]
    if not pressure_values:
        raise ValueError("Provide at least one pressure for phi sweep.")

    if inputs.p_scale == "log":
        pressure_sweep = _build_log_range(inputs.p_min_pa, inputs.p_max_pa, inputs.p_points)
    else:
        pressure_sweep = _build_range(inputs.p_min_pa, inputs.p_max_pa, inputs.p_step_pa)

    if not inputs.phi_values:
        phi_sweep_values = [0.6, 0.8, 1.0, 1.2, 1.6]
    else:
        phi_sweep_values = inputs.phi_values

    phi_count = len(phi_values)
    pressure_count = len(pressure_values)

    phi_percent_co2 = _empty_matrix(pressure_count, phi_count)
    phi_percent_h2o = _empty_matrix(pressure_count, phi_count)
    phi_ideal_co2 = _empty_matrix(pressure_count, phi_count)
    phi_eq_co2 = _empty_matrix(pressure_count, phi_count)
    phi_ideal_h2o = _empty_matrix(pressure_count, phi_count)
    phi_eq_h2o = _empty_matrix(pressure_count, phi_count)
    phi_compare_temp = _empty_matrix(pressure_count, phi_count)
    phi_eq_temp = _empty_matrix(pressure_count, phi_count)
    phi_ideal_temp = _empty_matrix(pressure_count, phi_count)
    phi_elem_residual = _empty_matrix(pressure_count, phi_count)
    phi_sum_x = _empty_matrix(pressure_count, phi_count)
    phi_sum_y = _empty_matrix(pressure_count, phi_count)
    phi_min_mol = _empty_matrix(pressure_count, phi_count)
    phi_nonnegative = _empty_matrix(pressure_count, phi_count)
    phi_compare_ok = _empty_matrix(pressure_count, phi_count)

    for p_idx, p_pa in enumerate(pressure_values):
        for idx, phi in enumerate(phi_values):
            point = _compute_point(
                formula=fuel_formula,
                fuel_mw=fuel_mw,
                phi=phi,
                p_pa=p_pa,
                temp_mode=inputs.temp_mode,
                t_k=inputs.t_k,
                t_fuel_k=inputs.t_fuel_k,
                t_air_k=inputs.t_air_k,
                air_model=inputs.air_model,
                adiabatic_basis=inputs.adiabatic_basis,
                compare_temp_mode=inputs.compare_temp_mode,
                compare_t_k=compare_t_k,
                ideal_cache=ideal_cache,
                eq_cache=eq_cache,
                reactant_cache=reactant_cache,
            )
            phi_percent_co2[p_idx][idx] = point["percent"].get("CO2")
            phi_percent_h2o[p_idx][idx] = point["percent"].get("H2O")
            phi_ideal_co2[p_idx][idx] = point["ideal"].get("CO2")
            phi_eq_co2[p_idx][idx] = point["equilibrium"].get("CO2")
            phi_ideal_h2o[p_idx][idx] = point["ideal"].get("H2O")
            phi_eq_h2o[p_idx][idx] = point["equilibrium"].get("H2O")
            phi_compare_temp[p_idx][idx] = point.get("compare_temp_k")
            phi_eq_temp[p_idx][idx] = point.get("eq_temp_k")
            phi_ideal_temp[p_idx][idx] = point.get("ideal_temp_k")
            phi_elem_residual[p_idx][idx] = point.get("sanity", {}).get("element_residual_max")
            phi_sum_x[p_idx][idx] = point.get("sanity", {}).get("sum_x")
            phi_sum_y[p_idx][idx] = point.get("sanity", {}).get("sum_y")
            phi_min_mol[p_idx][idx] = point.get("sanity", {}).get("min_mol")
            phi_nonnegative[p_idx][idx] = point.get("sanity", {}).get("nonnegative")
            phi_compare_ok[p_idx][idx] = point.get("comparison_consistent")

    pressure_count_sweep = len(pressure_sweep)
    phi_pick_count = len(phi_sweep_values)

    p_percent_co2 = _empty_matrix(phi_pick_count, pressure_count_sweep)
    p_percent_h2o = _empty_matrix(phi_pick_count, pressure_count_sweep)
    p_ideal_co2 = _empty_matrix(phi_pick_count, pressure_count_sweep)
    p_eq_co2 = _empty_matrix(phi_pick_count, pressure_count_sweep)
    p_ideal_h2o = _empty_matrix(phi_pick_count, pressure_count_sweep)
    p_eq_h2o = _empty_matrix(phi_pick_count, pressure_count_sweep)
    p_compare_temp = _empty_matrix(phi_pick_count, pressure_count_sweep)
    p_eq_temp = _empty_matrix(phi_pick_count, pressure_count_sweep)
    p_ideal_temp = _empty_matrix(phi_pick_count, pressure_count_sweep)
    p_elem_residual = _empty_matrix(phi_pick_count, pressure_count_sweep)
    p_sum_x = _empty_matrix(phi_pick_count, pressure_count_sweep)
    p_sum_y = _empty_matrix(phi_pick_count, pressure_count_sweep)
    p_min_mol = _empty_matrix(phi_pick_count, pressure_count_sweep)
    p_nonnegative = _empty_matrix(phi_pick_count, pressure_count_sweep)
    p_compare_ok = _empty_matrix(phi_pick_count, pressure_count_sweep)

    for phi_idx, phi in enumerate(phi_sweep_values):
        for p_idx, p_pa in enumerate(pressure_sweep):
            point = _compute_point(
                formula=fuel_formula,
                fuel_mw=fuel_mw,
                phi=phi,
                p_pa=p_pa,
                temp_mode=inputs.temp_mode,
                t_k=inputs.t_k,
                t_fuel_k=inputs.t_fuel_k,
                t_air_k=inputs.t_air_k,
                air_model=inputs.air_model,
                adiabatic_basis=inputs.adiabatic_basis,
                compare_temp_mode=inputs.compare_temp_mode,
                compare_t_k=compare_t_k,
                ideal_cache=ideal_cache,
                eq_cache=eq_cache,
                reactant_cache=reactant_cache,
            )
            p_percent_co2[phi_idx][p_idx] = point["percent"].get("CO2")
            p_percent_h2o[phi_idx][p_idx] = point["percent"].get("H2O")
            p_ideal_co2[phi_idx][p_idx] = point["ideal"].get("CO2")
            p_eq_co2[phi_idx][p_idx] = point["equilibrium"].get("CO2")
            p_ideal_h2o[phi_idx][p_idx] = point["ideal"].get("H2O")
            p_eq_h2o[phi_idx][p_idx] = point["equilibrium"].get("H2O")
            p_compare_temp[phi_idx][p_idx] = point.get("compare_temp_k")
            p_eq_temp[phi_idx][p_idx] = point.get("eq_temp_k")
            p_ideal_temp[phi_idx][p_idx] = point.get("ideal_temp_k")
            p_elem_residual[phi_idx][p_idx] = point.get("sanity", {}).get("element_residual_max")
            p_sum_x[phi_idx][p_idx] = point.get("sanity", {}).get("sum_x")
            p_sum_y[phi_idx][p_idx] = point.get("sanity", {}).get("sum_y")
            p_min_mol[phi_idx][p_idx] = point.get("sanity", {}).get("min_mol")
            p_nonnegative[phi_idx][p_idx] = point.get("sanity", {}).get("nonnegative")
            p_compare_ok[phi_idx][p_idx] = point.get("comparison_consistent")

    return {
        "definition": {
            "basis": "Ideal (no dissociation) vs equilibrium",
            "metric": "percent_dissociation = (n_ideal - n_eq) / n_ideal * 100",
            "adiabatic_basis": inputs.adiabatic_basis,
            "compare_temp_mode": inputs.compare_temp_mode,
            "compare_t_k": compare_t_k,
        },
        "inputs": inputs.model_dump(),
        "phi_sweep": {
            "phi_values": phi_values,
            "pressure_values_pa": pressure_values,
            "percent_dissociation": {
                "CO2": phi_percent_co2,
                "H2O": phi_percent_h2o,
            },
            "ideal_amounts": {
                "CO2": phi_ideal_co2,
                "H2O": phi_ideal_h2o,
            },
            "equilibrium_amounts": {
                "CO2": phi_eq_co2,
                "H2O": phi_eq_h2o,
            },
            "temperatures_k": {
                "ideal": phi_ideal_temp,
                "equilibrium": phi_eq_temp,
                "comparison": phi_compare_temp,
            },
            "sanity": {
                "element_residual_max": phi_elem_residual,
                "sum_x": phi_sum_x,
                "sum_y": phi_sum_y,
                "min_mol": phi_min_mol,
                "nonnegative": phi_nonnegative,
                "comparison_consistent": phi_compare_ok,
            },
        },
        "pressure_sweep": {
            "pressure_values_pa": pressure_sweep,
            "phi_values": phi_sweep_values,
            "percent_dissociation": {
                "CO2": p_percent_co2,
                "H2O": p_percent_h2o,
            },
            "ideal_amounts": {
                "CO2": p_ideal_co2,
                "H2O": p_ideal_h2o,
            },
            "equilibrium_amounts": {
                "CO2": p_eq_co2,
                "H2O": p_eq_h2o,
            },
            "temperatures_k": {
                "ideal": p_ideal_temp,
                "equilibrium": p_eq_temp,
                "comparison": p_compare_temp,
            },
            "sanity": {
                "element_residual_max": p_elem_residual,
                "sum_x": p_sum_x,
                "sum_y": p_sum_y,
                "min_mol": p_min_mol,
                "nonnegative": p_nonnegative,
                "comparison_consistent": p_compare_ok,
            },
        },
    }


def fuel_dissociation_single(
    inputs,
    *,
    fuel_formula: str,
    fuel_mw: float,
) -> Dict[str, Any]:
    compare_t_k = inputs.compare_t_k if inputs.compare_t_k is not None else inputs.t_k
    if inputs.compare_temp_mode not in {"fixed", "adiabatic"}:
        raise ValueError("compare_temp_mode must be fixed or adiabatic.")
    if inputs.adiabatic_basis not in {"equilibrium", "ideal", "user"}:
        raise ValueError("adiabatic_basis must be equilibrium, ideal, or user.")

    afr_st = stoich_afr(fuel_formula, fuel_mw, inputs.air_model)
    if inputs.mixture_input_mode == "phi":
        if inputs.phi_input is None or inputs.phi_input <= 0:
            raise ValueError("phi must be positive.")
        phi = float(inputs.phi_input)
    else:
        if inputs.f_over_a <= 0:
            raise ValueError("f must be positive.")
        phi = (inputs.f_over_a / max(1.0 / afr_st, 1e-12))

    ideal_cache: dict[tuple[float, float, str], Any] = {}
    eq_cache: dict[tuple[float, float, float, str], Any] = {}
    reactant_cache: dict[float, dict[str, float]] = {}

    point = _compute_point(
        formula=fuel_formula,
        fuel_mw=fuel_mw,
        phi=phi,
        p_pa=inputs.p_pa,
        temp_mode=inputs.compare_temp_mode,
        t_k=inputs.t_k,
        t_fuel_k=inputs.t_fuel_k,
        t_air_k=inputs.t_air_k,
        air_model=inputs.air_model,
        adiabatic_basis=inputs.adiabatic_basis,
        compare_temp_mode=inputs.compare_temp_mode,
        compare_t_k=compare_t_k,
        ideal_cache=ideal_cache,
        eq_cache=eq_cache,
        reactant_cache=reactant_cache,
    )

    ideal_co2 = point.get("ideal", {}).get("CO2")
    ideal_h2o = point.get("ideal", {}).get("H2O")
    eq_co2 = point.get("equilibrium", {}).get("CO2")
    eq_h2o = point.get("equilibrium", {}).get("H2O")

    retained_co2 = None if ideal_co2 in (None, 0.0) else (eq_co2 / ideal_co2 * 100.0)
    retained_h2o = None if ideal_h2o in (None, 0.0) else (eq_h2o / ideal_h2o * 100.0)

    return {
        "definition": {
            "basis": "Ideal (no dissociation) vs equilibrium at same T",
            "compare_temp_mode": inputs.compare_temp_mode,
            "compare_t_k": point.get("compare_temp_k"),
            "adiabatic_basis": inputs.adiabatic_basis,
        },
        "inputs": inputs.model_dump(),
        "phi": phi,
        "p_pa": inputs.p_pa,
        "compare_temp_k": point.get("compare_temp_k"),
        "ideal_amounts": {
            "CO2": ideal_co2,
            "H2O": ideal_h2o,
        },
        "equilibrium_amounts": {
            "CO2": eq_co2,
            "H2O": eq_h2o,
        },
        "percent_dissociation": point.get("percent"),
        "percent_retained": {
            "CO2": retained_co2,
            "H2O": retained_h2o,
        },
        "sanity": point.get("sanity"),
    }
