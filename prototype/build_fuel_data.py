from __future__ import annotations

import csv
import json
from pathlib import Path

SRC = Path(r"c:\Users\jarel\Combustion\data\appendix-b\table_B1_fuel_properties.csv")
OUT = Path(__file__).parent / "fuel_data.json"


def main() -> None:
    with SRC.open("r", encoding="utf-8", newline="") as handle:
        rows = list(csv.reader(handle))

    header = rows[3]
    data = rows[4:]
    idx = {name: i for i, name in enumerate(header)}

    fuels = []
    for row in data:
        if not row or not row[idx["formula"]]:
            continue
        formula = row[idx["formula"]]
        name = row[idx["fuel"]]
        mw = row[idx["mw_kg_per_kmol"]]
        lhv = row[idx["lhv_kJ_per_kg"]]
        fuels.append(
            {
                "fuel_id": formula,
                "name": name,
                "formula": formula,
                "mw_kg_per_kmol": float(mw) if mw else None,
                "lhv_kJ_per_kg": float(lhv) if lhv else None,
            }
        )

    OUT.write_text(json.dumps(fuels, indent=2), encoding="utf-8")
    print(f"Wrote {OUT} with {len(fuels)} fuels")


if __name__ == "__main__":
    main()
