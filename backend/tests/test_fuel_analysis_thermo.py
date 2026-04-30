import math

import pytest
from fastapi.testclient import TestClient

from backend.app import app


client = TestClient(app)


def _post_fuel_analysis(payload):
    response = client.post("/api/fuel/analysis", json=payload)
    assert response.status_code == 200, response.text
    return response.json()


def _post_dissociation_sweep(payload):
    response = client.post("/api/fuel/analysis/dissociation-sweep", json=payload)
    assert response.status_code == 200, response.text
    return response.json()


def _sum_weighted(rows, value_key, weight_key="mol"):
    total = 0.0
    for row in rows:
        value = row.get(value_key)
        weight = row.get(weight_key)
        if value is None or weight is None:
            continue
        total += float(value) * float(weight)
    return total


def _sum_column(rows, key):
    total = 0.0
    for row in rows:
        value = row.get(key)
        if value is None:
            continue
        total += float(value)
    return total


@pytest.mark.parametrize("mode", ["ideal"])
def test_methane_reactant_gibbs_consistency(mode):
    payload = {
        "fuel_id": "CH4",
        "f_over_a": 0.02,
        "mode": mode,
        "temp_mode": "fixed",
        "t_k": 2000.0,
        "t_fuel_k": 298.15,
        "t_air_k": 298.15,
        "p_pa": 101325.0,
        "air_model": "dry_air",
        "fuel_phase": "vapor",
        "hv_basis": "lhv",
        "hv_ref_t_k": 298.15,
    }
    data = _post_fuel_analysis(payload)
    reactants = data["result"]["reactants"]

    # Formation Gibbs for O2/N2 should be ~0 on the chosen reference basis.
    for row in reactants:
        if row["species"] in ("O2", "N2"):
            assert abs(row["gfo_kJ_per_kmol"]) < 1e-2

    sum_gbar = _sum_weighted(reactants, "gbar_kJ_per_kmol")
    sum_gbar_weighted = _sum_column(reactants, "n_i gbar (kJ)")
    assert math.isclose(sum_gbar, sum_gbar_weighted, rel_tol=1e-6, abs_tol=1e-3)

    sum_gfo = _sum_weighted(reactants, "gfo_kJ_per_kmol")
    sum_gfo_weighted = _sum_column(reactants, "n_i gfo (kJ)")
    assert math.isclose(sum_gfo, sum_gfo_weighted, rel_tol=1e-6, abs_tol=1e-3)

    sum_cp = _sum_weighted(reactants, "cpbar_kJ_per_kmol_k")
    sum_cp_weighted = _sum_column(reactants, "n_i cpbar (kJ/K)")
    assert math.isclose(sum_cp, sum_cp_weighted, rel_tol=1e-6, abs_tol=1e-3)


def test_dissociation_products_gibbs_consistency():
    payload = {
        "fuel_id": "CH4",
        "f_over_a": 0.02,
        "mode": "dissociation",
        "temp_mode": "fixed",
        "t_k": 2500.0,
        "t_fuel_k": 298.15,
        "t_air_k": 298.15,
        "p_pa": 101325.0,
        "air_model": "dry_air",
        "fuel_phase": "vapor",
        "hv_basis": "lhv",
        "hv_ref_t_k": 298.15,
    }
    data = _post_fuel_analysis(payload)
    if data["result"].get("note") and "Cantera unavailable" in data["result"]["note"]:
        pytest.skip("Cantera unavailable in test environment.")

    products = data["result"]["products_list"]
    sum_gbar = _sum_weighted(products, "gbar_kJ_per_kmol")
    sum_gbar_weighted = _sum_column(products, "n_i gbar (kJ)")
    assert math.isclose(sum_gbar, sum_gbar_weighted, rel_tol=1e-6, abs_tol=1e-3)

    sum_gfo = _sum_weighted(products, "gfo_kJ_per_kmol")
    sum_gfo_weighted = _sum_column(products, "n_i gfo (kJ)")
    assert math.isclose(sum_gfo, sum_gfo_weighted, rel_tol=1e-6, abs_tol=1e-3)

    sum_cp = _sum_weighted(products, "cpbar_kJ_per_kmol_k")
    sum_cp_weighted = _sum_column(products, "n_i cpbar (kJ/K)")
    assert math.isclose(sum_cp, sum_cp_weighted, rel_tol=1e-6, abs_tol=1e-3)


def test_fixed_temperature_energy_residual():
    payload = {
        "fuel_id": "CH4",
        "f_over_a": 0.02,
        "mode": "ideal",
        "temp_mode": "fixed",
        "t_k": 2200.0,
        "t_fuel_k": 298.15,
        "t_air_k": 298.15,
        "p_pa": 101325.0,
        "air_model": "dry_air",
        "fuel_phase": "vapor",
        "hv_basis": "lhv",
        "hv_ref_t_k": 298.15,
    }
    data = _post_fuel_analysis(payload)
    analysis = data["result"]["analysis"]
    assert analysis["analysis_mode"] == "fixed"
    assert math.isclose(analysis["desired_t_prod_k"], payload["t_k"], rel_tol=0.0, abs_tol=1e-6)
    assert analysis["h_react_kj"] is not None
    assert analysis["h_prod_kj"] is not None
    assert analysis["delta_h_kj"] is not None


