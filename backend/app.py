from __future__ import annotations

from pathlib import Path
import math
import sys

from fastapi import FastAPI, HTTPException
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware

REPO_ROOT = Path(__file__).resolve().parents[1]
PROTOTYPE_ROOT = REPO_ROOT / "prototype"
if str(PROTOTYPE_ROOT) not in sys.path:
    sys.path.append(str(PROTOTYPE_ROOT))

try:
    from .models import (
        MK1Inputs,
        AnalysisOperatingLineInputs,
        AnalysisStripModelInputs,
        AnalysisTauSweepInputs,
        AnalysisTbarVsMeInputs,
        AnalysisVelocityRatioInputs,
        FuelAnalysisInputs,
        FuelXiMapInputs,
        FuelDissociationSweepInputs,
        FuelDissociationSingleInputs,
    )
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
        fuel_dissociation_sweep,
        fuel_dissociation_single,
        ideal_tau_sweeps_from_mk1,
        operating_line_from_mk1,
        strip_model_from_mk1,
        tbar_vs_me_from_mk1,
    )
except ImportError:
    from models import (
        MK1Inputs,
        AnalysisOperatingLineInputs,
        AnalysisStripModelInputs,
        AnalysisTauSweepInputs,
        AnalysisTbarVsMeInputs,
        AnalysisVelocityRatioInputs,
        FuelAnalysisInputs,
        FuelXiMapInputs,
        FuelDissociationSweepInputs,
        FuelDissociationSingleInputs,
    )
    from mk1_adapter import compute_mk1
    from plots import (
        analysis_operating_line,
        analysis_strip_model,
        analysis_strip_model_equations,
        analysis_tau_sweeps,
        analysis_tbar_vs_me,
        analysis_velocity_ratio,
        diagnostics_from_mk1,
        fuel_xi_map,
        fuel_dissociation_sweep,
        fuel_dissociation_single,
        ideal_tau_sweeps_from_mk1,
        operating_line_from_mk1,
        strip_model_from_mk1,
        tbar_vs_me_from_mk1,
    )



