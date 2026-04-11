from __future__ import annotations

from pathlib import Path
import sys

from fastapi import FastAPI, HTTPException
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware

from .models import (
    MK1Inputs,
    AnalysisOperatingLineInputs,
    AnalysisStripModelInputs,
    AnalysisTauSweepInputs,
    AnalysisTbarVsMeInputs,
    AnalysisVelocityRatioInputs,
    FuelAnalysisInputs,
    FuelXiMapInputs,
)
REPO_ROOT = Path(__file__).resolve().parents[1]
PROTOTYPE_ROOT = REPO_ROOT / "prototype"
if str(PROTOTYPE_ROOT) not in sys.path:
    sys.path.insert(0, str(PROTOTYPE_ROOT))


from .mk1_adapter import compute_mk1
from .plots import (
    analysis_operating_line,
    analysis_strip_model,
    analysis_strip_model_equations,
    analysis_tau_sweeps,
    analysis_tbar_vs_me,
    analysis_velocity_ratio,
    diagnostics_from_mk1,
    fuel_xi_map,
    ideal_tau_sweeps_from_mk1,
    operating_line_from_mk1,
    strip_model_from_mk1,
    tbar_vs_me_from_mk1,
)


from combustion_solver import (
    MW_N2,
    MW_O2,
    air_model_params,
    equivalence_ratio,
    find_mechanism_for_fuel,
    heating_value_cantera,
    heating_value_equilibrium,
    latex_derivation,
    load_fuels,
    products_dissociation,
    products_ideal,
    stoich_afr,
    stoich_oxygen_moles,
)

app = FastAPI(title="Turbojet Web Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/api/mk1/solve")
def solve_mk1(inputs: MK1Inputs):
    _, payload = compute_mk1(inputs)
    return jsonable_encoder(payload)


@app.post("/api/plots/mark4/diagnostics")
def mark4_diagnostics(inputs: MK1Inputs):
    state, _ = compute_mk1(inputs)
    rows = state["station_table_raw"].to_dict(orient="records")
    diag = diagnostics_from_mk1(rows, inputs.model_dump())
    return jsonable_encoder(diag)


@app.post("/api/plots/mark4/operating-line")
def mark4_operating_line(inputs: MK1Inputs):
    state, _ = compute_mk1(inputs)
    rows = state["station_table_raw"].to_dict(orient="records")
    payload = operating_line_from_mk1(rows, inputs.model_dump())
    return jsonable_encoder(payload)


@app.post("/api/plots/mark4/tbar-vs-me")
def mark4_tbar_vs_me(inputs: MK1Inputs):
    state, _ = compute_mk1(inputs)
    rows = state["station_table_raw"].to_dict(orient="records")
    payload = tbar_vs_me_from_mk1(rows, inputs.model_dump())
    return jsonable_encoder(payload)


@app.post("/api/plots/ideal/tau-sweeps")
def ideal_tau_sweeps(inputs: MK1Inputs):
    state, _ = compute_mk1(inputs)
    payload = ideal_tau_sweeps_from_mk1(state, inputs.model_dump())
    return jsonable_encoder(payload)


@app.post("/api/plots/strip-model/map")
def strip_model(payload: dict):
    data = dict(payload or {})
    strip_overrides = data.pop("strip", None)
    inputs = MK1Inputs(**data)
    state, _ = compute_mk1(inputs)
    payload = strip_model_from_mk1(state, inputs.model_dump(), strip_overrides)
    return jsonable_encoder(payload)


@app.post("/api/analysis/ideal/tau-sweeps")
def analysis_tau_sweeps_plot(inputs: AnalysisTauSweepInputs):
    payload = analysis_tau_sweeps(inputs.model_dump())
    return jsonable_encoder(payload)


@app.post("/api/analysis/ideal/velocity-ratio")
def analysis_velocity_ratio_plot(inputs: AnalysisVelocityRatioInputs):
    payload = analysis_velocity_ratio(inputs.model_dump())
    return jsonable_encoder(payload)


