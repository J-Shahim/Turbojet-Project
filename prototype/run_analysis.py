from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, List

from combustion_solver import (
    Fuel,
    latex_derivation,
    load_fuels,
    products_dissociation,
    products_ideal,
    stoich_afr,
)
from plots import plot_pollutants


def parse_phi_range(value: str) -> List[float]:
    parts = [p.strip() for p in value.split(",")]
    if len(parts) != 3:
        raise ValueError("phi range must be 'start,end,steps'")
    start, end, steps = float(parts[0]), float(parts[1]), int(parts[2])
    if steps < 2:
        raise ValueError("steps must be >= 2")
    step = (end - start) / (steps - 1)
    return [start + i * step for i in range(steps)]


def select_solver(mode: str):
    if mode == "ideal":
        return products_ideal
    if mode == "dissociation":
        return products_dissociation
    raise ValueError("mode must be 'ideal' or 'dissociation'")


def main() -> None:
    parser = argparse.ArgumentParser(description="Fuel combustion prototype")
    parser.add_argument("--fuel-id", required=True)
    parser.add_argument("--fuel-data", default="fuel_data.json")
    parser.add_argument("--f-over-a", type=float, default=None)
    parser.add_argument("--phi-range", default=None)
    parser.add_argument("--t-k", type=float, default=2000.0)
    parser.add_argument("--p-pa", type=float, default=101325.0)
    parser.add_argument("--mode", choices=["ideal", "dissociation"], default="ideal")
    parser.add_argument("--latex-out", default=None)
    parser.add_argument("--plot-out", default=None)
    args = parser.parse_args()

    fuel_path = Path(args.fuel_data)
    fuels = load_fuels(fuel_path)
    fuel = fuels.get(args.fuel_id)
    if fuel is None:
        raise SystemExit(f"Fuel '{args.fuel_id}' not found in {fuel_path}")

    solver = select_solver(args.mode)

    if args.phi_range:
        phi_values = parse_phi_range(args.phi_range)
        f_over_a_values = []
        results = []
        afr_st = stoich_afr(fuel.formula, fuel.mw_kg_per_kmol)
        f_over_a_st = 1.0 / afr_st
        for phi in phi_values:
            f_over_a = phi * f_over_a_st
            f_over_a_values.append(f_over_a)
            if args.mode == "dissociation":
                result = solver(fuel.formula, f_over_a, fuel.mw_kg_per_kmol, args.t_k, args.p_pa)
            else:
                result = solver(fuel.formula, f_over_a, fuel.mw_kg_per_kmol)
            results.append(result)

        pollutants: Dict[str, List[float]] = {"CO": [], "NOx": [], "Unburned": []}
        for result in results:
            for key in pollutants:
                pollutants[key].append(result.pollutants_mol.get(key, 0.0))

        if args.plot_out:
            plot_pollutants(phi_values, pollutants, args.plot_out)

        summary = {
            "fuel_id": fuel.fuel_id,
            "phi": phi_values,
            "pollutants": pollutants,
            "mode": args.mode,
        }
        print(json.dumps(summary, indent=2))
        return

    if args.f_over_a is None:
        raise SystemExit("Provide --f-over-a or --phi-range")

    if args.mode == "dissociation":
        result = solver(fuel.formula, args.f_over_a, fuel.mw_kg_per_kmol, args.t_k, args.p_pa)
    else:
        result = solver(fuel.formula, args.f_over_a, fuel.mw_kg_per_kmol)

    print(json.dumps({
        "fuel_id": fuel.fuel_id,
        "phi": result.phi,
        "afr": result.afr,
        "afr_stoich": result.afr_stoich,
        "products": result.products_mol,
        "pollutants": result.pollutants_mol,
        "note": result.note,
    }, indent=2))

    if args.latex_out:
        Path(args.latex_out).write_text(
            latex_derivation(
                fuel.formula,
                args.f_over_a,
                fuel.mw_kg_per_kmol,
                "vapor",
                "lhv",
                298.15,
                args.t_k,
                args.p_pa,
            ),
            encoding="utf-8",
        )


if __name__ == "__main__":
    main()