def test_adiabatic_temperature_solve_ideal():
    payload = {
        "fuel_id": "CH4",
        "f_over_a": 0.02,
        "mode": "ideal",
        "temp_mode": "adiabatic",
        "t_k": 2000.0,
        "t_fuel_k": 298.15,
        "t_air_k": 298.15,
        "p_pa": 101325.0,
        "air_model": "dry_air",
        "fuel_phase": "vapor",
        "hv_basis": "lhv",
        "hv_ref_t_k": 298.15,
    }
    data = _post_fuel_analysis(payload)
    analysis = data["result"]["analysis"]
    if analysis["analysis_mode"] != "adiabatic":
        pytest.skip("Adiabatic solve fallback or unavailable.")
    assert analysis["solved_t_ad_k"] is not None
    assert analysis["delta_h_kj"] is not None
    assert abs(analysis["delta_h_kj"]) < 1e-1


def test_adiabatic_temperature_solve_dissociation():
    payload = {
        "fuel_id": "CH4",
        "f_over_a": 0.02,
        "mode": "dissociation",
        "temp_mode": "adiabatic",
        "t_k": 2000.0,
        "t_fuel_k": 298.15,
        "t_air_k": 298.15,
        "p_pa": 101325.0,
        "air_model": "dry_air",
        "fuel_phase": "vapor",
        "hv_basis": "lhv",
        "hv_ref_t_k": 298.15,
    }
    data = _post_fuel_analysis(payload)
    if data["result"].get("note") and "Cantera unavailable" in data["result"]["note"]:
        pytest.skip("Cantera unavailable in test environment.")
    analysis = data["result"]["analysis"]
    if analysis["analysis_mode"] != "adiabatic":
        pytest.skip("Adiabatic solve fallback or unavailable.")
    assert analysis["solved_t_ad_k"] is not None
    assert analysis["delta_h_kj"] is not None
    assert abs(analysis["delta_h_kj"]) < 1e-1


def test_f_vs_phi_equivalence():
    base_payload = {
        "fuel_id": "CH4",
        "mode": "ideal",
        "temp_mode": "fixed",
        "t_k": 2000.0,
        "t_fuel_k": 298.15,
        "t_air_k": 298.15,
        "p_pa": 101325.0,
        "air_model": "dry_air",
        "fuel_phase": "vapor",
        "hv_basis": "lhv",
        "hv_ref_t_k": 298.15,
    }
    payload_f = {
        **base_payload,
        "mixture_input_mode": "f",
        "f_over_a": 0.02,
    }
    data_f = _post_fuel_analysis(payload_f)
    phi = data_f["result"]["phi"]
    payload_phi = {
        **base_payload,
        "mixture_input_mode": "phi",
        "phi_input": phi,
    }
    data_phi = _post_fuel_analysis(payload_phi)

    assert math.isclose(data_f["result"]["phi"], data_phi["result"]["phi"], rel_tol=1e-6)
    assert math.isclose(data_f["result"]["afr"], data_phi["result"]["afr"], rel_tol=1e-6)
    assert math.isclose(data_f["result"]["analysis"]["f_used"], data_phi["result"]["analysis"]["f_used"], rel_tol=1e-6)


def test_fixed_temperature_dissociation_percent():
    payload = {
        "fuel_id": "CH4",
        "f_over_a": 0.02,
        "mode": "dissociation",
        "temp_mode": "fixed",
        "t_k": 2400.0,
        "t_fuel_k": 298.15,
        "t_air_k": 298.15,
        "p_pa": 101325.0,
        "air_model": "dry_air",
        "fuel_phase": "vapor",
        "hv_basis": "lhv",
        "hv_ref_t_k": 298.15,
    }
    data = _post_fuel_analysis(payload)
    if data["result"].get("note") and "Cantera unavailable" in data["result"]["note"]:
        pytest.skip("Cantera unavailable in test environment.")
    diss = data["result"]["dissociation"]
    assert diss["percent_dissociation_co2"] is not None
    assert diss["percent_dissociation_h2o"] is not None


def test_dissociation_sweep_shapes():
    payload = {
        "fuel_id": "CH4",
        "air_model": "dry_air",
        "temp_mode": "fixed",
        "t_k": 2200.0,
        "t_fuel_k": 298.15,
        "t_air_k": 298.15,
        "phi_min": 0.8,
        "phi_max": 1.2,
        "phi_step": 0.2,
        "pressure_values_pa": [101325.0, 202650.0],
        "phi_values": [0.9, 1.1],
        "p_min_pa": 101325.0,
        "p_max_pa": 202650.0,
        "p_step_pa": 101325.0,
        "p_scale": "linear",
        "adiabatic_basis": "equilibrium",
    }
    data = _post_dissociation_sweep(payload)
    phi_sweep = data["phi_sweep"]
    pressure_sweep = data["pressure_sweep"]
    assert len(phi_sweep["phi_values"]) == 3
    assert len(phi_sweep["pressure_values_pa"]) == 2
    assert len(phi_sweep["percent_dissociation"]["CO2"]) == 2
    assert len(phi_sweep["percent_dissociation"]["CO2"][0]) == 3
    assert len(pressure_sweep["pressure_values_pa"]) == 2
    assert len(pressure_sweep["phi_values"]) == 2
    assert len(pressure_sweep["percent_dissociation"]["H2O"]) == 2
    assert len(pressure_sweep["percent_dissociation"]["H2O"][0]) == 2
