from __future__ import annotations

from dataclasses import dataclass
import json
import math
from pathlib import Path
from typing import Dict, Tuple

MW_O2 = 31.998
MW_N2 = 28.0134
AIR_N2_O2 = 3.76
MW_H2O = 18.01528
WGS_FRACTION_MIN = 0.2
WGS_FRACTION_MAX = 1.0
WGS_TEMP_LOW = 1000.0
WGS_TEMP_HIGH = 2500.0

AIR_MODELS = {
    "dry_air": {
        "n2_o2": AIR_N2_O2,
        "label": r"O_2 + 3.76\,N_2",
    },
    "oxygen": {
        "n2_o2": 0.0,
        "label": r"O_2",
    },
}


def air_model_params(air_model: str | None) -> tuple[float, str]:
    model_key = air_model or "dry_air"
    model = AIR_MODELS.get(model_key, AIR_MODELS["dry_air"])
    return float(model["n2_o2"]), str(model["label"])


@dataclass(frozen=True)
class Fuel:
    fuel_id: str
    name: str
    formula: str
    mw_kg_per_kmol: float
    lhv_kJ_per_kg: float | None


@dataclass
class CombustionResult:
    phi: float
    f_over_a: float
    afr: float
    afr_stoich: float
    products_mol: Dict[str, float]
    pollutants_mol: Dict[str, float]
    note: str = ""


def load_fuels(path: Path) -> Dict[str, Fuel]:
    data = json.loads(path.read_text(encoding="utf-8"))
    fuels: Dict[str, Fuel] = {}
    for item in data:
        fuels[item["fuel_id"]] = Fuel(
            fuel_id=item["fuel_id"],
            name=item["name"],
            formula=item["formula"],
            mw_kg_per_kmol=float(item["mw_kg_per_kmol"]),
            lhv_kJ_per_kg=float(item["lhv_kJ_per_kg"]) if item["lhv_kJ_per_kg"] else None,
        )
    return fuels


def parse_formula(formula: str) -> Dict[str, float]:
    import re

    tokens = re.findall(r"([A-Z][a-z]?)(\d*)", formula)
    counts: Dict[str, float] = {}
    for element, count_str in tokens:
        count = float(count_str) if count_str else 1.0
        counts[element] = counts.get(element, 0.0) + count
    return counts


def stoich_oxygen_moles(formula: str) -> float:
    counts = parse_formula(formula)
    c = counts.get("C", 0.0)
    h = counts.get("H", 0.0)
    o = counts.get("O", 0.0)
    return c + h / 4.0 - o / 2.0


def stoich_afr(formula: str, mw_fuel: float, air_model: str | None = None) -> float:
    a = stoich_oxygen_moles(formula)
    if a <= 0:
        raise ValueError("Stoichiometric oxygen is non-positive.")
    n2_o2_ratio, _ = air_model_params(air_model)
    mass_air = a * (MW_O2 + n2_o2_ratio * MW_N2)
    f_over_a_stoich = mw_fuel / mass_air
    return 1.0 / f_over_a_stoich


def equivalence_ratio(f_over_a: float, afr_stoich: float) -> float:
    if f_over_a <= 0:
        raise ValueError("F/A must be positive.")
    f_over_a_stoich = 1.0 / afr_stoich
    return f_over_a / f_over_a_stoich


def select_fuel_species(formula: str, gas) -> tuple[str | None, str | None]:
    if formula in gas.species_names:
        return formula, None

    counts = parse_formula(formula)
    c = counts.get("C", 0.0)
    h = counts.get("H", 0.0)
    o = counts.get("O", 0.0)

    if o > 0 and "CH3OH" in gas.species_names:
        return "CH3OH", f"Using CH3OH surrogate for {formula}."

    candidates = [
        spec
        for spec in ["CH4", "C2H6", "C2H4", "C2H2", "C3H8"]
        if spec in gas.species_names
    ]
    if not candidates or c <= 0:
        return None, f"Fuel {formula} not in mechanism."

    target_ratio = h / c if c > 0 else 0.0
    best_spec = None
    best_diff = None
    for spec in candidates:
        spec_counts = parse_formula(spec)
        spec_c = spec_counts.get("C", 0.0)
        spec_h = spec_counts.get("H", 0.0)
        if spec_c <= 0:
            continue
        spec_ratio = spec_h / spec_c
        diff = abs(spec_ratio - target_ratio)
        if best_diff is None or diff < best_diff:
            best_diff = diff
            best_spec = spec

    if best_spec is None:
        return None, f"Fuel {formula} not in mechanism."
    return best_spec, f"Using {best_spec} surrogate for {formula}."


_FUEL_MECH_CACHE: dict[str, tuple[str, str] | None] = {}


def _species_matches_formula(species_comp: dict[str, float], target: dict[str, float]) -> bool:
    for element, count in target.items():
        if species_comp.get(element, 0.0) != count:
            return False
    for element, count in species_comp.items():
        if count and element not in target:
            return False
    return True


def _surrogate_score(species_comp: dict[str, float], target: dict[str, float]) -> float | None:
    target_c = target.get("C", 0.0)
    target_h = target.get("H", 0.0)
    if target_c <= 0 or target_h <= 0:
        return None
    for element, count in species_comp.items():
        if count and target.get(element, 0.0) == 0.0:
            return None
    for element in ("C", "H", "O", "N"):
        if target.get(element, 0.0) > 0 and species_comp.get(element, 0.0) == 0.0:
            return None
    spec_c = species_comp.get("C", 0.0)
    spec_h = species_comp.get("H", 0.0)
    if spec_c <= 0 or spec_h <= 0:
        return None
    target_hc = target_h / target_c
    spec_hc = spec_h / spec_c
    carbon_penalty = abs(spec_c - target_c) / max(target_c, 1.0)
    ratio_penalty = abs(spec_hc - target_hc)
    return carbon_penalty + ratio_penalty


def find_mechanism_for_fuel(formula: str) -> tuple[str | None, str | None, str | None]:
    if formula in _FUEL_MECH_CACHE:
        cached = _FUEL_MECH_CACHE[formula]
        if cached is None:
            return None, None, f"Fuel {formula} not in available mechanisms."
        mech, species = cached
        return mech, species, None

    if not cantera_available():
        return None, None, "Cantera unavailable."

    import cantera as ct

    preferred = [
        "gri30.yaml",
        "gri30_highT.yaml",
        "example_data/n-hexane-NUIG-2015.yaml",
        "nDodecane_Reitz.yaml",
    ]
    all_mechs = [name for name in ct.list_data_files() if name.endswith(".yaml")]
    target = parse_formula(formula)
    c = target.get("C", 0.0)
    o = target.get("O", 0.0)
    if c >= 10:
        preferred = [
            "nDodecane_Reitz.yaml",
            "example_data/n-hexane-NUIG-2015.yaml",
            "gri30.yaml",
            "gri30_highT.yaml",
        ]
    elif c >= 4:
        preferred = [
            "example_data/n-hexane-NUIG-2015.yaml",
            "nDodecane_Reitz.yaml",
            "gri30.yaml",
            "gri30_highT.yaml",
        ]
    elif o > 0:
        preferred = [
            "gri30.yaml",
            "gri30_highT.yaml",
            "example_data/n-hexane-NUIG-2015.yaml",
            "nDodecane_Reitz.yaml",
        ]
    ordered = preferred + [name for name in all_mechs if name not in preferred]
    for mech in ordered:
        try:
            gas = ct.Solution(mech)
        except Exception:
            continue
        for spec in gas.species():
            if _species_matches_formula(spec.composition, target):
                _FUEL_MECH_CACHE[formula] = (mech, spec.name)
                return mech, spec.name, None

    best = None
    for mech in ordered:
        try:
            gas = ct.Solution(mech)
        except Exception:
            continue
        for spec in gas.species():
            score = _surrogate_score(spec.composition, target)
            if score is None:
                continue
            if best is None or score < best[2]:
                best = (mech, spec.name, score)

    if best is not None:
        mech, spec, _ = best
        _FUEL_MECH_CACHE[formula] = (mech, spec)
        return (
            mech,
            spec,
            f"Using {spec} surrogate for {formula}. "
            "Dissociation species, heating value, and pollutant estimates are approximate.",
        )

    _FUEL_MECH_CACHE[formula] = None
    return None, None, f"Fuel {formula} not in available mechanisms."


