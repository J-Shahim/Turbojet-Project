from __future__ import annotations

from typing import Any, Dict, Tuple
import math

from models import MK1Inputs


def _mk1_inputs_to_dict(inputs: MK1Inputs) -> Dict[str, Any]:
    data = inputs.model_dump()
    data["A1.5"] = data.pop("A15")
    ae_value = data.get("Ae")
    if data.get("nozzle_fully_expanded") and ae_value is not None:
        try:
            ae_value = float(ae_value)
        except Exception:
            ae_value = None
        if ae_value is None or not math.isfinite(ae_value) or ae_value <= 0.0:
            data["Ae"] = None
        else:
            data["Ae"] = ae_value
    return data


def _clean_value(value):
    if isinstance(value, float) and not math.isfinite(value):
        return None
    return value


def _df_to_table(df):
    return {
        "columns": list(df.columns),
        "rows": [
            {key: _clean_value(val) for key, val in row.items()}
            for row in df.to_dict(orient="records")
        ],
    }


def compute_mk1(inputs: MK1Inputs) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    from Turbojet_full_stage_calculation_MK1_simplified import compute_state

    data = _mk1_inputs_to_dict(inputs)
    state = compute_state(data)
    payload = {
        "station_table": _df_to_table(state["station_table"]),
        "station_table_raw": _df_to_table(state["station_table_raw"]),
        "ratio_table": _df_to_table(state["ratio_table"]),
        "ratio_table_raw": _df_to_table(state["ratio_table_raw"]),
        "status_table": _df_to_table(state["status_table"]),
        "warnings": state.get("warnings", []),
    }
    return state, payload