@app.post("/api/analysis/ideal/tbar-vs-me")
def analysis_tbar_vs_me_plot(inputs: AnalysisTbarVsMeInputs):
    payload = analysis_tbar_vs_me(inputs.model_dump())
    return jsonable_encoder(payload)


@app.post("/api/analysis/ideal/operating-line")
def analysis_operating_line_plot(inputs: AnalysisOperatingLineInputs):
    payload = analysis_operating_line(inputs.model_dump())
    return jsonable_encoder(payload)


@app.post("/api/analysis/ideal/strip-model")
def analysis_strip_model_plot(inputs: AnalysisStripModelInputs):
    payload = analysis_strip_model(inputs.model_dump())
    return jsonable_encoder(payload)


@app.post("/api/analysis/ideal/strip-model-equations")
def analysis_strip_model_equations_payload():
    payload = analysis_strip_model_equations()
    return jsonable_encoder(payload)


def _fuel_data_path() -> Path:
    return PROTOTYPE_ROOT / "fuel_data.json"


def _computed_derivation_path() -> Path:
    return REPO_ROOT / "frontend" / "src" / "analysis" / "fuelAnalysisDerivationComputed.md"


def _derivation_to_markdown(text: str | None) -> str:
    if not text:
        return ""
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    if not lines:
        return ""
    blocks: list[str] = []
    for line in lines:
        if line.startswith("LABEL:"):
            label = line[6:].strip()
            if label:
                blocks.append(f"**{label}**")
            continue
        if line.startswith("MATH:"):
            value = line[5:].strip()
            if value:
                blocks.append(f"$$\n{value}\n$$")
            continue
        if line.startswith("TEXT:"):
            value = line[5:].strip()
            if value:
                blocks.append(value)
            continue
        blocks.append(f"$$\n{line}\n$$")
    return "\n\n".join(blocks)


@app.get("/api/fuel/list")
def fuel_list():
    path = _fuel_data_path()
    if not path.exists():
        raise HTTPException(status_code=500, detail="fuel_data.json not found. Run prototype/build_fuel_data.py")
    fuels = load_fuels(path)
    payload = [
        {
            "fuel_id": fuel.fuel_id,
            "name": fuel.name,
            "formula": fuel.formula,
            "mw_kg_per_kmol": fuel.mw_kg_per_kmol,
            "lhv_kJ_per_kg": fuel.lhv_kJ_per_kg,
        }
        for fuel in fuels.values()
    ]
    return jsonable_encoder(payload)