def heating_value_cantera(
    fuel_formula: str,
    mw_fuel: float,
    basis: str,
    ref_t_k: float,
    fuel_phase: str,
    p_pa: float = 101325.0,
) -> tuple[float | None, str | None]:
    if not cantera_available():
        return None, "Cantera unavailable."

    import cantera as ct

    mech, fuel_spec, note = find_mechanism_for_fuel(fuel_formula)
    if mech is None or fuel_spec is None:
        return None, note or "Fuel not in mechanism; heating value not computed."

    gas = ct.Solution(mech)
    gas.TP = ref_t_k, p_pa

    def gas_enthalpy(species: str) -> float | None:
        idx = gas.species_index(species)
        if idx < 0:
            return None
        return gas.partial_molar_enthalpies[idx]

    def liquid_enthalpy(species: str) -> float | None:
        try:
            liquid = ct.Solution("liquidvapor.yaml")
            if species not in liquid.species_names:
                return None
            liquid.TP = ref_t_k, p_pa
            liquid.X = {species: 1.0}
            idx = liquid.species_index(species)
            if idx < 0:
                return None
            return liquid.partial_molar_enthalpies[idx]
        except Exception:
            return None

    fuel_h = None
    note = note
    if fuel_phase == "liquid":
        fuel_h = liquid_enthalpy(fuel_spec)
        if fuel_h is None:
            fuel_h = gas_enthalpy(fuel_spec)
            note = "Liquid phase not available; using gas enthalpy."
    else:
        fuel_h = gas_enthalpy(fuel_spec)

    if fuel_h is None:
        return None, "Fuel enthalpy unavailable."

    o2_h = gas_enthalpy("O2")
    co2_h = gas_enthalpy("CO2")
    h2o_gas_h = gas_enthalpy("H2O")
    if o2_h is None or co2_h is None or h2o_gas_h is None:
        return None, "Gas enthalpy data unavailable."

    counts = parse_formula(fuel_formula)
    c = counts.get("C", 0.0)
    h = counts.get("H", 0.0)
    o = counts.get("O", 0.0)
    a = stoich_oxygen_moles(fuel_formula)

    h_reactants = fuel_h + a * o2_h
    h2o_h = h2o_gas_h
    if basis.lower() == "hhv":
        try:
            water = ct.Water()
            water.TP = ref_t_k, p_pa
            h2o_h = water.enthalpy_mass * MW_H2O
        except Exception:
            h2o_h = h2o_gas_h
            note = (note + " " if note else "") + "HHV uses gas water enthalpy."

    h_products = c * co2_h + (h / 2.0) * h2o_h
    hv_j_per_kmol = -(h_products - h_reactants)
    hv_kj_per_kg = hv_j_per_kmol / 1000.0 / mw_fuel
    return hv_kj_per_kg, note


def heating_value_equilibrium(
    fuel_formula: str,
    mw_fuel: float,
    basis: str,
    ref_t_k: float,
    fuel_phase: str,
    p_pa: float,
    products_mol: Dict[str, float] | None,
) -> tuple[float | None, str | None]:
    if products_mol is None:
        return None, "Requires dissociation products."
    if not cantera_available():
        return None, "Cantera unavailable."
    try:
        import cantera as ct

        gas = ct.Solution("gri30.yaml")
        gas.TP = ref_t_k, p_pa

        def gas_enthalpy(species: str) -> float | None:
            idx = gas.species_index(species)
            if idx < 0:
                return None
            return gas.partial_molar_enthalpies[idx]

        def liquid_enthalpy(species: str) -> float | None:
            try:
                liquid = ct.Solution("liquidvapor.yaml")
                if species not in liquid.species_names:
                    return None
                liquid.TP = ref_t_k, p_pa
                liquid.X = {species: 1.0}
                idx = liquid.species_index(species)
                if idx < 0:
                    return None
                return liquid.partial_molar_enthalpies[idx]
            except Exception:
                return None

        def fuel_enthalpy() -> float | None:
            fuel_map = {
                "CH4": "CH4",
                "H2": "H2",
                "CO": "CO",
                "C2H2": "C2H2",
                "C2H4": "C2H4",
                "C2H6": "C2H6",
                "C3H8": "C3H8",
                "CH3OH": "CH3OH",
            }
            fuel_spec = fuel_map.get(fuel_formula)
            if fuel_spec is None:
                return None
            if fuel_phase == "liquid":
                liquid_h = liquid_enthalpy(fuel_spec)
                if liquid_h is not None:
                    return liquid_h
            return gas_enthalpy(fuel_spec)

        fuel_h = fuel_enthalpy()
        o2_h = gas_enthalpy("O2")
        if fuel_h is None or o2_h is None:
            raise ValueError("Missing reactant enthalpy.")

        a = stoich_oxygen_moles(fuel_formula)
        h_reactants = fuel_h + a * o2_h

        h_products = 0.0
        water_h = gas_enthalpy("H2O")
        if basis.lower() == "hhv":
            try:
                water = ct.Water()
                water.TP = ref_t_k, p_pa
                water_h = water.enthalpy_mass * MW_H2O
            except Exception:
                return None, "HHV uses gas water enthalpy."
        if water_h is None:
            raise ValueError("Missing H2O enthalpy.")

        graphite_h = None
        try:
            graphite = ct.Solution("graphite.yaml")
            graphite.TP = ref_t_k, p_pa
            graphite_h = graphite.enthalpy_mole
        except Exception:
            graphite_h = None

        for species, mol in products_mol.items():
            if mol <= 0:
                continue
            if species == "H2O":
                h_products += mol * water_h
                continue
            if species == "C_s":
                if graphite_h is None:
                    raise ValueError("Missing graphite enthalpy.")
                h_products += mol * graphite_h
                continue
            species_h = gas_enthalpy(species)
            if species_h is None:
                raise ValueError("Missing species enthalpy.")
            h_products += mol * species_h

        hv_eq_j_per_kmol = -(h_products - h_reactants)
        hv_eq_value = hv_eq_j_per_kmol / 1000.0 / mw_fuel
        return hv_eq_value, None
    except Exception as exc:
        return None, str(exc)


def wgs_fraction(t_k: float | None) -> float:
    if t_k is None:
        return 0.5
    if t_k <= WGS_TEMP_LOW:
        return WGS_FRACTION_MAX
    if t_k >= WGS_TEMP_HIGH:
        return WGS_FRACTION_MIN
    span = WGS_TEMP_HIGH - WGS_TEMP_LOW
    frac = WGS_FRACTION_MAX - (t_k - WGS_TEMP_LOW) * (WGS_FRACTION_MAX - WGS_FRACTION_MIN) / span
    return max(WGS_FRACTION_MIN, min(WGS_FRACTION_MAX, frac))