from combustion_solver import (
    MW_N2,
    MW_O2,
    adiabatic_flame_temperature,
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
    if inputs.temp_mode not in {"fixed", "adiabatic"}:
        raise HTTPException(status_code=400, detail="temp_mode must be 'fixed' or 'adiabatic'")
    path = _fuel_data_path()
    if not path.exists():
        raise HTTPException(status_code=500, detail="fuel_data.json not found. Run prototype/build_fuel_data.py")

    fuels = load_fuels(path)
    fuel = fuels.get(inputs.fuel_id)
    if fuel is None:
        raise HTTPException(status_code=404, detail=f"Fuel '{inputs.fuel_id}' not found")

    cantera_ok = True
    try:
        import cantera as ct
    except Exception:
        cantera_ok = False
        ct = None

    try:
        mech_name, mech_species, mech_note = find_mechanism_for_fuel(fuel.formula)
        is_surrogate = bool(mech_note and "surrogate" in mech_note.lower())

        gas = None
        gas_species_names: set[str] = set()
        species_mw: dict[str, float] = {}
        element_mw: dict[str, float] = {}
        if cantera_ok and ct is not None:
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
            gas_species_names = set(gas.species_names)
        else:
            element_mw = {
                "C": 12.011,
                "H": 1.008,
                "O": 15.999,
                "N": 14.007,
            }
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
                if gas is not None and species in gas_species_names:
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
            fuel.formula not in gas_species_names
            and mech_species in gas_species_names
        )

        def enthalpy_kj_per_kmol(name: str, t_k: float) -> float | None:
            if ct is None or gas is None:
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
            if name not in gas_species_names:
                if name == fuel.formula and mech_species in gas_species_names:
                    species_name = mech_species
                else:
                    return None
            idx = gas.species_index(species_name)
            if idx < 0:
                return None
            return gas.partial_molar_enthalpies[idx] / 1000.0

        def sensible_enthalpy_kj_per_kmol(name: str, t_k: float, t_ref_k: float) -> float | None:
            if ct is None or gas is None:
                return None

            if name == "C_s":
                try:
                    graphite = ct.Solution("graphite.yaml")
                    graphite.TP = t_k, inputs.p_pa
                    h_t = graphite.enthalpy_mole
                    graphite.TP = t_ref_k, inputs.p_pa
                    h_ref = graphite.enthalpy_mole
                    return (h_t - h_ref) / 1000.0
                except Exception:
                    return None

            species_name = name
            if name not in gas_species_names:
                if name == fuel.formula and mech_species in gas_species_names:
                    species_name = mech_species
                else:
                    return None

            try:
                thermo = gas.species(species_name).thermo
                h_t = thermo.h(t_k)
                h_ref = thermo.h(t_ref_k)
                return (h_t - h_ref) / 1000.0
            except Exception:
                return None

        def cp_kj_per_kmol_k(name: str, t_k: float) -> float | None:
            if ct is None or gas is None:
                return None

            if name == "C_s":
                try:
                    graphite = ct.Solution("graphite.yaml")
                    graphite.TP = t_k, inputs.p_pa
                    return graphite.cp_mole / 1000.0
                except Exception:
                    return None

            species_name = name
            if name not in gas_species_names:
                if name == fuel.formula and mech_species in gas_species_names:
                    species_name = mech_species
                else:
                    return None

            try:
                thermo = gas.species(species_name).thermo
                return thermo.cp(t_k) / 1000.0
            except Exception:
                return None

        def s_kj_per_kmol_k(name: str, t_k: float) -> float | None:
            if ct is None or gas is None:
                return None

            if name == "C_s":
                try:
                    graphite = ct.Solution("graphite.yaml")
                    graphite.TP = t_k, inputs.p_pa
                    return graphite.entropy_mole / 1000.0
                except Exception:
                    return None

            species_name = name
            if name not in gas_species_names:
                if name == fuel.formula and mech_species in gas_species_names:
                    species_name = mech_species
                else:
                    return None

            try:
                thermo = gas.species(species_name).thermo
                return thermo.s(t_k) / 1000.0
            except Exception:
                return None

        def sensible_entropy_kj_per_kmol_k(name: str, t_k: float, t_ref_k: float) -> float | None:
            if ct is None or gas is None:
                return None

            if name == "C_s":
                try:
                    graphite = ct.Solution("graphite.yaml")
                    graphite.TP = t_k, inputs.p_pa
                    s_t = graphite.entropy_mole
                    graphite.TP = t_ref_k, inputs.p_pa
                    s_ref = graphite.entropy_mole
                    return (s_t - s_ref) / 1000.0
                except Exception:
                    return None

            species_name = name
            if name not in gas_species_names:
                if name == fuel.formula and mech_species in gas_species_names:
                    species_name = mech_species
                else:
                    return None

            try:
                thermo = gas.species(species_name).thermo
                s_t = thermo.s(t_k)
                s_ref = thermo.s(t_ref_k)
                return (s_t - s_ref) / 1000.0
            except Exception:
                return None

        def g_kj_per_kmol(name: str, t_k: float) -> float | None:
            if ct is None or gas is None:
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
                if species not in gas_species_names:
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
            if name not in gas_species_names:
                if name == fuel.formula and mech_species in gas_species_names:
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

        def g_elements_kj_per_kmol(name: str, t_k: float) -> float | None:
            if ct is None or gas is None:
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
                if species not in gas_species_names:
                    return None
                thermo = gas.species(species).thermo
                return coeff * (thermo.h(t_k) - t_k * thermo.s(t_k))

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
            return g_elements / 1000.0

        def gbar_kj_per_kmol(name: str, t_k: float) -> float | None:
            if ct is None or gas is None:
                return None

            if name == "C_s":
                try:
                    graphite = ct.Solution("graphite.yaml")
                    graphite.TP = t_k, inputs.p_pa
                    return graphite.gibbs_mole / 1000.0
                except Exception:
                    return None

            species_name = name
            if name not in gas_species_names:
                if name == fuel.formula and mech_species in gas_species_names:
                    species_name = mech_species
                else:
                    return None

            try:
                thermo = gas.species(species_name).thermo
                return (thermo.h(t_k) - t_k * thermo.s(t_k)) / 1000.0
            except Exception:
                return None

        def hf_kj_per_kmol(name: str, t_k: float) -> float | None:
            if ct is None or gas is None:
                return None

            def element_enthalpy(species: str, coeff: float) -> float | None:
                if coeff == 0.0:
                    return 0.0
                if species == "C(s)":
                    try:
                        graphite = ct.Solution("graphite.yaml")
                        graphite.TP = t_k, inputs.p_pa
                        return coeff * graphite.enthalpy_mole
                    except Exception:
                        return None
                if species not in gas_species_names:
                    return None
                thermo = gas.species(species).thermo
                return coeff * thermo.h(t_k)

            if name == "C_s":
                try:
                    graphite = ct.Solution("graphite.yaml")
                    graphite.TP = t_k, inputs.p_pa
                    return graphite.enthalpy_mole / 1000.0
                except Exception:
                    return None

            species_name = name
            if name not in gas_species_names:
                if name == fuel.formula and mech_species in gas_species_names:
                    species_name = mech_species
                else:
                    return None

            try:
                thermo = gas.species(species_name).thermo
                h_species = thermo.h(t_k)
                parts = parse_formula_elements(name)
                c = parts.get("C", 0.0)
                h = parts.get("H", 0.0)
                o = parts.get("O", 0.0)
                n = parts.get("N", 0.0)

                h_elements = 0.0
                for element, coeff in (
                    ("C(s)", c),
                    ("H2", h / 2.0),
                    ("O2", o / 2.0),
                    ("N2", n / 2.0),
                ):
                    contrib = element_enthalpy(element, coeff)
                    if contrib is None:
                        return None
                    h_elements += contrib

                return (h_species - h_elements) / 1000.0
            except Exception:
                return None

        if inputs.temp_mode not in {"fixed", "adiabatic"}:
            raise HTTPException(status_code=400, detail="temp_mode must be 'fixed' or 'adiabatic'")

        mixture_input_mode = inputs.mixture_input_mode or "f"
        if mixture_input_mode not in {"f", "phi"}:
            raise HTTPException(status_code=400, detail="mixture_input_mode must be 'f' or 'phi'")

        afr_st = stoich_afr(fuel.formula, fuel.mw_kg_per_kmol, inputs.air_model)
        f_st = 1.0 / max(afr_st, 1e-12)
        f_input = inputs.f_over_a
        phi_input = inputs.phi_input
        if mixture_input_mode == "phi":
            if phi_input is None or phi_input <= 0.0:
                raise HTTPException(status_code=400, detail="phi must be positive")
            f_over_a = float(phi_input) * f_st
            phi_used = float(phi_input)
        else:
            if f_input is None or f_input <= 0.0:
                raise HTTPException(status_code=400, detail="f must be positive")
            f_over_a = float(f_input)
            phi_used = equivalence_ratio(f_over_a, afr_st)
        afr_used = 1.0 / max(f_over_a, 1e-12)

        phi = phi_used
        a = stoich_oxygen_moles(fuel.formula)
        n2_o2_ratio, _ = air_model_params(inputs.air_model)
        air_o2 = a / phi
        air_n2 = air_o2 * n2_o2_ratio

        t_ref_k = float(inputs.hv_ref_t_k) if inputs.hv_ref_t_k is not None else 298.15
        t_fuel_k = inputs.t_fuel_k if inputs.t_fuel_k is not None else inputs.t_react_k
        t_air_k = inputs.t_air_k if inputs.t_air_k is not None else inputs.t_react_k

        def add_weighted_fields(item: dict) -> dict:
            mol = item.get("mol")

            def multiply(value: float | None) -> float | None:
                if value is None or mol is None:
                    return None
                try:
                    return float(mol) * float(value)
                except (TypeError, ValueError):
                    return None

            item["hbar_kJ"] = multiply(item.get("hbar_kJ_per_kmol"))
            item["hbar_f_kJ"] = multiply(item.get("hbar_f_kJ_per_kmol"))
            item["hbar_s_kJ"] = multiply(item.get("hbar_s_kJ_per_kmol"))
            item["cpbar_kJ_per_k"] = multiply(item.get("cpbar_kJ_per_kmol_k"))
            item["sbar_kJ_per_k"] = multiply(item.get("sbar_kJ_per_kmol_k"))
            item["sbar_ref_kJ_per_k"] = multiply(item.get("sbar_ref_kJ_per_kmol_k"))
            item["sbar_s_kJ_per_k"] = multiply(item.get("sbar_s_kJ_per_kmol_k"))
            item["gbar_kJ"] = multiply(item.get("gbar_kJ_per_kmol"))
            item["g_elements_kJ"] = multiply(item.get("g_elements_kJ_per_kmol"))
            item["gfo_kJ"] = multiply(item.get("gfo_kJ_per_kmol"))
            return item

        def add_mixing_entropy(item: dict, p_pa: float) -> dict:
            mol_frac = item.get("mol_frac")
            sbar = item.get("sbar_kJ_per_kmol_k")
            if mol_frac is None or sbar is None:
                item["sbar_i_kJ_per_kmol_k"] = None
                item["sbar_i_kJ_per_k"] = None
                return item
            try:
                mol_frac_val = float(mol_frac)
                sbar_val = float(sbar)
            except (TypeError, ValueError):
                item["sbar_i_kJ_per_kmol_k"] = None
                item["sbar_i_kJ_per_k"] = None
                return item
            if mol_frac_val <= 0 or p_pa <= 0:
                item["sbar_i_kJ_per_kmol_k"] = None
                item["sbar_i_kJ_per_k"] = None
                return item
            p_i = mol_frac_val * p_pa
            if p_i <= 0:
                item["sbar_i_kJ_per_kmol_k"] = None
                item["sbar_i_kJ_per_k"] = None
                return item
            r_u = 8.314
            sbar_i = sbar_val - r_u * math.log(p_i / 101325.0)
            item["sbar_i_kJ_per_kmol_k"] = sbar_i
            item["sbar_i_kJ_per_k"] = None
            if item.get("mol") is not None:
                try:
                    item["sbar_i_kJ_per_k"] = float(item["mol"]) * sbar_i
                except (TypeError, ValueError):
                    item["sbar_i_kJ_per_k"] = None
            return item

        def normalize_products_list(items: list[dict], p_pa: float) -> list[dict]:
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
                normalized.append(add_mixing_entropy({
                    **item,
                    "mol_frac": (mol / total_mol) if total_mol else 0.0,
                    "mass_frac": (mass / total_mass) if total_mass else 0.0,
                }, p_pa))
            return normalized

        reactants_raw = [
            add_weighted_fields({
                "species": fuel.formula,
                "mol": 1.0,
                "mw": mw_for_species(fuel.formula),
                "hbar_kJ_per_kmol": enthalpy_kj_per_kmol(fuel.formula, t_fuel_k),
                "hbar_f_kJ_per_kmol": hf_kj_per_kmol(fuel.formula, t_fuel_k),
                "hbar_s_kJ_per_kmol": sensible_enthalpy_kj_per_kmol(
                    fuel.formula, t_fuel_k, t_ref_k
                ),
                "cpbar_kJ_per_kmol_k": cp_kj_per_kmol_k(fuel.formula, t_fuel_k),
                "sbar_kJ_per_kmol_k": s_kj_per_kmol_k(fuel.formula, t_fuel_k),
                "sbar_ref_kJ_per_kmol_k": s_kj_per_kmol_k(fuel.formula, t_ref_k),
                "sbar_s_kJ_per_kmol_k": sensible_entropy_kj_per_kmol_k(
                    fuel.formula, t_fuel_k, t_ref_k
                ),
                "gfo_kJ_per_kmol": g_kj_per_kmol(fuel.formula, t_fuel_k),
                "gbar_kJ_per_kmol": gbar_kj_per_kmol(fuel.formula, t_fuel_k),
                "g_elements_kJ_per_kmol": g_elements_kj_per_kmol(fuel.formula, t_fuel_k),
            }),
            add_weighted_fields({
                "species": "O2",
                "mol": air_o2,
                "mw": mw_for_species("O2"),
                "hbar_kJ_per_kmol": enthalpy_kj_per_kmol("O2", t_air_k),
                "hbar_f_kJ_per_kmol": hf_kj_per_kmol("O2", t_air_k),
                "hbar_s_kJ_per_kmol": sensible_enthalpy_kj_per_kmol(
                    "O2", t_air_k, t_ref_k
                ),
                "cpbar_kJ_per_kmol_k": cp_kj_per_kmol_k("O2", t_air_k),
                "sbar_kJ_per_kmol_k": s_kj_per_kmol_k("O2", t_air_k),
                "sbar_ref_kJ_per_kmol_k": s_kj_per_kmol_k("O2", t_ref_k),
                "sbar_s_kJ_per_kmol_k": sensible_entropy_kj_per_kmol_k(
                    "O2", t_air_k, t_ref_k
                ),
                "gfo_kJ_per_kmol": g_kj_per_kmol("O2", t_air_k),
                "gbar_kJ_per_kmol": gbar_kj_per_kmol("O2", t_air_k),
                "g_elements_kJ_per_kmol": g_elements_kj_per_kmol("O2", t_air_k),
            }),
            add_weighted_fields({
                "species": "N2",
                "mol": air_n2,
                "mw": mw_for_species("N2"),
                "hbar_kJ_per_kmol": enthalpy_kj_per_kmol("N2", t_air_k),
                "hbar_f_kJ_per_kmol": hf_kj_per_kmol("N2", t_air_k),
                "hbar_s_kJ_per_kmol": sensible_enthalpy_kj_per_kmol(
                    "N2", t_air_k, t_ref_k
                ),
                "cpbar_kJ_per_kmol_k": cp_kj_per_kmol_k("N2", t_air_k),
                "sbar_kJ_per_kmol_k": s_kj_per_kmol_k("N2", t_air_k),
                "sbar_ref_kJ_per_kmol_k": s_kj_per_kmol_k("N2", t_ref_k),
                "sbar_s_kJ_per_kmol_k": sensible_entropy_kj_per_kmol_k(
                    "N2", t_air_k, t_ref_k
                ),
                "gfo_kJ_per_kmol": g_kj_per_kmol("N2", t_air_k),
                "gbar_kJ_per_kmol": gbar_kj_per_kmol("N2", t_air_k),
                "g_elements_kJ_per_kmol": g_elements_kj_per_kmol("N2", t_air_k),
            }),
        ]

        def enthalpy_total_from_species(species_mol: dict[str, float], t_k: float) -> float | None:
            total = 0.0
            for name, mol in species_mol.items():
                if not mol:
                    continue
                h_i = enthalpy_kj_per_kmol(name, t_k)
                if h_i is None:
                    return None
                total += mol * h_i
            return total

        def enthalpy_total_from_rows(rows: list[dict]) -> float | None:
            total = 0.0
            for item in rows:
                mol = item.get("mol")
                hbar = item.get("hbar_kJ_per_kmol")
                if mol is None or hbar is None:
                    return None
                total += float(mol) * float(hbar)
            return total

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

        h_react_kj = enthalpy_total_from_rows(reactants_raw)
        adiabatic_converged = None
        adiabatic_note = None
        adiabatic_iterations = None
        adiabatic_residual_kj = None

        def solve_adiabatic_temperature() -> tuple[float | None, object | None, str | None, int | None, float | None]:
            t_ad_k, result_ad, diagnostics = adiabatic_flame_temperature(
                fuel.formula,
                f_over_a,
                fuel.mw_kg_per_kmol,
                t_fuel_k,
                t_air_k,
                inputs.p_pa,
                inputs.air_model,
                inputs.mode,
            )
            return (
                t_ad_k,
                result_ad,
                diagnostics.get("note"),
                diagnostics.get("iterations"),
                diagnostics.get("residual_kj"),
            )

        temp_mode_used = inputs.temp_mode
        t_prod_k = inputs.t_k
        result = None
        if inputs.temp_mode == "adiabatic":
            t_ad_k, result_ad, ad_note, ad_iter, ad_residual = solve_adiabatic_temperature()
            if t_ad_k is None or result_ad is None:
                temp_mode_used = "fixed"
                adiabatic_note = ad_note or "Adiabatic solve unavailable; using Fixed-T evaluation."
                t_prod_k = inputs.t_k
                adiabatic_converged = False
                adiabatic_iterations = ad_iter
                adiabatic_residual_kj = ad_residual
            else:
                t_prod_k = t_ad_k
                result = result_ad
                adiabatic_note = ad_note
                adiabatic_converged = True
                adiabatic_iterations = ad_iter
                adiabatic_residual_kj = ad_residual

        hv_value, hv_note = heating_value_cantera(
            fuel.formula,
            fuel.mw_kg_per_kmol,
            inputs.hv_basis,
            inputs.hv_ref_t_k,
            inputs.fuel_phase,
            inputs.p_pa,
        )
        if result is None:
            ideal_result = products_ideal(
                fuel.formula,
                f_over_a,
                fuel.mw_kg_per_kmol,
                t_prod_k,
                inputs.air_model,
            )

            if inputs.mode == "dissociation":
                result = products_dissociation(
                    fuel.formula,
                    f_over_a,
                    fuel.mw_kg_per_kmol,
                    t_prod_k,
                    inputs.p_pa,
                    inputs.air_model,
                )
            else:
                result = ideal_result
        else:
            ideal_result = products_ideal(
                fuel.formula,
                f_over_a,
                fuel.mw_kg_per_kmol,
                t_prod_k,
                inputs.air_model,
            )

        hv_eq_value, hv_eq_note = heating_value_equilibrium(
            fuel.formula,
            fuel.mw_kg_per_kmol,
            inputs.hv_basis,
            inputs.hv_ref_t_k,
            inputs.fuel_phase,
            inputs.p_pa,
            result.products_mol if inputs.mode == "dissociation" else None,
        )

        def sum_weighted_from_list(rows: list[dict], value_key: str) -> float | None:
            total = 0.0
            for row in rows:
                mol = row.get("mol")
                value = row.get(value_key)
                if mol is None or value is None:
                    return None
                try:
                    total += float(mol) * float(value)
                except (TypeError, ValueError):
                    return None
            return total

        reactants = normalize_products_list(reactants_raw, inputs.p_pa)

        products_list = [
            add_weighted_fields({
                "species": key,
                "mol": value,
                "mw": mw_for_species(key),
                "hbar_kJ_per_kmol": enthalpy_kj_per_kmol(key, t_prod_k),
                "hbar_f_kJ_per_kmol": hf_kj_per_kmol(key, t_prod_k),
                "hbar_s_kJ_per_kmol": sensible_enthalpy_kj_per_kmol(
                    key, t_prod_k, t_ref_k
                ),
                "cpbar_kJ_per_kmol_k": cp_kj_per_kmol_k(key, t_prod_k),
                "sbar_kJ_per_kmol_k": s_kj_per_kmol_k(key, t_prod_k),
                "sbar_ref_kJ_per_kmol_k": s_kj_per_kmol_k(key, t_ref_k),
                "sbar_s_kJ_per_kmol_k": sensible_entropy_kj_per_kmol_k(
                    key, t_prod_k, t_ref_k
                ),
                "gfo_kJ_per_kmol": g_kj_per_kmol(key, t_prod_k),
                "gbar_kJ_per_kmol": gbar_kj_per_kmol(key, t_prod_k),
                "g_elements_kJ_per_kmol": g_elements_kj_per_kmol(key, t_prod_k),
            })
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
        products_list = normalize_products_list(products_list, inputs.p_pa)

        ideal_products_list = [
            add_weighted_fields({
                "species": key,
                "mol": value,
                "mw": mw_for_species(key),
                "hbar_kJ_per_kmol": enthalpy_kj_per_kmol(key, t_prod_k),
                "hbar_f_kJ_per_kmol": hf_kj_per_kmol(key, t_prod_k),
                "hbar_s_kJ_per_kmol": sensible_enthalpy_kj_per_kmol(
                    key, t_prod_k, t_ref_k
                ),
                "cpbar_kJ_per_kmol_k": cp_kj_per_kmol_k(key, t_prod_k),
                "sbar_kJ_per_kmol_k": s_kj_per_kmol_k(key, t_prod_k),
                "sbar_ref_kJ_per_kmol_k": s_kj_per_kmol_k(key, t_ref_k),
                "sbar_s_kJ_per_kmol_k": sensible_entropy_kj_per_kmol_k(
                    key, t_prod_k, t_ref_k
                ),
                "gfo_kJ_per_kmol": g_kj_per_kmol(key, t_prod_k),
                "gbar_kJ_per_kmol": gbar_kj_per_kmol(key, t_prod_k),
                "g_elements_kJ_per_kmol": g_elements_kj_per_kmol(key, t_prod_k),
            })
            for key, value in ideal_result.products_mol.items()
        ]
        ideal_products_list = normalize_products_list(ideal_products_list, inputs.p_pa)

        def sum_weighted_consistency(rows: list[dict], value_key: str, weighted_key: str) -> dict[str, float | None]:
            if not rows:
                return {"sum_weighted": None, "sum_from_value": None, "residual": None}
            sum_weighted = 0.0
            sum_from_value = 0.0
            for item in rows:
                mol = item.get("mol")
                value = item.get(value_key)
                weighted = item.get(weighted_key)
                if mol is None or value is None or weighted is None:
                    return {"sum_weighted": None, "sum_from_value": None, "residual": None}
                try:
                    sum_from_value += float(mol) * float(value)
                    sum_weighted += float(weighted)
                except (TypeError, ValueError):
                    return {"sum_weighted": None, "sum_from_value": None, "residual": None}
            return {
                "sum_weighted": sum_weighted,
                "sum_from_value": sum_from_value,
                "residual": sum_weighted - sum_from_value,
            }

        def sum_frac(rows: list[dict], key: str) -> float | None:
            if not rows:
                return None
            total = 0.0
            for item in rows:
                value = item.get(key)
                if value is None:
                    return None
                try:
                    total += float(value)
                except (TypeError, ValueError):
                    return None
            return total

        def min_mol_amount(species_mol: dict[str, float]) -> float | None:
            if not species_mol:
                return None
            try:
                return min(float(val) for val in species_mol.values())
            except (TypeError, ValueError):
                return None

        def percent_dissociation(ideal_val: float | None, eq_val: float | None) -> float | None:
            if ideal_val is None:
                return None
            try:
                ideal = float(ideal_val)
                eq = float(eq_val) if eq_val is not None else None
            except (TypeError, ValueError):
                return None
            if eq is None or ideal <= 0.0:
                return None
            return (ideal - eq) / ideal * 100.0

        ideal_co2 = ideal_result.products_mol.get("CO2", 0.0)
        ideal_h2o = ideal_result.products_mol.get("H2O", 0.0)
        eq_co2 = result.products_mol.get("CO2", 0.0)
        eq_h2o = result.products_mol.get("H2O", 0.0)
        percent_co2 = percent_dissociation(ideal_co2, eq_co2) if inputs.mode == "dissociation" else None
        percent_h2o = percent_dissociation(ideal_h2o, eq_h2o) if inputs.mode == "dissociation" else None

        thermo_consistency_products = {
            "hbar": sum_weighted_consistency(products_list, "hbar_kJ_per_kmol", "hbar_kJ"),
            "sbar": sum_weighted_consistency(products_list, "sbar_kJ_per_kmol_k", "sbar_kJ_per_k"),
            "gbar": sum_weighted_consistency(products_list, "gbar_kJ_per_kmol", "gbar_kJ"),
        }
        thermo_consistency_ideal = {
            "hbar": sum_weighted_consistency(ideal_products_list, "hbar_kJ_per_kmol", "hbar_kJ"),
            "sbar": sum_weighted_consistency(ideal_products_list, "sbar_kJ_per_kmol_k", "sbar_kJ_per_k"),
            "gbar": sum_weighted_consistency(ideal_products_list, "gbar_kJ_per_kmol", "gbar_kJ"),
        }
        sum_x_products = sum_frac(products_list, "mol_frac")
        sum_y_products = sum_frac(products_list, "mass_frac")
        sum_x_ideal = sum_frac(ideal_products_list, "mol_frac")
        sum_y_ideal = sum_frac(ideal_products_list, "mass_frac")
        min_mol_products = min_mol_amount(result.products_mol)
        nonnegative_products = min_mol_products is None or min_mol_products >= -1.0e-12
        comparison_basis = "fixed" if temp_mode_used == "fixed" else "adiabatic-common"
        element_residuals = {
            el: element_totals_from_species(result.products_mol).get(el, 0.0) - reactant_totals.get(el, 0.0)
            for el in elements
        }
        element_residual_max = max((abs(val) for val in element_residuals.values()), default=None)

        h_prod_kj = enthalpy_total_from_species(result.products_mol, t_prod_k)
        delta_h_kj = None
        delta_h_norm = None
        if h_react_kj is not None and h_prod_kj is not None:
            delta_h_kj = h_prod_kj - h_react_kj
            denom = max(abs(h_react_kj), 1.0)
            delta_h_norm = delta_h_kj / denom

        desired_t_prod_k = inputs.t_k
        delta_t_k = t_prod_k - desired_t_prod_k if desired_t_prod_k is not None else None

        s_prod_std_kj_per_k = sum_weighted_from_list(products_list, "sbar_kJ_per_kmol_k")
        s_prod_mix_kj_per_k = sum_weighted_from_list(products_list, "sbar_i_kJ_per_kmol_k")
        g_prod_std_kj = sum_weighted_from_list(products_list, "gbar_kJ_per_kmol")

        derivation_text = latex_derivation(
            fuel.formula,
            f_over_a,
            fuel.mw_kg_per_kmol,
            inputs.fuel_phase,
            inputs.hv_basis,
            inputs.hv_ref_t_k,
            inputs.t_k,
            inputs.p_pa,
            result.products_mol if inputs.mode == "dissociation" else None,
            min_mol=1e-6,
            air_model=inputs.air_model,
            mixture_input_mode=mixture_input_mode,
            phi_input=phi_input,
            f_st=f_st,
            phi_used=phi_used,
            afr_used=afr_used,
            temp_mode=inputs.temp_mode,
            t_prod_desired_k=inputs.t_k,
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
            "chemistry_model": "Equilibrium (dissociation)" if inputs.mode == "dissociation" else "Ideal (no dissociation)",
            "temperature_mode": "Adiabatic solve" if temp_mode_used == "adiabatic" else "Fixed-T evaluation",
            "model_description": (
                "Allows chemical equilibrium and dissociation of species at high temperature. Product composition is determined by minimizing Gibbs free energy at constant temperature and pressure."
                if inputs.mode == "dissociation"
                else "Assumes complete combustion with fixed product composition and no chemical dissociation. Products are determined by stoichiometry only."
            )
            + " "
            + (
                "Solves for the product temperature such that total enthalpy of reactants equals products (H_{react} = H_{prod})."
                if temp_mode_used == "adiabatic"
                else "Computes thermodynamic properties at a user-specified product temperature. Energy conservation is not enforced."
            ),
            "inputs": {
                "mixture_input_mode": mixture_input_mode,
                "f_input": f_input,
                "phi_input": phi_input,
                "f_used": f_over_a,
                "phi_used": phi_used,
                "f_st": f_st,
                "afr": afr_used,
                "afr_st": afr_st,
                "f_over_a": inputs.f_over_a,
                "t_k": inputs.t_k,
                "t_fuel_k": t_fuel_k,
                "t_air_k": t_air_k,
                "t_prod_k": t_prod_k,
                "temp_mode": inputs.temp_mode,
                "p_pa": inputs.p_pa,
                "air_model": inputs.air_model,
                "fuel_phase": inputs.fuel_phase,
                "hv_basis": inputs.hv_basis,
                "hv_ref_t_k": inputs.hv_ref_t_k,
            },
            "result": {
                "phi": phi_used,
                "afr": afr_used,
                "afr_stoich": afr_st,
                "regime": "lean" if phi_used < 1.0 else "stoichiometric" if phi_used == 1.0 else "rich",
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
                    "elements": list(gas.element_names) if gas is not None else [],
                    "species_count": gas.n_species if gas is not None else None,
                    "reaction_count": gas.n_reactions if gas is not None else None,
                    "cantera_available": cantera_ok,
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
                "analysis": {
                    "mixture_input_mode": mixture_input_mode,
                    "f_input": f_input,
                    "phi_input": phi_input,
                    "f_used": f_over_a,
                    "phi_used": phi_used,
                    "f_st": f_st,
                    "afr": afr_used,
                    "afr_st": afr_st,
                    "analysis_mode": temp_mode_used,
                    "requested_mode": inputs.temp_mode,
                    "desired_t_prod_k": desired_t_prod_k,
                    "solved_t_ad_k": t_prod_k if temp_mode_used == "adiabatic" else None,
                    "delta_t_k": delta_t_k,
                    "h_react_kj": h_react_kj,
                    "h_prod_kj": h_prod_kj,
                    "delta_h_kj": delta_h_kj,
                    "delta_h_normalized": delta_h_norm,
                    "s_prod_std_kj_per_k": s_prod_std_kj_per_k,
                    "s_prod_mix_kj_per_k": s_prod_mix_kj_per_k,
                    "g_prod_std_kj": g_prod_std_kj,
                    "converged": adiabatic_converged,
                    "iterations": adiabatic_iterations,
                    "residual_kj": adiabatic_residual_kj,
                    "note": adiabatic_note,
                },
                "dissociation": {
                    "comparison_basis": comparison_basis,
                    "compare_t_k": t_prod_k,
                    "percent_dissociation_co2": percent_co2,
                    "percent_dissociation_h2o": percent_h2o,
                    "ideal_amounts": {
                        "CO2": ideal_co2,
                        "H2O": ideal_h2o,
                    },
                    "equilibrium_amounts": {
                        "CO2": eq_co2 if inputs.mode == "dissociation" else None,
                        "H2O": eq_h2o if inputs.mode == "dissociation" else None,
                    },
                },
                "sanity_checks": {
                    "element_residual_max": element_residual_max,
                    "sum_x_products": sum_x_products,
                    "sum_y_products": sum_y_products,
                    "sum_x_ideal": sum_x_ideal,
                    "sum_y_ideal": sum_y_ideal,
                    "min_mol_products": min_mol_products,
                    "nonnegative_products": nonnegative_products,
                    "thermo_sum_products": thermo_consistency_products,
                    "thermo_sum_ideal": thermo_consistency_ideal,
                    "comparison_consistent": comparison_basis == "fixed" or comparison_basis == "adiabatic-common",
                    "adiabatic_residual_kj": adiabatic_residual_kj,
                    "dissociation_bounds_ok": (
                        (percent_co2 is None or math.isfinite(percent_co2))
                        and (percent_h2o is None or math.isfinite(percent_h2o))
                    ),
                },
            },
            "derivation": derivation_text,
            "derivation_markdown": derivation_markdown,
        }
        return jsonable_encoder(payload)
    except Exception as exc:
        print("Fuel analysis error:", exc)
        raise HTTPException(status_code=500, detail=f"Fuel analysis failed: {exc}") from exc


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


@app.post("/api/fuel/analysis/dissociation-sweep")
def fuel_analysis_dissociation_sweep(inputs: FuelDissociationSweepInputs):
    path = _fuel_data_path()
    if not path.exists():
        raise HTTPException(status_code=500, detail="fuel_data.json not found. Run prototype/build_fuel_data.py")

    fuels = load_fuels(path)
    fuel = fuels.get(inputs.fuel_id)
    if fuel is None:
        raise HTTPException(status_code=404, detail=f"Fuel '{inputs.fuel_id}' not found")

    try:
        payload = fuel_dissociation_sweep(inputs, fuel_formula=fuel.formula, fuel_mw=fuel.mw_kg_per_kmol)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return jsonable_encoder(payload)


@app.post("/api/fuel/analysis/dissociation-single")
def fuel_analysis_dissociation_single(inputs: FuelDissociationSingleInputs):
    path = _fuel_data_path()
    if not path.exists():
        raise HTTPException(status_code=500, detail="fuel_data.json not found. Run prototype/build_fuel_data.py")

    fuels = load_fuels(path)
    fuel = fuels.get(inputs.fuel_id)
    if fuel is None:
        raise HTTPException(status_code=404, detail=f"Fuel '{inputs.fuel_id}' not found")

    try:
        payload = fuel_dissociation_single(inputs, fuel_formula=fuel.formula, fuel_mw=fuel.mw_kg_per_kmol)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return jsonable_encoder(payload)