@app.post("/api/fuel/analysis")
def fuel_analysis(inputs: FuelAnalysisInputs):
    if inputs.mode not in {"ideal", "dissociation"}:
        raise HTTPException(status_code=400, detail="mode must be 'ideal' or 'dissociation'")
    path = _fuel_data_path()
    if not path.exists():
        raise HTTPException(status_code=500, detail="fuel_data.json not found. Run prototype/build_fuel_data.py")

    fuels = load_fuels(path)
    fuel = fuels.get(inputs.fuel_id)
    if fuel is None:
        raise HTTPException(status_code=404, detail=f"Fuel '{inputs.fuel_id}' not found")

    try:
        import cantera as ct
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Cantera is required for molecular weights.") from exc

    mech_name, mech_species, mech_note = find_mechanism_for_fuel(fuel.formula)
    is_surrogate = bool(mech_note and "surrogate" in mech_note.lower())

    gas_mech = "gri30.yaml"
    if inputs.mode == "dissociation":
        mech, _, _ = find_mechanism_for_fuel(fuel.formula)
        if mech:
            gas_mech = mech
    try:
        gas = ct.Solution(gas_mech)
    except Exception:
        gas = ct.Solution("gri30.yaml")
    gas.TP = inputs.t_k, inputs.p_pa
    species_mw = {name: gas.molecular_weights[i] for i, name in enumerate(gas.species_names)}
    element_mw = dict(zip(gas.element_names, gas.atomic_weights))
    elements = ["C", "H", "O", "N"]

    def mw_from_formula(formula: str) -> float | None:
        parts = {}
        import re

        for element, count in re.findall(r"([A-Z][a-z]?)(\d*)", formula):
            parts[element] = parts.get(element, 0.0) + (float(count) if count else 1.0)
        total = 0.0
        for element, count in parts.items():
            weight = element_mw.get(element)
            if weight is None:
                return None
            total += weight * count
        return total

    def parse_formula_elements(formula: str) -> dict[str, float]:
        parts = {}
        import re

        for element, count in re.findall(r"([A-Z][a-z]?)(\d*)", formula):
            parts[element] = parts.get(element, 0.0) + (float(count) if count else 1.0)
        return parts

    def element_totals_from_species(species_mol: dict[str, float]) -> dict[str, float]:
        totals = {el: 0.0 for el in elements}
        for species, mol in species_mol.items():
            if not mol:
                continue
            if species in gas.species_names:
                idx = gas.species_index(species)
                for el in elements:
                    el_idx = gas.element_index(el)
                    if el_idx >= 0:
                        totals[el] += mol * gas.n_atoms(idx, el_idx)
                continue
            if species == "C_s":
                totals["C"] += mol
                continue
            parts = parse_formula_elements(species)
            for el in elements:
                totals[el] += mol * parts.get(el, 0.0)
        return totals

    def mass_total_from_species(species_mol: dict[str, float]) -> float:
        total = 0.0
        for species, mol in species_mol.items():
            if not mol:
                continue
            mw = mw_for_species(species)
            if mw is None:
                continue
            total += mol * mw
        return total

    def mol_total_from_species(species_mol: dict[str, float]) -> float:
        return sum(mol for mol in species_mol.values() if mol)

    def mw_for_species(name: str) -> float | None:
        if name in species_mw:
            return species_mw[name]
        if name == "C_s":
            return element_mw.get("C")
        return mw_from_formula(name)

    fuel_enthalpy_surrogate = bool(
        fuel.formula not in gas.species_names
        and mech_species in gas.species_names
    )

    def enthalpy_kj_per_kmol(name: str, t_k: float) -> float | None:
        try:
            import cantera as ct
        except Exception:
            return None

        if name == "C_s":
            try:
                graphite = ct.Solution("graphite.yaml")
                graphite.TP = t_k, inputs.p_pa
                return graphite.enthalpy_mole / 1000.0
            except Exception:
                return None

        gas.TP = t_k, inputs.p_pa
        species_name = name
        if name not in gas.species_names:
            if name == fuel.formula and mech_species in gas.species_names:
                species_name = mech_species
            else:
                return None
        idx = gas.species_index(species_name)
        if idx < 0:
            return None
        return gas.partial_molar_enthalpies[idx] / 1000.0

    def cp_kj_per_kmol_k(name: str, t_k: float) -> float | None:
        try:
            import cantera as ct
        except Exception:
            return None

        if name == "C_s":
            try:
                graphite = ct.Solution("graphite.yaml")
                graphite.TP = t_k, inputs.p_pa
                return graphite.cp_mole / 1000.0
            except Exception:
                return None

        species_name = name
        if name not in gas.species_names:
            if name == fuel.formula and mech_species in gas.species_names:
                species_name = mech_species
            else:
                return None

        try:
            thermo = gas.species(species_name).thermo
            return thermo.cp(t_k) / 1000.0
        except Exception:
            return None

    def s_kj_per_kmol_k(name: str, t_k: float) -> float | None:
        try:
            import cantera as ct
        except Exception:
            return None

        if name == "C_s":
            try:
                graphite = ct.Solution("graphite.yaml")
                graphite.TP = t_k, inputs.p_pa
                return graphite.entropy_mole / 1000.0
            except Exception:
                return None

        species_name = name
        if name not in gas.species_names:
            if name == fuel.formula and mech_species in gas.species_names:
                species_name = mech_species
            else:
                return None

        try:
            thermo = gas.species(species_name).thermo
            return thermo.s(t_k) / 1000.0
        except Exception:
            return None

    def g_kj_per_kmol(name: str, t_k: float) -> float | None:
        try:
            import cantera as ct
        except Exception:
            return None

        def element_reference(species: str, coeff: float) -> float | None:
            if coeff == 0.0:
                return 0.0
            if species == "C(s)":
                try:
                    graphite = ct.Solution("graphite.yaml")
                    graphite.TP = t_k, inputs.p_pa
                    return coeff * (graphite.enthalpy_mole - t_k * graphite.entropy_mole)
                except Exception:
                    return None
            if species not in gas.species_names:
                return None
            thermo = gas.species(species).thermo
            return coeff * (thermo.h(t_k) - t_k * thermo.s(t_k))

        if name == "C_s":
            try:
                graphite = ct.Solution("graphite.yaml")
                graphite.TP = t_k, inputs.p_pa
                return graphite.gibbs_mole / 1000.0
            except Exception:
                return None

        species_name = name
        if name not in gas.species_names:
            if name == fuel.formula and mech_species in gas.species_names:
                species_name = mech_species
            else:
                return None

        try:
            thermo = gas.species(species_name).thermo
            g_species = thermo.h(t_k) - t_k * thermo.s(t_k)
            parts = parse_formula_elements(name)
            c = parts.get("C", 0.0)
            h = parts.get("H", 0.0)
            o = parts.get("O", 0.0)
            n = parts.get("N", 0.0)

            g_elements = 0.0
            for element, coeff in (
                ("C(s)", c),
                ("H2", h / 2.0),
                ("O2", o / 2.0),
                ("N2", n / 2.0),
            ):
                contrib = element_reference(element, coeff)
                if contrib is None:
                    return None
                g_elements += contrib

            return (g_species - g_elements) / 1000.0
        except Exception:
            return None

    afr_st = stoich_afr(fuel.formula, fuel.mw_kg_per_kmol, inputs.air_model)
    phi = equivalence_ratio(inputs.f_over_a, afr_st)
    a = stoich_oxygen_moles(fuel.formula)
    n2_o2_ratio, _ = air_model_params(inputs.air_model)
    air_o2 = a / phi
    air_n2 = air_o2 * n2_o2_ratio

    reactants_raw = [
        {
            "species": fuel.formula,
            "mol": 1.0,
            "mw": mw_for_species(fuel.formula),
            "hbar_kJ_per_kmol": enthalpy_kj_per_kmol(fuel.formula, inputs.t_react_k),
            "cpbar_kJ_per_kmol_k": cp_kj_per_kmol_k(fuel.formula, inputs.t_react_k),
            "sbar_kJ_per_kmol_k": s_kj_per_kmol_k(fuel.formula, inputs.t_react_k),
            "gfo_kJ_per_kmol": g_kj_per_kmol(fuel.formula, inputs.t_react_k),
        },
        {
            "species": "O2",
            "mol": air_o2,
            "mw": mw_for_species("O2"),
            "hbar_kJ_per_kmol": enthalpy_kj_per_kmol("O2", inputs.t_react_k),
            "cpbar_kJ_per_kmol_k": cp_kj_per_kmol_k("O2", inputs.t_react_k),
            "sbar_kJ_per_kmol_k": s_kj_per_kmol_k("O2", inputs.t_react_k),
            "gfo_kJ_per_kmol": g_kj_per_kmol("O2", inputs.t_react_k),
        },
        {
            "species": "N2",
            "mol": air_n2,
            "mw": mw_for_species("N2"),
            "hbar_kJ_per_kmol": enthalpy_kj_per_kmol("N2", inputs.t_react_k),
            "cpbar_kJ_per_kmol_k": cp_kj_per_kmol_k("N2", inputs.t_react_k),
            "sbar_kJ_per_kmol_k": s_kj_per_kmol_k("N2", inputs.t_react_k),
            "gfo_kJ_per_kmol": g_kj_per_kmol("N2", inputs.t_react_k),
        },
    ]

    reactant_totals = {el: 0.0 for el in elements}
    fuel_elements = parse_formula_elements(fuel.formula)
    for el in elements:
        reactant_totals[el] += fuel_elements.get(el, 0.0)
    reactant_totals["O"] += air_o2 * 2.0
    reactant_totals["N"] += air_n2 * 2.0
    reactant_mass = sum(
        (item["mol"] or 0.0) * (item["mw"] or 0.0)
        for item in reactants_raw
    )
    reactant_moles = sum(item["mol"] or 0.0 for item in reactants_raw)

    t_prod_k = inputs.t_k

    hv_value, hv_note = heating_value_cantera(
        fuel.formula,
        fuel.mw_kg_per_kmol,
        inputs.hv_basis,
        inputs.hv_ref_t_k,
        inputs.fuel_phase,
        inputs.p_pa,
    )
    ideal_result = products_ideal(
        fuel.formula,
        inputs.f_over_a,
        fuel.mw_kg_per_kmol,
        inputs.t_k,
        inputs.air_model,
    )

    if inputs.mode == "dissociation":
        result = products_dissociation(
            fuel.formula,
            inputs.f_over_a,
            fuel.mw_kg_per_kmol,
            inputs.t_k,
            inputs.p_pa,
            inputs.air_model,
        )
    else:
        result = ideal_result

    hv_eq_value, hv_eq_note = heating_value_equilibrium(
        fuel.formula,
        fuel.mw_kg_per_kmol,
        inputs.hv_basis,
        inputs.hv_ref_t_k,
        inputs.fuel_phase,
        inputs.p_pa,
        result.products_mol if inputs.mode == "dissociation" else None,
    )

    def normalize_products_list(items: list[dict]) -> list[dict]:
        total_mol = sum(item["mol"] for item in items if item.get("mol"))
        total_mass = sum(
            (item.get("mol") or 0.0) * (item.get("mw") or 0.0)
            for item in items
        )
        normalized = []
        for item in items:
            mol = item.get("mol") or 0.0
            mw = item.get("mw") or 0.0
            mass = mol * mw
            normalized.append({
                **item,
                "mol_frac": (mol / total_mol) if total_mol else 0.0,
                "mass_frac": (mass / total_mass) if total_mass else 0.0,
            })
        return normalized

    reactants = normalize_products_list(reactants_raw)

    products_list = [
        {
            "species": key,
            "mol": value,
            "mw": mw_for_species(key),
            "hbar_kJ_per_kmol": enthalpy_kj_per_kmol(key, t_prod_k),
            "cpbar_kJ_per_kmol_k": cp_kj_per_kmol_k(key, t_prod_k),
            "sbar_kJ_per_kmol_k": s_kj_per_kmol_k(key, t_prod_k),
            "gfo_kJ_per_kmol": g_kj_per_kmol(key, t_prod_k),
        }
        for key, value in result.products_mol.items()
    ]
    filtered_products_mol = {
        key: value
        for key, value in result.products_mol.items()
        if value >= 1e-7
    }
    excluded_species = [
        {
            "species": item["species"],
            "mol": item["mol"],
        }
        for item in products_list
        if item.get("mol") and item["mol"] < 1e-7
    ]
    products_list = normalize_products_list(products_list)

    ideal_products_list = [
        {
            "species": key,
            "mol": value,
            "mw": mw_for_species(key),
            "hbar_kJ_per_kmol": enthalpy_kj_per_kmol(key, t_prod_k),
            "cpbar_kJ_per_kmol_k": cp_kj_per_kmol_k(key, t_prod_k),
            "sbar_kJ_per_kmol_k": s_kj_per_kmol_k(key, t_prod_k),
            "gfo_kJ_per_kmol": g_kj_per_kmol(key, t_prod_k),
        }
        for key, value in ideal_result.products_mol.items()
    ]
    ideal_products_list = normalize_products_list(ideal_products_list)

    derivation_text = latex_derivation(
        fuel.formula,
        inputs.f_over_a,
        fuel.mw_kg_per_kmol,
        inputs.fuel_phase,
        inputs.hv_basis,
        inputs.hv_ref_t_k,
        inputs.t_k,
        inputs.p_pa,
        result.products_mol if inputs.mode == "dissociation" else None,
        min_mol=1e-6,
        air_model=inputs.air_model,
    )
    derivation_markdown = _derivation_to_markdown(derivation_text)
    try:
        _computed_derivation_path().write_text(derivation_markdown, encoding="utf-8")
    except Exception:
        pass

    payload = {
        "fuel_id": fuel.fuel_id,
        "fuel_name": fuel.name,
        "mode": inputs.mode,
        "inputs": {
            "f_over_a": inputs.f_over_a,
            "t_k": inputs.t_k,
            "t_react_k": inputs.t_react_k,
            "t_prod_k": t_prod_k,
            "p_pa": inputs.p_pa,
            "air_model": inputs.air_model,
            "fuel_phase": inputs.fuel_phase,
            "hv_basis": inputs.hv_basis,
            "hv_ref_t_k": inputs.hv_ref_t_k,
        },
        "result": {
            "phi": result.phi,
            "afr": result.afr,
            "afr_stoich": result.afr_stoich,
            "regime": "lean" if result.phi < 1.0 else "stoichiometric" if result.phi == 1.0 else "rich",
            "air_model": inputs.air_model,
            "fuel_phase": inputs.fuel_phase,
            "heating_value": {
                "basis": inputs.hv_basis,
                "phase": inputs.fuel_phase,
                "ref_t_k": inputs.hv_ref_t_k,
                "value_kJ_per_kg": hv_value,
                "note": hv_note,
                "eq_value_kJ_per_kg": hv_eq_value,
                "eq_note": hv_eq_note,
                "eq_available": hv_eq_value is not None,
            },
            "mechanism": {
                "name": mech_name,
                "species": mech_species,
                "note": mech_note,
                "is_surrogate": is_surrogate,
                "fuel_enthalpy_surrogate": fuel_enthalpy_surrogate,
                "elements": gas.element_names,
                "species_count": gas.n_species,
                "reaction_count": gas.n_reactions,
            },
            "reactants": reactants,
            "products": result.products_mol,
            "products_list": products_list,
            "excluded_species": excluded_species,
            "ideal_products_list": ideal_products_list,
            "element_balance": {
                "reactants": reactant_totals,
                "ideal": element_totals_from_species(ideal_result.products_mol),
                "dissociation": element_totals_from_species(result.products_mol),
                "dissociation_filtered": element_totals_from_species(filtered_products_mol),
            },
            "mass_balance": {
                "reactants": reactant_mass,
                "ideal": mass_total_from_species(ideal_result.products_mol),
                "dissociation": mass_total_from_species(result.products_mol),
                "dissociation_filtered": mass_total_from_species(filtered_products_mol),
            },
            "mole_balance": {
                "reactants": reactant_moles,
                "ideal": mol_total_from_species(ideal_result.products_mol),
                "dissociation": mol_total_from_species(result.products_mol),
                "dissociation_filtered": mol_total_from_species(filtered_products_mol),
            },
            "pollutants": result.pollutants_mol,
            "note": result.note,
        },
        "derivation": derivation_text,
        "derivation_markdown": derivation_markdown,
    }
    return jsonable_encoder(payload)


@app.post("/api/fuel/analysis/xi-map")
def fuel_analysis_xi_map(inputs: FuelXiMapInputs):
    path = _fuel_data_path()
    if not path.exists():
        raise HTTPException(status_code=500, detail="fuel_data.json not found. Run prototype/build_fuel_data.py")

    fuels = load_fuels(path)
    fuel = fuels.get(inputs.fuel_id)
    if fuel is None:
        raise HTTPException(status_code=404, detail=f"Fuel '{inputs.fuel_id}' not found")

    try:
        payload = fuel_xi_map(inputs, fuel_formula=fuel.formula, fuel_mw=fuel.mw_kg_per_kmol)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return jsonable_encoder(payload)