def products_ideal(
    formula: str,
    f_over_a: float,
    mw_fuel: float,
    t_k: float | None = None,
    air_model: str | None = None,
) -> CombustionResult:
    counts = parse_formula(formula)
    c = counts.get("C", 0.0)
    h = counts.get("H", 0.0)
    o = counts.get("O", 0.0)
    n = counts.get("N", 0.0)

    a = stoich_oxygen_moles(formula)
    afr_st = stoich_afr(formula, mw_fuel, air_model)
    phi = equivalence_ratio(f_over_a, afr_st)

    n2_o2_ratio, _ = air_model_params(air_model)
    air_o2 = a / phi
    air_n2 = air_o2 * n2_o2_ratio
    fuel_n2 = n / 2.0

    if phi <= 1.0:
        co2 = c
        h2o = h / 2.0
        o2 = max(0.0, air_o2 - a)
        co = 0.0
        h2 = 0.0
        c_s = 0.0
    else:
        o_atoms = 2.0 * air_o2 + o
        co2 = min(c, o_atoms / 2.0)
        o_atoms -= 2.0 * co2
        co = min(c - co2, o_atoms)
        o_atoms -= co
        h2o = min(h / 2.0, o_atoms)
        o_atoms -= h2o
        c_s = max(0.0, c - co2 - co)
        h2 = max(0.0, (h / 2.0) - h2o)
        # Apply a simple reverse water-gas shift adjustment for rich mixtures.
        wgs_extent = min(co2, h2) * wgs_fraction(t_k)
        if wgs_extent > 0:
            co2 -= wgs_extent
            h2 -= wgs_extent
            co += wgs_extent
            h2o += wgs_extent
        o2 = 0.0
    n2 = air_n2 + fuel_n2
    products = {
        "CO2": co2,
        "H2O": h2o,
        "O2": o2,
        "N2": n2,
        "CO": co,
        "H2": h2,
        "C_s": c_s,
    }

    products = {k: v for k, v in products.items() if v > 0.0}

    afr = 1.0 / f_over_a
    pollutants = {
        "CO": products.get("CO", 0.0),
        "NOx": 0.0,
        "Unburned": products.get("C_s", 0.0) + products.get("H2", 0.0),
    }

    return CombustionResult(
        phi=phi,
        f_over_a=f_over_a,
        afr=afr,
        afr_stoich=afr_st,
        products_mol=products,
        pollutants_mol=pollutants,
    )


def cantera_available() -> bool:
    try:
        import cantera  # noqa: F401

        return True
    except Exception:
        return False


def _species_enthalpy_mole(gas, species: str, t_k: float, p_pa: float, fuel_formula: str, fuel_spec: str | None) -> float | None:
    if species == "C_s":
        try:
            import cantera as ct

            graphite = ct.Solution("graphite.yaml")
            graphite.TP = t_k, p_pa
            return graphite.enthalpy_mole
        except Exception:
            return None

    species_name = species
    if species_name not in gas.species_names:
        if species_name == fuel_formula and fuel_spec and fuel_spec in gas.species_names:
            species_name = fuel_spec
        else:
            return None

    gas.TP = t_k, p_pa
    idx = gas.species_index(species_name)
    if idx < 0:
        return None
    return gas.partial_molar_enthalpies[idx]


def adiabatic_flame_temperature_ideal(
    formula: str,
    f_over_a: float,
    mw_fuel: float,
    t0_k: float,
    p_pa: float,
    air_model: str | None = None,
) -> tuple[float | None, str | None]:
    if not cantera_available():
        return None, "Cantera unavailable."
    try:
        import cantera as ct
    except Exception:
        return None, "Cantera unavailable."

    mech, fuel_spec, fuel_note = find_mechanism_for_fuel(formula)
    if mech is None:
        return None, fuel_note or "Fuel not in mechanism."

    gas = ct.Solution(mech)

    afr_st = stoich_afr(formula, mw_fuel, air_model)
    phi = equivalence_ratio(f_over_a, afr_st)
    a = stoich_oxygen_moles(formula)
    n2_o2_ratio, _ = air_model_params(air_model)
    air_o2 = a / phi
    air_n2 = air_o2 * n2_o2_ratio

    reactants = {
        formula: 1.0,
        "O2": air_o2,
        "N2": air_n2,
    }

    h_reactants = 0.0
    for species, mol in reactants.items():
        if mol <= 0.0:
            continue
        h_i = _species_enthalpy_mole(gas, species, t0_k, p_pa, formula, fuel_spec)
        if h_i is None:
            return None, f"Missing enthalpy for {species}."
        h_reactants += mol * h_i

    products = products_ideal(formula, f_over_a, mw_fuel, None, air_model).products_mol

    def enthalpy_balance(t_k: float) -> float | None:
        h_products = 0.0
        for species, mol in products.items():
            if mol <= 0.0:
                continue
            h_i = _species_enthalpy_mole(gas, species, t_k, p_pa, formula, fuel_spec)
            if h_i is None:
                return None
            h_products += mol * h_i
        return h_products - h_reactants

    low = 300.0
    high = 4000.0
    f_low = enthalpy_balance(low)
    f_high = enthalpy_balance(high)
    if f_low is None or f_high is None:
        return None, "Enthalpy evaluation failed."
    while f_low * f_high > 0 and high < 10000.0:
        high += 1000.0
        f_high = enthalpy_balance(high)
        if f_high is None:
            return None, "Enthalpy evaluation failed."

    if f_low * f_high > 0:
        return None, "No bracket found for adiabatic temperature."

    for _ in range(60):
        mid = 0.5 * (low + high)
        f_mid = enthalpy_balance(mid)
        if f_mid is None:
            return None, "Enthalpy evaluation failed."
        if abs(f_mid) < 1e-6:
            return mid, None
        if f_low * f_mid <= 0:
            high = mid
            f_high = f_mid
        else:
            low = mid
            f_low = f_mid

    return 0.5 * (low + high), None


def adiabatic_flame_temperature_equilibrium(
    formula: str,
    f_over_a: float,
    mw_fuel: float,
    t0_k: float,
    p_pa: float,
    air_model: str | None = None,
) -> tuple[float | None, str | None]:
    if not cantera_available():
        return None, "Cantera unavailable."
    try:
        import cantera as ct
    except Exception:
        return None, "Cantera unavailable."

    mech, fuel_spec, fuel_note = find_mechanism_for_fuel(formula)
    if mech is None or fuel_spec is None:
        return None, fuel_note or "Fuel not in mechanism."

    afr_st = stoich_afr(formula, mw_fuel, air_model)
    phi = equivalence_ratio(f_over_a, afr_st)
    a = stoich_oxygen_moles(formula)
    n2_o2_ratio, _ = air_model_params(air_model)
    air_o2 = a / phi
    air_n2 = air_o2 * n2_o2_ratio

    gas = ct.Solution(mech)
    reactant_comp = {fuel_spec: 1.0, "O2": air_o2, "N2": air_n2}
    gas.TPX = t0_k, p_pa, reactant_comp
    h_reactants = gas.enthalpy_mole

    def enthalpy_balance(t_k: float) -> float | None:
        try:
            gas.TPX = t_k, p_pa, reactant_comp
            gas.equilibrate("TP")
            return gas.enthalpy_mole - h_reactants
        except Exception:
            return None

    low = 300.0
    high = 4000.0
    f_low = enthalpy_balance(low)
    f_high = enthalpy_balance(high)
    if f_low is None or f_high is None:
        return None, "Equilibrium enthalpy evaluation failed."
    while f_low * f_high > 0 and high < 10000.0:
        high += 1000.0
        f_high = enthalpy_balance(high)
        if f_high is None:
            return None, "Equilibrium enthalpy evaluation failed."

    if f_low * f_high > 0:
        return None, "No bracket found for equilibrium adiabatic temperature."

    for _ in range(60):
        mid = 0.5 * (low + high)
        f_mid = enthalpy_balance(mid)
        if f_mid is None:
            return None, "Equilibrium enthalpy evaluation failed."
        if abs(f_mid) < 1e-6:
            return mid, None
        if f_low * f_mid <= 0:
            high = mid
            f_high = f_mid
        else:
            low = mid
            f_low = f_mid

    return 0.5 * (low + high), None


