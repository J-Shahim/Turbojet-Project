from __future__ import annotations

from pathlib import Path
import sys

from fastapi import FastAPI, HTTPException
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware

from models import (
    MK1Inputs,
    AnalysisOperatingLineInputs,
    AnalysisStripModelInputs,
    AnalysisTauSweepInputs,
    AnalysisTbarVsMeInputs,
    AnalysisVelocityRatioInputs,
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
    ideal_tau_sweeps_from_mk1,
    operating_line_from_mk1,
    strip_model_from_mk1,
    tbar_vs_me_from_mk1,
)


ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

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
