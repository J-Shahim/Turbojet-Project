from __future__ import annotations

from typing import Any, Dict
import math

try:
    from ..models import FuelXiMapInputs
except ImportError:
    from models import FuelXiMapInputs
from combustion_solver import (
    adiabatic_flame_temperature,
    products_ideal,
    products_dissociation,
    stoich_afr,
)


def _build_range(min_val: float, max_val: float, step: float) -> list[float]:
    if step <= 0:
        raise ValueError("Step must be positive.")
    if max_val < min_val:
        raise ValueError("Max must be greater than or equal to min.")
    count = int(math.floor((max_val - min_val) / step)) + 1
    return [min_val + idx * step for idx in range(count)]

def _compute_series(
    *,
    mode: str,
    phi_values: list[float],
    t_k: float,
    f_over_a_st: float,
    fuel_formula: str,
    fuel_mw: float,
    air_model: str,
    p_pa: float,
    min_mol: float,
    species_filters: list[str],
) -> dict[str, Any]:
    series = {species: [] for species in species_filters}
    note = None

    for phi in phi_values:
        f_over_a = phi * f_over_a_st
        if mode == "ideal":
            result = products_ideal(
                fuel_formula,
                f_over_a,
                fuel_mw,
                t_k,
                air_model,
            )
        else:
            result = products_dissociation(
                fuel_formula,
                f_over_a,
                fuel_mw,
                t_k,
                p_pa,
                air_model,
            )
        if result.note and note is None:
            note = result.note
        products = result.products_mol or {}
        total_mol = sum(val for val in products.values() if val and val > 0.0)
        for species in species_filters:
            if total_mol <= 0.0:
                series[species].append(None)
                continue
            mol = products.get(species, 0.0)
            if mol < min_mol:
                series[species].append(0.0)
                continue
            series[species].append(mol / total_mol)

    return {
        "species": species_filters,
        "phi": phi_values,
        "xi": series,
        "t_k": t_k,
        "note": note,
    }


def fuel_xi_map(inputs: FuelXiMapInputs, *, fuel_formula: str, fuel_mw: float) -> Dict[str, Any]:
    if not inputs.species:
        raise ValueError("Provide at least one species to compute a Xi map.")
    species_filters = [str(name) for name in inputs.species if str(name).strip()]
    if not species_filters:
        raise ValueError("Provide at least one species to compute a Xi map.")
    phi_values = _build_range(inputs.phi_min, inputs.phi_max, inputs.phi_step)

    if len(phi_values) > inputs.max_points:
        raise ValueError("Requested phi grid exceeds max_points. Increase step size or raise max_points.")

    afr_st = stoich_afr(fuel_formula, fuel_mw, inputs.air_model)
    f_over_a_st = 1.0 / max(afr_st, 1e-12)

    payload: dict[str, Any] = {"min_mol": inputs.min_mol, "t_k": inputs.t_k}

    if inputs.include_ideal:
        payload["ideal"] = _compute_series(
            mode="ideal",
            phi_values=phi_values,
            t_k=inputs.t_k,
            f_over_a_st=f_over_a_st,
            fuel_formula=fuel_formula,
            fuel_mw=fuel_mw,
            air_model=inputs.air_model,
            p_pa=inputs.p_pa,
            min_mol=inputs.min_mol,
            species_filters=species_filters,
        )

    tad_phi = phi_values

    def compute_tad_series(mode: str) -> tuple[list[float | None], list[dict[str, Any]], str | None]:
        tad_values: list[float | None] = []
        diagnostics: list[dict[str, Any]] = []
        note = None
        for phi in tad_phi:
            f_over_a = phi * f_over_a_st
            t_ad, _, diag = adiabatic_flame_temperature(
                fuel_formula,
                f_over_a,
                fuel_mw,
                inputs.t_fuel_k,
                inputs.t_air_k,
                inputs.p_pa,
                inputs.air_model,
                mode,
            )
            tad_values.append(t_ad)
            diagnostics.append({
                "phi": phi,
                "t_ad_k": t_ad,
                "converged": diag.get("converged"),
                "iterations": diag.get("iterations"),
                "residual_kj": diag.get("residual_kj"),
                "note": diag.get("note"),
                "bracket_low_k": diag.get("bracket_low_k"),
                "bracket_high_k": diag.get("bracket_high_k"),
            })
            if diag.get("note") and note is None:
                note = diag["note"]
        return tad_values, diagnostics, note

    tad_ideal = []
    tad_ideal_diag: list[dict[str, Any]] = []
    tad_note = None
    if inputs.include_ideal:
        tad_ideal, tad_ideal_diag, tad_note = compute_tad_series("ideal")

    if inputs.include_dissociation:
        payload["dissociation"] = _compute_series(
            mode="dissociation",
            phi_values=phi_values,
            t_k=inputs.t_k,
            f_over_a_st=f_over_a_st,
            fuel_formula=fuel_formula,
            fuel_mw=fuel_mw,
            air_model=inputs.air_model,
            p_pa=inputs.p_pa,
            min_mol=inputs.min_mol,
            species_filters=species_filters,
        )

    tad_diss = []
    tad_diss_diag: list[dict[str, Any]] = []
    tad_diss_note = None
    if inputs.include_dissociation:
        tad_diss, tad_diss_diag, tad_diss_note = compute_tad_series("dissociation")

    payload["tad"] = {
        "phi": tad_phi,
        "ideal": tad_ideal if inputs.include_ideal else [],
        "ideal_diagnostics": tad_ideal_diag if inputs.include_ideal else [],
        "dissociation": tad_diss if inputs.include_dissociation else [],
        "dissociation_diagnostics": tad_diss_diag if inputs.include_dissociation else [],
        "t0_k": 298.15,
        "t_fuel_k": inputs.t_fuel_k,
        "t_air_k": inputs.t_air_k,
        "ideal_note": tad_note,
        "dissociation_note": tad_diss_note,
    }

    return payload