def products_dissociation(
    formula: str,
    f_over_a: float,
    mw_fuel: float,
    t_k: float,
    p_pa: float,
    air_model: str | None = None,
) -> CombustionResult:
    if not cantera_available():
        result = products_ideal(formula, f_over_a, mw_fuel, t_k, air_model)
        result.note = "Cantera unavailable; dissociation not computed."
        return result

    import cantera as ct

    afr_st = stoich_afr(formula, mw_fuel, air_model)
    phi = equivalence_ratio(f_over_a, afr_st)
    a = stoich_oxygen_moles(formula)
    n2_o2_ratio, _ = air_model_params(air_model)
    air_o2 = a / phi
    air_n2 = air_o2 * n2_o2_ratio
    reactant_total_mol = 1.0 + air_o2 + air_n2
    fuel_counts = parse_formula(formula)

    mech, fuel_spec, fuel_note = find_mechanism_for_fuel(formula)
    if mech is None or fuel_spec is None:
        result = products_ideal(formula, f_over_a, mw_fuel, t_k, air_model)
        result.note = fuel_note or "Fuel not in mechanism; dissociation not computed."
        return result

    gas = ct.Solution(mech)
    gas.TPX = t_k, p_pa, {
        fuel_spec: 1.0,
        "O2": air_o2,
        "N2": air_n2,
    }

    products = {}
    try:
        graphite = ct.Solution("graphite.yaml")
        mix = ct.MultiPhase()
        mix.add_phase(gas, reactant_total_mol)
        mix.add_phase(graphite, 1e-12)
        mix.TP = t_k, p_pa
        mix.equilibrate("TP")
        gas_moles = mix.phase_moles(0)
        carbon_moles = mix.phase_moles(1)
        products = {
            name: gas.X[i] * gas_moles
            for i, name in enumerate(gas.species_names)
            if gas.X[i] > 0
        }
        if carbon_moles > 0:
            products["C_s"] = carbon_moles
    except Exception:
        gas.equilibrate("TP")

        def element_totals_from_fractions() -> Dict[str, float]:
            totals = {"C": 0.0, "H": 0.0, "O": 0.0, "N": 0.0}
            for i, name in enumerate(gas.species_names):
                mol_frac = gas.X[i]
                if mol_frac <= 0:
                    continue
                counts = parse_formula(name)
                for el in totals:
                    totals[el] += mol_frac * counts.get(el, 0.0)
            return totals

        product_element_totals = element_totals_from_fractions()
        scale = 1.0
        for el in ("C", "H", "O", "N"):
            fuel_el = fuel_counts.get(el, 0.0)
            prod_el = product_element_totals.get(el, 0.0)
            if fuel_el > 0 and prod_el > 0:
                scale = fuel_el / prod_el
                break

        products = {
            name: gas.X[i] * scale
            for i, name in enumerate(gas.species_names)
            if gas.X[i] > 0
        }

    pollutants = {
        "CO": products.get("CO", 0.0),
        "NOx": products.get("NO", 0.0) + products.get("NO2", 0.0),
        "Unburned": products.get(fuel_spec, 0.0),
    }

    afr = 1.0 / f_over_a
    note = fuel_note or ""
    return CombustionResult(
        phi=phi,
        f_over_a=f_over_a,
        afr=afr,
        afr_stoich=afr_st,
        products_mol=products,
        pollutants_mol=pollutants,
        note=note,
    )


def latex_derivation(
    formula: str,
    f_over_a: float,
    mw_fuel: float,
    fuel_phase: str | None = None,
    hv_basis: str | None = None,
    hv_ref_t_k: float | None = None,
    t_prod_k: float | None = None,
    p_pa: float = 101325.0,
    products_mol: Dict[str, float] | None = None,
    min_mol: float = 1e-6,
    air_model: str | None = None,
) -> str:
    counts = parse_formula(formula)
    c = counts.get("C", 0.0)
    h = counts.get("H", 0.0)
    o = counts.get("O", 0.0)
    n = counts.get("N", 0.0)

    a = stoich_oxygen_moles(formula)
    afr_st = stoich_afr(formula, mw_fuel, air_model)
    phi = equivalence_ratio(f_over_a, afr_st)
    afr = 1.0 / f_over_a if f_over_a else float("nan")

    if products_mol is None:
        result = products_ideal(formula, f_over_a, mw_fuel, None, air_model)
        products_mol = result.products_mol
    ideal_result = products_ideal(formula, f_over_a, mw_fuel, None, air_model)

    def latex_species(species: str) -> str:
        import re

        out = species
        out = re.sub(r"_(\w+)", r"_{\1}", out)
        out = re.sub(r"([A-Za-z])([0-9]+)", r"\1_{\2}", out)
        return out

    def fmt_term(coeff: float, species: str) -> str:
        def fmt_coeff(value: float) -> str:
            if value == 0:
                return "0"
            abs_val = abs(value)
            if abs_val < 1e-3 or abs_val >= 1e3:
                mantissa, exp = f"{value:.2e}".split("e")
                exp_val = int(exp)
                return f"{mantissa}\\times 10^{{{exp_val}}}"
            return f"{value:.4g}"

        if coeff == 1:
            return f"{latex_species(species)}"
        return f"{fmt_coeff(coeff)}\\,{latex_species(species)}"

    def fmt_value(value: float) -> str:
        if value == 0:
            return "0"
        abs_val = abs(value)
        if abs_val < 1e-3 or abs_val >= 1e3:
            mantissa, exp = f"{value:.2e}".split("e")
            exp_val = int(exp)
            return f"{mantissa}\\times 10^{{{exp_val}}}"
        return f"{value:.4g}"

    n2_o2_ratio, air_model_label = air_model_params(air_model)
    air_o2 = a / phi
    air_n2 = air_o2 * n2_o2_ratio
    reactant_total_mol = 1.0 + air_o2 + air_n2
    reactant_total_mass = (
        mw_fuel
        + air_o2 * MW_O2
        + air_n2 * MW_N2
    )
    reactants = [
        latex_species(formula),
        f"{air_o2:.4g}\\,O_2",
    ]
    if air_n2 > 0:
        reactants.append(f"{air_n2:.4g}\\,N_2")
    products = []
    filtered = [
        (species, coeff)
        for species, coeff in products_mol.items()
        if coeff >= min_mol
    ]
    soot_mol = ideal_result.products_mol.get("C_s", 0.0)
    if phi > 1.0 and soot_mol >= min_mol:
        if not any(species == "C_s" for species, _ in filtered):
            filtered.append(("C_s", soot_mol))
    filtered.sort(key=lambda item: item[1], reverse=True)
    for species, coeff in filtered:
        products.append(fmt_term(coeff, species))

    def wrap_terms(terms: list[str], per_line: int) -> list[str]:
        if per_line <= 0:
            return [" + ".join(terms)]
        lines = []
        for idx in range(0, len(terms), per_line):
            lines.append(" + ".join(terms[idx:idx + per_line]))
        return lines

    reactant_lines = wrap_terms(reactants, 1)
    product_lines = wrap_terms(products, 1)
    equation_matrix = None
    if reactant_lines or product_lines:
        reactant_block = " \\\\ ".join(
            [f"{'' if idx == 0 else ' + '}{line}" for idx, line in enumerate(reactant_lines)]
        )

        product_terms = [line for line in product_lines]
        product_rows = []
        for idx in range(0, len(product_terms), 3):
            row_terms = product_terms[idx:idx + 3]
            row_text = " + ".join(row_terms)
            if idx > 0:
                row_text = f" + {row_text}"
            product_rows.append(row_text)
        product_block = " \\\\ ".join(product_rows)

        equation_matrix = (
            r"\left[\begin{array}{l}"
            f"{reactant_block}"
            r"\end{array}\right]"
            r"\rightarrow"
            r"\left[\begin{array}{l}"
            f"{product_block}"
            r"\end{array}\right]"
        )

    stoich_reactants = [
        latex_species(formula),
        fmt_term(a, "O2"),
    ]
    if n2_o2_ratio > 0:
        stoich_reactants.append(fmt_term(n2_o2_ratio * a, "N2"))
    stoich_products = [
        fmt_term(c, "CO2"),
        fmt_term(h / 2.0, "H2O"),
    ]
    if n2_o2_ratio > 0 or n > 0:
        stoich_products.append(fmt_term(n2_o2_ratio * a + n / 2.0, "N2"))
    stoich_equation = " + ".join(stoich_reactants)
    stoich_equation += " \\rightarrow "
    stoich_equation += " + ".join(stoich_products)

    regime = "lean" if phi < 1.0 else "stoichiometric" if phi == 1.0 else "rich"

    phase_label = fuel_phase if fuel_phase else "unknown"
    hv_basis_label = (hv_basis or "lhv").lower()
    hv_ref_t_label = hv_ref_t_k if hv_ref_t_k is not None else 298.15
    t_prod_label = t_prod_k if t_prod_k is not None else float("nan")
    hv_value, hv_note = heating_value_cantera(
        formula,
        mw_fuel,
        hv_basis_label,
        hv_ref_t_label,
        phase_label,
        p_pa,
    )
    hv_eq_value, hv_eq_note = heating_value_equilibrium(
        formula,
        mw_fuel,
        hv_basis_label,
        hv_ref_t_label,
        phase_label,
        p_pa,
        products_mol,
    )

    reactant_mass_denom = mw_fuel + air_o2 * (MW_O2 + n2_o2_ratio * MW_N2)
    x_f = 1.0 / reactant_total_mol if reactant_total_mol else 0.0
    x_o2 = air_o2 / reactant_total_mol if reactant_total_mol else 0.0
    x_n2 = air_n2 / reactant_total_mol if reactant_total_mol else 0.0
    y_f = mw_fuel / reactant_mass_denom if reactant_mass_denom else 0.0
    y_o2 = (air_o2 * MW_O2) / reactant_mass_denom if reactant_mass_denom else 0.0
    y_n2 = (air_n2 * MW_N2) / reactant_mass_denom if reactant_mass_denom else 0.0

    ideal_co2 = ideal_result.products_mol.get("CO2", 0.0)
    ideal_h2o = ideal_result.products_mol.get("H2O", 0.0)
    ideal_o2 = ideal_result.products_mol.get("O2", 0.0)
    ideal_n2 = ideal_result.products_mol.get("N2", 0.0)

    ideal_sum = ideal_co2 + ideal_h2o + ideal_o2 + ideal_n2

    eq_species = [
        (species, coeff)
        for species, coeff in products_mol.items()
        if coeff >= min_mol
    ]
    eq_species.sort(key=lambda item: item[1], reverse=True)
    eq_species_labels = ",\\ ".join(latex_species(species) for species, _ in eq_species)

    eq_terms = [fmt_term(coeff, species) for species, coeff in eq_species[:10]]
    eq_equation = equation_matrix if equation_matrix else " + ".join(reactants) + " \\rightarrow " + " + ".join(eq_terms)
    if not equation_matrix and len(eq_species) > 10:
        eq_equation += " + \\cdots"

    def round_coeff(value: float) -> float:
        abs_val = abs(value)
        if abs_val < 1e-3 or abs_val >= 1e3:
            return float(f"{value:.2e}")
        return float(f"{value:.4g}")

    reactant_coeffs = {
        formula: 1.0,
        "O2": round_coeff(air_o2),
    }
    if air_n2 > 0:
        reactant_coeffs["N2"] = round_coeff(air_n2)
    product_coeffs = {species: round_coeff(coeff) for species, coeff in eq_species}

    def is_condensed(species: str) -> bool:
        return species.endswith("_s")

    net_coeffs: dict[str, float] = {}
    for species in set(product_coeffs) | set(reactant_coeffs):
        net = product_coeffs.get(species, 0.0) - reactant_coeffs.get(species, 0.0)
        if net == 0:
            continue
        net_coeffs[species] = net

    condensed_omitted = [species for species in list(net_coeffs) if is_condensed(species)]
    for species in condensed_omitted:
        net_coeffs.pop(species, None)

    gas_total = sum(
        coeff for species, coeff in products_mol.items() if coeff > 0 and not is_condensed(species)
    )
    qp_value = None
    if gas_total > 0:
        qp_accum = 1.0
        for species, nu_net in net_coeffs.items():
            if is_condensed(species):
                continue
            coeff = products_mol.get(species, 0.0)
            if coeff <= 0:
                qp_accum = None
                break
            x_i = coeff / gas_total
            p_i = x_i * p_pa
            qp_accum *= (p_i / 101325.0) ** nu_net
        qp_value = qp_accum

    def mole_fraction(species: str) -> float:
        coeff = products_mol.get(species, 0.0)
        if gas_total <= 0:
            return 0.0
        return coeff / gas_total

    dominant_order = ["N2", "O2", "H2O", "CO2"]
    dissociation_order = ["CO", "H2", "OH", "NO", "O", "H"]
    minor_order = ["CO", "H2", "NO", "OH", "O", "H", "NO2", "HO2", "N2O", "H2O2"]

    species_x = [
        (species, mole_fraction(species))
        for species, coeff in products_mol.items()
        if coeff > 0 and not is_condensed(species)
    ]
    major_group = [(s, x) for s, x in species_x if x > 1e-2]
    minor_group = [(s, x) for s, x in species_x if 1e-4 < x <= 1e-2]
    trace_group = [(s, x) for s, x in species_x if 1e-8 <= x <= 1e-4 and s in minor_order]

    major_group.sort(key=lambda item: item[1], reverse=True)
    minor_group.sort(key=lambda item: item[1], reverse=True)
    trace_group.sort(key=lambda item: item[1], reverse=True)

    dominant_species = [s for s in dominant_order if products_mol.get(s, 0.0) > 0]
    dissociation_markers = [s for s in dissociation_order if products_mol.get(s, 0.0) > 0]

    def x_list_lines(group: list[tuple[str, float]]) -> list[str]:
        return [
            f"X_{{{latex_species(s)}}} = {fmt_value(x)}"
            for s, x in group
        ]

    dominant_text = ", ".join(latex_species(s) for s in dominant_species) if dominant_species else "none"
    dissociation_text = ", ".join(latex_species(s) for s in dissociation_markers) if dissociation_markers else "none"

    major_list = x_list_lines(major_group)
    minor_list = x_list_lines(minor_group)
    trace_list = x_list_lines(trace_group)

    major_lines = [f"MATH: {line}" for line in major_list] if major_list else ["TEXT: Major species: none"]
    minor_lines = [f"MATH: {line}" for line in minor_list] if minor_list else ["TEXT: Minor species: none"]
    trace_lines = [f"MATH: {line}" for line in trace_list] if trace_list else ["TEXT: Trace species: none"]

    def display_species_text(species: str) -> str:
        if species == "N2":
            return "N2"
        if species.endswith("_s"):
            return f"{species[:-2]}(s)"
        return latex_species(species)

    def fmt_exponent(value: float) -> str:
        abs_val = abs(value)
        if abs(abs_val - 1.0) <= 1e-6:
            return "1"
        if abs_val < 1e-3 or abs_val >= 1e3:
            mantissa, exp = f"{value:.2e}".split("e")
            exp_val = int(exp)
            return f"{mantissa}e{exp_val}"
        return f"{value:.6g}"

    def kp_term(species: str, coeff: float) -> str:
        latex_name = latex_species(species)
        exponent = fmt_exponent(abs(coeff))
        return rf"\left(\frac{{P_{{{latex_name}}}}}{{P^\circ}}\right)^{{{exponent}}}"

    def group_terms(terms: list[str], per_line: int = 3) -> str:
        if not terms:
            return "1"
        lines = []
        for idx in range(0, len(terms), per_line):
            line = " \\cdot ".join(terms[idx:idx + per_line])
            lines.append(line)
        if len(lines) == 1:
            return lines[0]
        return r"\begin{array}{l}" + r" \\ ".join(lines) + r"\end{array}"

    major_order = ["H2O", "CO2", "NO", "OH", "O", "CO", "H2"]
    trace_order = ["H", "NO2", "HO2", "N2O", "H2O2"]
    denom_order = [formula, "O2", "N2"]

    def build_ordered_terms(order: list[str], selector: callable) -> list[str]:
        terms = []
        for species in order:
            coeff = net_coeffs.get(species)
            if coeff is None or not selector(coeff):
                continue
            terms.append(kp_term(species, coeff))
        return terms

    numerator_major = build_ordered_terms(major_order, lambda coeff: coeff > 0)
    numerator_trace = build_ordered_terms(trace_order, lambda coeff: coeff > 0)
    extra_numerators = [
        kp_term(species, coeff)
        for species, coeff in net_coeffs.items()
        if coeff > 0 and species not in set(major_order + trace_order)
    ]
    numerator_lines = []
    if numerator_major:
        numerator_lines.append(" \\cdot ".join(numerator_major))
    if numerator_trace:
        numerator_lines.append(" \\cdot ".join(numerator_trace))
    if extra_numerators:
        numerator_lines.append(" \\cdot ".join(extra_numerators))
    if len(numerator_lines) == 0:
        numerator_expr = "1"
    elif len(numerator_lines) == 1:
        numerator_expr = numerator_lines[0]
    else:
        numerator_expr = r"\begin{array}{l}" + r" \\ ".join(numerator_lines) + r"\end{array}"

    denominator_terms = build_ordered_terms(denom_order, lambda coeff: coeff < 0)
    extra_denominators = [
        kp_term(species, coeff)
        for species, coeff in net_coeffs.items()
        if coeff < 0 and species not in set(denom_order)
    ]
    denominator_terms.extend(extra_denominators)
    denominator_expr = group_terms(denominator_terms)
    if denominator_terms:
        kp_overall_expr = rf"\frac{{{numerator_expr}}}{{{denominator_expr}}}"
    else:
        kp_overall_expr = numerator_expr

    def kp_symbolic_from_species(species_list: list[tuple[str, float]]) -> str:
        terms = []
        for species, _ in species_list:
            latex_name = latex_species(species)
            terms.append(r"\left(\frac{P_{%s}}{P^\circ}\right)^{\nu_{%s}}" % (latex_name, latex_name))
        return " \\ ".join(terms)

    kp_symbolic = kp_symbolic_from_species(eq_species)

    def water_gas_shift_kp(species_mol: Dict[str, float]) -> float | None:
        denom = sum(value for value in species_mol.values() if value and value > 0)
        if denom <= 0:
            return None
        x_co2 = species_mol.get("CO2", 0.0) / denom
        x_h2 = species_mol.get("H2", 0.0) / denom
        x_co = species_mol.get("CO", 0.0) / denom
        x_h2o = species_mol.get("H2O", 0.0) / denom
        if x_co2 <= 0 or x_h2 <= 0 or x_co <= 0 or x_h2o <= 0:
            return None
        return (x_co2 * x_h2) / (x_co * x_h2o)

    kp_ideal = water_gas_shift_kp(ideal_result.products_mol)
    kp_diss = water_gas_shift_kp(products_mol)

    lines = [
        "TEXT: # Symbolic Derivation from Current Solver State",
        "",
        "TEXT: This tab shows the governing equations solved by the combustion model and their reduction for the current case.",
        "",
        "TEXT: ## Current solver inputs",
        f"MATH: \\text{{Fuel}} = {latex_species(formula)}",
        f"MATH: \\text{{Air model}} = {air_model_label}",
        fr"MATH: T_{{ref}} = {hv_ref_t_label:.2f}\ \mathrm{{K}}, \qquad T_{{prod}} = {t_prod_label:.2f}\ \mathrm{{K}}" if t_prod_k is not None else fr"MATH: T_{{ref}} = {hv_ref_t_label:.2f}\ \mathrm{{K}}",
        fr"MATH: P = {p_pa:.0f}\ \mathrm{{Pa}}",
        f"MATH: \\frac{{\\dot m_f}}{{\\dot m_a}} = {f_over_a:.4g}",
        f"MATH: AFR = \\frac{{\\dot m_a}}{{\\dot m_f}} = {afr:.4g}",
        "",
        "TEXT: ---",
        "",
        "TEXT: ## 1. Stoichiometric oxygen requirement",
        r"TEXT: For a general fuel $C_cH_hO_oN_n$, the stoichiometric oxygen requirement is",
        r"MATH: a = c + \frac{h}{4} - \frac{o}{2}",
        r"TEXT: For this fuel,",
        f"MATH: c={c:.0f},\\quad h={h:.0f},\\quad o={o:.0f}",
        f"MATH: a = {c:.0f} + \\frac{{{h:.0f}}}{{4}} - \\frac{{{o:.0f}}}{{2}} = {a:.4f}",
        "",
        "TEXT: Thus the stoichiometric combustion reaction is",
        f"MATH: {stoich_equation}",
        "",
        "TEXT: ---",
        "",
        "TEXT: ## 2. Stoichiometric air-fuel ratio",
        r"TEXT: Using the dry-air model,",
        r"MATH: m_{air,st} = a\left(MW_{O_2} + 3.76MW_{N_2}\right)",
        r"MATH: AFR_{st} = \frac{m_{air,st}}{MW_f}",
        f"MATH: AFR_{{st}} = {afr_st:.4f}",
        "",
        "TEXT: ---",
        "",
        "TEXT: ## 3. Equivalence ratio",
        r"MATH: \phi = \frac{(F/A)}{(F/A)_{st}}",
        r"MATH: \phi = \frac{AFR_{st}}{AFR}",
        fr"MATH: \phi = \frac{{{afr_st:.4f}}}{{{afr:.4f}}} = {phi:.4f}",
        "",
        f"TEXT: Since $\\phi {'<' if phi < 1 else '=' if phi == 1 else '>'} 1$, the mixture is **{regime}**.",
        "",
        "TEXT: ---",
        "",
        "TEXT: ## 4. Reactant mixture used by the solver",
        r"TEXT: The solver uses",
        r"MATH: \frac{a}{\phi}",
        f"MATH: \\frac{{a}}{{\\phi}} = \\frac{{{a:.4f}}}{{{phi:.4f}}} = {air_o2:.4f}",
        "",
        "TEXT: Thus the reactant mixture is",
        f"MATH: {latex_species(formula)} + {air_o2:.4f}\\,O_2 + {air_n2:.4f}\\,N_2",
        f"MATH: {air_n2:.4f} = {n2_o2_ratio:.2f}({air_o2:.4f})",
        "",
        r"TEXT: The reactant reference total moles are",
        r"MATH: n_{ref} = 1 + \frac{a}{\phi} + 3.76\frac{a}{\phi}",
        f"MATH: n_{{ref}} = 1 + {air_o2:.4f} + {air_n2:.4f} = {reactant_total_mol:.4f}",
        "",
        r"TEXT: So the reactant mole fractions are",
        r"MATH: X_f = \frac{1}{n_{ref}}, \qquad X_{O_2} = \frac{a/\phi}{n_{ref}}, \qquad X_{N_2} = \frac{3.76(a/\phi)}{n_{ref}}",
        f"MATH: X_{{{latex_species(formula)}}} \\approx {x_f:.4f},\\qquad X_{{O_2}} \\approx {x_o2:.4f},\\qquad X_{{N_2}} \\approx {x_n2:.4f}",
        "",
        r"TEXT: The corresponding mass fractions are",
        r"MATH: Y_f = \frac{MW_f}{MW_f + (a/\phi)(MW_{O_2}+3.76MW_{N_2})}",
        r"MATH: Y_{O_2} = \frac{(a/\phi)MW_{O_2}}{MW_f + (a/\phi)(MW_{O_2}+3.76MW_{N_2})}",
        r"MATH: Y_{N_2} = \frac{3.76(a/\phi)MW_{N_2}}{MW_f + (a/\phi)(MW_{O_2}+3.76MW_{N_2})}",
        f"MATH: Y_{{{latex_species(formula)}}} \\approx {y_f:.4f},\\qquad Y_{{O_2}} \\approx {y_o2:.4f},\\qquad Y_{{N_2}} \\approx {y_n2:.4f}",
        "",
        "TEXT: ---",
        "",
        "TEXT: ## 5. Ideal lean products",
        r"TEXT: For $\phi \le 1$, the ideal no-dissociation product model is",
        r"MATH: C_cH_hO_oN_n + \frac{a}{\phi}(O_2+3.76N_2) \rightarrow cCO_2 + \frac{h}{2}H_2O + \left(\frac{a}{\phi}-a\right)O_2 + 3.76\frac{a}{\phi}N_2",
        f"MATH: {latex_species(formula)} + {air_o2:.4f}O_2 + {air_n2:.4f}N_2 \\rightarrow {ideal_co2:.4f}CO_2 + {ideal_h2o:.4f}H_2O + {ideal_o2:.4f}O_2 + {ideal_n2:.4f}N_2",
        r"TEXT: Thus the ideal product coefficients are",
        f"MATH: \\nu_{{CO_2}}={ideal_co2:.4g},\\qquad \\nu_{{H_2O}}={ideal_h2o:.4g},\\qquad \\nu_{{O_2}}={ideal_o2:.4g},\\qquad \\nu_{{N_2}}={ideal_n2:.4g}",
        r"TEXT: Product mole fractions are computed from",
        r"MATH: X_i = \frac{\nu_i}{\sum_j \nu_j}",
        r"TEXT: and product mass fractions from",
        r"MATH: Y_i = \frac{\nu_i MW_i}{\sum_j \nu_j MW_j}",
        "",
        "TEXT: ---",
        "",
        "TEXT: ## 6. First-law heating value",
        r"TEXT: At constant pressure, the heat release per kmol of fuel is",
        r"MATH: Q = \sum_{i \in P} n_i \bar h_i(T_{ref}) - \sum_{j \in R} n_j \bar h_j(T_{ref})",
        r"TEXT: The heating value is then",
        r"MATH: HV = -\frac{Q}{MW_f}",
        fr"MATH: HV = {fmt_value(hv_value)}\ \mathrm{{kJ/kg}}" if hv_value is not None else "TEXT: HV unavailable",
        "",
        r"TEXT: For the equilibrium product model, the solver instead evaluates",
        r"MATH: HV_{eq} = -\frac{\sum_i \nu_i \bar h_i - \bar h_{reactants}}{MW_f}",
        fr"MATH: HV_{{eq}} = {fmt_value(hv_eq_value)}\ \mathrm{{kJ/kg}}" if hv_eq_value is not None else "TEXT: HV_eq unavailable",
        "TEXT: The equilibrium value is lower because dissociation redistributes energy into minor species and bond breaking.",
        "",
        "TEXT: ---",
        "",
        "TEXT: ## 7. Sensible thermodynamic properties",
        r"TEXT: The solver reports sensible enthalpy and entropy relative to $T_{ref}$:",
        r"MATH: \bar h_{s,i}(T) = \int_{T_{ref}}^{T} \bar c_{p,i}^{\circ}(T)\,dT",
        r"MATH: \bar s_{s,i}(T) = \int_{T_{ref}}^{T} \frac{\bar c_{p,i}^{\circ}(T)}{T}\,dT",
        r"TEXT: with standard-state entropy",
        r"MATH: \bar s_i^{\circ}(T) = \bar s_i^{\circ}(T_{ref}) + \int_{T_{ref}}^{T}\frac{\bar c_{p,i}^{\circ}(T)}{T}\,dT",
        r"TEXT: and ideal-gas pressure correction",
        r"MATH: \bar s_i(T,P_i) = \bar s_i^{\circ}(T) - \bar R_u \ln\left(\frac{P_i}{P^\circ}\right)",
        r"TEXT: where",
        r"MATH: P_i = X_iP",
        "",
        "TEXT: ---",
        "",
        "TEXT: ## 8. Gibbs free energy and equilibrium",
        r"MATH: \bar g_i^{\circ}(T) = \bar h_i^{\circ}(T) - T\bar s_i^{\circ}(T)",
        r"TEXT: and Gibbs free energy of formation",
        r"MATH: \bar g_{f,i}^{\circ}(T) = \bar g_i^{\circ}(T) - \sum_{j \in elements}\nu_{ij}\bar g_j^{\circ}(T)",
        r"MATH: C(s),\ H_2,\ O_2,\ N_2 \quad \text{at} \quad P^{\circ} = 1\ \mathrm{atm}",
        r"TEXT: At constant temperature and pressure,",
        r"MATH: \Delta G = \Delta H - T\Delta S",
        r"MATH: Q = \Delta H = \Delta G + T\Delta S",
        r"TEXT: For a general reaction,",
        r"MATH: K_p = \prod_i \left(\frac{P_i}{P^\circ}\right)^{\nu_i}",
        r"MATH: \Delta G^\circ(T)=\sum_i \nu_i \bar g_i^\circ(T)",
        r"MATH: K_p = \exp\left(-\frac{\Delta G^{\circ}(T)}{\bar R_u T}\right)",
        "",
        "TEXT: ---",
        "",
        "TEXT: ## 9. Water-gas shift relation",
        r"MATH: CO + H_2O \rightleftharpoons CO_2 + H_2",
        r"MATH: K_{p,\mathrm{WGS}} = \frac{\left(P_{CO_2}/P^\circ\right)\left(P_{H_2}/P^\circ\right)}{\left(P_{CO}/P^\circ\right)\left(P_{H_2O}/P^\circ\right)}",
        r"MATH: K_{p,\mathrm{WGS}} = \exp\left(-\frac{\Delta G^\circ(T)}{\bar R_u T}\right)",
        r"MATH: K_{p,\mathrm{WGS}} = \frac{P_{CO_2}P_{H_2}}{P_{CO}P_{H_2O}}",
        r"MATH: P_i = X_i P",
        r"MATH: \Delta G = \Delta G^\circ + \bar R_u T \ln Q_{p,\mathrm{WGS}}",
        r"MATH: 0 = \Delta G^\circ + \bar R_u T \ln Q_{p,\mathrm{WGS}}\ \Rightarrow\ Q_{p,\mathrm{WGS}} = \exp\left(-\frac{\Delta G^\circ}{\bar R_u T}\right)",
        r"MATH: Q_{p,\mathrm{WGS}} = \prod_i \left(\frac{P_i}{P^\circ}\right)^{\nu_i}",
        r"MATH: Q_{p,\mathrm{WGS}} = \frac{X_{CO_2}X_{H_2}}{X_{CO}X_{H_2O}}",
        r"TEXT: $Q_{p,\mathrm{WGS}}$ (reaction quotient for water-gas shift)",
        fr"MATH: Q_{{p,\mathrm{{WGS}}}}\,\left(\text{{ideal products}}\right) = {fmt_value(kp_ideal)}" if kp_ideal is not None else "TEXT: Q_{p,\mathrm{WGS}} (ideal products) unavailable (zero CO or H2)",
        fr"MATH: Q_{{p,\mathrm{{WGS}}}}\,\left(\text{{dissociated products}}\right) = {fmt_value(kp_diss)}" if kp_diss is not None else "TEXT: Q_{p,\mathrm{WGS}} (dissociated products) unavailable (zero CO or H2)",
        r"TEXT: If the reported mixture is at water-gas-shift equilibrium, then $Q_{p,\mathrm{WGS}} = K_{p,\mathrm{WGS}}$.",
        "",
        "TEXT: ---",
        "",
        "TEXT: ## 10. Dissociation products reported by the solver",
        f"MATH: {eq_species_labels}",
        "TEXT: The equilibrium reactant-to-product transformation reported by the solver is",
        f"MATH: {eq_equation}",
        "TEXT: This equilibrium branch is what drives the dissociation results table.",
        r"TEXT: $Q_{p,\mathrm{overall}}$ (formal overall reaction quotient from the solver-reported equilibrium basis)",
        r"TEXT: Using the solver-reported equilibrium reaction as the reaction basis, define net coefficients",
        r"MATH: \nu_{net,i} = \nu_{products,i} - \nu_{reactants,i}",
        r"TEXT: If $\nu_{net,i}=0$, omit the species; if $\nu_{net,i}>0$ place it in the numerator; if $\nu_{net,i}<0$ place it in the denominator with exponent $|\nu_{net,i}|$.",
        r"TEXT: Omit condensed phases (activity $=1$).",
        f"TEXT: Omitted condensed phases: {', '.join(display_species_text(s) for s in condensed_omitted)}, with activity = 1" if condensed_omitted else "TEXT: Omitted condensed phases: none",
        r"MATH: Q_{p,\mathrm{overall}} = \prod_i \left(\frac{P_i}{P^\circ}\right)^{\nu_{net,i}}",
        r"TEXT: Evaluate $Q_p$ from the Cantera/table composition using $P_i = X_i P$ (or table partial pressures when available).",
        fr"MATH: Q_{{p,\mathrm{{overall}}}} = {kp_overall_expr}",
        fr"MATH: Q_{{p,\mathrm{{overall}}}} = {fmt_value(qp_value)}" if qp_value is not None else "TEXT: Q_{p,\mathrm{overall}} unavailable (missing species or zero mole fractions)",
        r"TEXT: The numerical value of $Q_{p,\mathrm{overall}}$ is evaluated from the Cantera/table composition state, while the net exponents come from the solver-reported equilibrium reaction basis.",
        r"TEXT: At equilibrium, $Q_{p,\mathrm{overall}} = K_p$.",
        "",
        "TEXT: ---",
        "",
        "TEXT: BLOCKQUOTE_START",
        "TEXT: ## Section 11. Key Solver Outputs",
        "TEXT: ### Mixture State (from solver tables)",
        fr"MATH: T = {t_prod_label:.2f}\ \mathrm{{K}}" if t_prod_k is not None else "TEXT: T unavailable",
        fr"MATH: P = {p_pa:.0f}\ \mathrm{{Pa}}",
        fr"MATH: \phi = {phi:.4f}",
        f"MATH: AFR = {afr:.4g}",
        f"MATH: AFR_{{st}} = {afr_st:.4f}",
        fr"MATH: HV = {fmt_value(hv_value)}\ \mathrm{{kJ/kg}}" if hv_value is not None else "TEXT: HV unavailable",
        fr"MATH: HV_{{eq}} = {fmt_value(hv_eq_value)}\ \mathrm{{kJ/kg}}" if hv_eq_value is not None else "TEXT: HV_eq unavailable",
        "TEXT: These values define the thermodynamic state used for all subsequent equilibrium evaluations.",
        "",
        "TEXT: ### Composition Summary",
        "TEXT: Dominant species:",
        fr"MATH: {dominant_text}",
        "",
        "TEXT: Key dissociation indicators:",
        fr"MATH: {dissociation_text}",
        "",
        "TEXT: ### Mole Fractions (Dissociated Products)",
        "TEXT: Major species:",
        *major_lines,
        "",
        "TEXT: Minor species:",
        *minor_lines,
        "",
        "TEXT: Trace species:",
        *trace_lines,
        "",
        "TEXT: ### Water-Gas Shift Reaction Quotient",
        r"MATH: Q_{p,\mathrm{WGS}} = \frac{X_{CO_2}X_{H_2}}{X_{CO}X_{H_2O}}",
        r"TEXT: Computed directly from table mole fractions using $P_i = X_i P$.",
        f"MATH: Q_{{p,\mathrm{{WGS}}}} = {fmt_value(kp_diss)}" if kp_diss is not None else "TEXT: Q_{p,\mathrm{WGS}} unavailable (zero CO or H2)",
        r"TEXT: If $Q_{p,\mathrm{WGS}} = K_{p,\mathrm{WGS}}$, the mixture satisfies WGS equilibrium.",
        "",
        "TEXT: ### Overall Reaction Quotient (Formal)",
        r"MATH: Q_{p,\mathrm{overall}} = \prod_i \left(\frac{P_i}{P^\circ}\right)^{\nu_{net,i}}",
        r"TEXT: $\nu_{net,i}$ comes from the solver-reported equilibrium reaction; $P_i$ comes from table data using $P_i = X_i P$.",
        f"MATH: Q_{{p,\mathrm{{overall}}}} = {fmt_value(qp_value)}" if qp_value is not None else "TEXT: Q_{p,\mathrm{overall}} unavailable (missing species or zero mole fractions)",
        r"TEXT: This is a formal overall reaction quotient; it is not tied to a single reaction mechanism. Its magnitude can be large because many terms multiply together.",
        "",
        "TEXT: ### Equilibrium Condition",
        r"TEXT: At equilibrium: $Q_p = K_p$.",
        r"TEXT: The solver enforces equilibrium via Gibbs minimization, so the reported composition corresponds to an equilibrium state.",
        "",
        r"TEXT: Reaction-specific quotients (e.g., $Q_{p,\mathrm{WGS}}$) are computed directly from species mole fractions and provide interpretable equilibrium checks for individual reactions. The overall $Q_p$ is a formal quantity derived from the full reaction basis and is primarily useful for consistency with thermodynamic equilibrium definitions.",
        "TEXT: BLOCKQUOTE_END",
    ]

    lines = [line for line in lines if line]
    return "\n".join(lines)
