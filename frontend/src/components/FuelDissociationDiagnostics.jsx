import { useEffect, useMemo, useRef, useState } from "react";
import Plot from "react-plotly.js";
import LatexText from "./LatexText";
import TableView from "./TableView";
import { postJson } from "../api/client";

const DEFAULT_SWEEP = {
  phi_min: 0.6,
  phi_max: 1.6,
  phi_step: 0.1,
  pressure_values_pa: "101.325, 1013.25, 3039.75",
  phi_values: "0.8, 1.0, 1.2",
  p_min_pa: 20.265,
  p_max_pa: 2026.5,
  p_step_pa: 202.65,
  p_points: 8,
  p_scale: "log",
  adiabatic_basis: "equilibrium",
  compare_temp_mode: "fixed",
  compare_t_k: ""
};

const FAST_SWEEP = {
  phi_min: 0.7,
  phi_max: 1.3,
  phi_step: 0.15,
  pressure_values_pa: "101.325, 1013.25",
  phi_values: "0.9, 1.1",
  p_min_pa: 50.6625,
  p_max_pa: 1013.25,
  p_step_pa: 253.3125,
  p_points: 6,
  p_scale: "log",
  adiabatic_basis: "equilibrium",
  compare_temp_mode: "fixed",
  compare_t_k: ""
};

function isSameSweepPreset(current, preset) {
  if (!current || !preset) {
    return false;
  }
  const keys = Object.keys(preset);
  return keys.every((key) => {
    const currentValue = current[key];
    const presetValue = preset[key];
    if (typeof presetValue === "number") {
      return Number.isFinite(currentValue) && Number(currentValue) === presetValue;
    }
    return currentValue === presetValue;
  });
}

const LINE_COLORS = [
  "#f94144",
  "#f8961e",
  "#f9c74f",
  "#90be6d",
  "#43aa8b",
  "#577590",
  "#4d908e",
  "#00bbf9",
  "#9b5de5"
];

const MAX_CURVES = 3;
const STOICH_PHI = 1.0;

function toNumberOrEmpty(value) {
  if (value === "") {
    return "";
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : value;
}

function parseList(value) {
  if (!value) {
    return [];
  }
  return String(value)
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => Number(item))
    .filter((num) => Number.isFinite(num));
}

function formatPressure(pa) {
  if (!Number.isFinite(pa)) {
    return "--";
  }
  const atm = pa / 101325.0;
  if (atm >= 0.1 && atm <= 1000) {
    return `${atm.toFixed(2)} atm`;
  }
  return `${pa.toFixed(0)} Pa`;
}

function formatPressureKpa(pa) {
  if (!Number.isFinite(pa)) {
    return "--";
  }
  const kpa = pa / 1000.0;
  return `${kpa.toFixed(0)} kPa`;
}

function formatPhiLabel(phi) {
  const num = Number(phi);
  if (!Number.isFinite(num)) {
    return "phi";
  }
  const rounded = num.toFixed(2);
  if (Math.abs(num - STOICH_PHI) < 0.02) {
    return `phi=${rounded} (stoich)`;
  }
  if (num < STOICH_PHI) {
    return `phi=${rounded} (lean)`;
  }
  return `phi=${rounded} (rich)`;
}

function formatCompareBasis(mode, adiabaticBasis) {
  if (mode === "fixed") {
    return "Fixed-T common basis";
  }
  const basisLabel = adiabaticBasis === "ideal"
    ? "ideal T_ad"
    : adiabaticBasis === "user"
      ? "user T"
      : "equilibrium T_ad";
  return `Adiabatic common-T (${basisLabel})`;
}

function buildSeries({ x, yMatrix, labels, xLabel, yLabel }) {
  if (!Array.isArray(x) || !Array.isArray(yMatrix)) {
    return [];
  }
  const limited = yMatrix.slice(0, MAX_CURVES);
  const limitedLabels = Array.isArray(labels) ? labels.slice(0, MAX_CURVES) : labels;
  return limited.map((series, idx) => {
    const color = LINE_COLORS[idx % LINE_COLORS.length];
    return {
      type: "scatter",
      mode: "lines+markers",
      name: limitedLabels?.[idx] ?? `Series ${idx + 1}`,
      x,
      y: series,
      line: { width: 3.0, color },
      marker: { size: 4, color },
      hovertemplate: `${xLabel}=%{x:.4g}<br>${yLabel}=%{y:.3f}%<br>Positive=depletion (eq < ideal), negative=enrichment (eq > ideal)<extra></extra>`
    };
  });
}

function buildLayout({ xTitle, yTitle, isLogX, showStoichLine, showZeroLine, tickAngle, tickFontSize }) {
  const layout = {
    xaxis: {
      title: {
        text: xTitle,
        font: { color: "rgba(255,255,255,0.95)", size: 14 }
      },
      type: isLogX ? "log" : "linear",
      showgrid: true,
      gridcolor: "rgba(255,255,255,0.12)",
      gridwidth: 1,
      zeroline: false,
      tickformat: isLogX ? ".2g" : ".3g",
      tickangle: Number.isFinite(tickAngle) ? tickAngle : 0,
      tickfont: { color: "rgba(255,255,255,0.9)", size: tickFontSize ?? 12 },
      linecolor: "rgba(255,255,255,0.6)",
      linewidth: 1.5,
      showline: true
    },
    yaxis: {
      title: {
        text: yTitle,
        font: { color: "rgba(255,255,255,0.95)", size: 14 }
      },
      showgrid: true,
      gridcolor: "rgba(255,255,255,0.12)",
      gridwidth: 1,
      zeroline: false,
      tickfont: { color: "rgba(255,255,255,0.9)", size: 12 },
      linecolor: "rgba(255,255,255,0.6)",
      linewidth: 1.5,
      showline: true
    },
    legend: {
      orientation: "h",
      x: 0,
      y: 1.18,
      xanchor: "left",
      yanchor: "bottom",
      font: { size: 12, color: "rgba(255,255,255,0.9)" },
      bgcolor: "rgba(0,0,0,0.2)"
    },
    margin: { t: 80, l: 70, r: 30, b: 70 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(255,255,255,0.08)",
    hovermode: "closest"
  };

  if (showStoichLine) {
    layout.shapes = [
      {
        type: "line",
        x0: STOICH_PHI,
        x1: STOICH_PHI,
        y0: 0,
        y1: 1,
        xref: "x",
        yref: "paper",
        line: { color: "rgba(255,255,255,0.5)", width: 2, dash: "dash" }
      }
    ];
    layout.annotations = [
      {
        x: STOICH_PHI,
        y: 1.02,
        xref: "x",
        yref: "paper",
        text: "stoichiometric",
        showarrow: false,
        font: { size: 11, color: "rgba(255,255,255,0.7)" }
      }
    ];
  }
  if (showZeroLine) {
    layout.shapes = (layout.shapes || []).concat([
      {
        type: "line",
        x0: 0,
        x1: 1,
        y0: 0,
        y1: 0,
        xref: "paper",
        yref: "y",
        line: { color: "rgba(255,255,255,0.4)", width: 1.5, dash: "dash" }
      }
    ]);
    layout.annotations = (layout.annotations || []).concat([
      {
        x: 1.0,
        y: 0,
        xref: "paper",
        yref: "y",
        xanchor: "right",
        yanchor: "bottom",
        text: "Ideal reference",
        showarrow: false,
        font: { size: 11, color: "rgba(255,255,255,0.7)" }
      }
    ]);
  }
  return layout;
}

function countFailures(matrix, predicate) {
  if (!Array.isArray(matrix)) {
    return 0;
  }
  let count = 0;
  matrix.forEach((row) => {
    if (!Array.isArray(row)) {
      return;
    }
    row.forEach((value) => {
      if (predicate(value)) {
        count += 1;
      }
    });
  });
  return count;
}

function safeNumber(value) {
  return Number.isFinite(value) ? Number(value) : null;
}

function formatSignedPercent(value) {
  if (!Number.isFinite(value)) {
    return "--";
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function classifyDeviation(value) {
  if (!Number.isFinite(value)) {
    return null;
  }
  if (Math.abs(value) < 2.0) {
    return "near-ideal";
  }
  if (value < 0) {
    return "formation";
  }
  if (value >= 20.0) {
    return "high-dissociation";
  }
  return "dissociation";
}

function summarizeDeviation(value, label) {
  const classification = classifyDeviation(value);
  if (!classification) {
    return `${label}: unavailable`;
  }
  if (classification === "near-ideal") {
    return `${label}: near-ideal (${formatSignedPercent(value)})`;
  }
  if (classification === "formation") {
    return `${label}: enriched vs ideal (${formatSignedPercent(value)})`;
  }
  if (classification === "high-dissociation") {
    return `${label}: high dissociation (${formatSignedPercent(value)})`;
  }
  return `${label}: depleted vs ideal (${formatSignedPercent(value)})`;
}

function avgSeries(yMatrix) {
  if (!Array.isArray(yMatrix)) {
    return [];
  }
  const maxLen = yMatrix.reduce((max, row) => Math.max(max, Array.isArray(row) ? row.length : 0), 0);
  return Array.from({ length: maxLen }, (_, idx) => {
    let sum = 0;
    let count = 0;
    yMatrix.forEach((row) => {
      const value = Array.isArray(row) ? row[idx] : null;
      if (Number.isFinite(value)) {
        sum += value;
        count += 1;
      }
    });
    return count ? sum / count : null;
  });
}

function trendDirection(values) {
  const first = values.find((v) => Number.isFinite(v));
  const last = [...values].reverse().find((v) => Number.isFinite(v));
  if (!Number.isFinite(first) || !Number.isFinite(last)) {
    return "flat";
  }
  if (last > first + 1e-6) {
    return "increasing";
  }
  if (last < first - 1e-6) {
    return "decreasing";
  }
  return "flat";
}

function peakNearStoich(phiValues, values) {
  if (!Array.isArray(phiValues) || !Array.isArray(values)) {
    return false;
  }
  let bestIdx = -1;
  let bestVal = -Infinity;
  values.forEach((val, idx) => {
    if (!Number.isFinite(val)) {
      return;
    }
    if (val > bestVal) {
      bestVal = val;
      bestIdx = idx;
    }
  });
  if (bestIdx < 0) {
    return false;
  }
  const phi = phiValues[bestIdx];
  return Number.isFinite(phi) && Math.abs(phi - STOICH_PHI) <= 0.1;
}

export default function FuelDissociationDiagnostics({ inputs, data }) {
  const [singleData, setSingleData] = useState(null);
  const [singleLoading, setSingleLoading] = useState(false);
  const [singleError, setSingleError] = useState("");
  const [sweepInputs, setSweepInputs] = useState(DEFAULT_SWEEP);
  const [sweepData, setSweepData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSweeps, setShowSweeps] = useState(false);
  const [showDetailed, setShowDetailed] = useState(true);
  const isFastPreset = useMemo(() => isSameSweepPreset(sweepInputs, FAST_SWEEP), [sweepInputs]);
  const isDetailedPreset = useMemo(() => isSameSweepPreset(sweepInputs, DEFAULT_SWEEP), [sweepInputs]);
  const isDissociationMode = inputs?.mode === "dissociation";
  const modeWarning = !isDissociationMode
    ? "Dissociation diagnostics require the Equilibrium (dissociation) chemistry model. Ideal mode uses fixed stoichiometric products, so deviation from ideal is not meaningful."
    : "";

  const runSingleDiagnostics = async () => {
    if (!isDissociationMode) {
      setSingleError("Switch chemistry model to Equilibrium (dissociation) to run this diagnostic.");
      return;
    }
    setSingleLoading(true);
    setSingleError("");
    try {
      const payload = {
        fuel_id: inputs?.fuel_id,
        mixture_input_mode: inputs?.mixture_input_mode,
        f_over_a: inputs?.f_over_a,
        phi_input: inputs?.phi_input,
        air_model: inputs?.air_model,
        p_pa: inputs?.p_pa,
        t_k: inputs?.t_k,
        t_fuel_k: inputs?.t_fuel_k,
        t_air_k: inputs?.t_air_k,
        compare_temp_mode: sweepInputs.compare_temp_mode,
        compare_t_k: sweepInputs.compare_t_k === "" ? inputs?.t_k : sweepInputs.compare_t_k,
        adiabatic_basis: sweepInputs.adiabatic_basis,
      };
      const response = await postJson("/api/fuel/analysis/dissociation-single", payload);
      setSingleData(response);
    } catch (err) {
      setSingleError(err.message || "Failed to compute dissociation diagnostics.");
    } finally {
      setSingleLoading(false);
    }
  };

  const computeStartRef = useRef(0);
  const [elapsedMs, setElapsedMs] = useState(0);

  const handleChange = (key) => (event) => {
    const value = event.target.value;
    setSweepInputs((prev) => ({ ...prev, [key]: toNumberOrEmpty(value) }));
  };

  const handleTextChange = (key) => (event) => {
    const value = event.target.value;
    setSweepInputs((prev) => ({ ...prev, [key]: value }));
  };

  const handleCompute = async () => {
    if (!isDissociationMode) {
      setError("Switch chemistry model to Equilibrium (dissociation) to run sweep diagnostics.");
      return;
    }
    setLoading(true);
    setError("");
    computeStartRef.current = Date.now();
    setElapsedMs(0);
    try {
      const payload = {
        fuel_id: inputs?.fuel_id,
        air_model: inputs?.air_model,
        temp_mode: inputs?.temp_mode,
        t_k: inputs?.t_k,
        t_fuel_k: inputs?.t_fuel_k,
        t_air_k: inputs?.t_air_k,
        phi_min: sweepInputs.phi_min,
        phi_max: sweepInputs.phi_max,
        phi_step: sweepInputs.phi_step,
        pressure_values_pa: parseList(sweepInputs.pressure_values_pa).map((val) => val * 1000.0),
        phi_values: parseList(sweepInputs.phi_values),
        p_min_pa: Number.isFinite(sweepInputs.p_min_pa) ? sweepInputs.p_min_pa * 1000.0 : sweepInputs.p_min_pa,
        p_max_pa: Number.isFinite(sweepInputs.p_max_pa) ? sweepInputs.p_max_pa * 1000.0 : sweepInputs.p_max_pa,
        p_step_pa: Number.isFinite(sweepInputs.p_step_pa) ? sweepInputs.p_step_pa * 1000.0 : sweepInputs.p_step_pa,
        p_points: sweepInputs.p_points,
        p_scale: sweepInputs.p_scale,
        adiabatic_basis: sweepInputs.adiabatic_basis,
        compare_temp_mode: sweepInputs.compare_temp_mode,
        compare_t_k: sweepInputs.compare_t_k === "" ? null : sweepInputs.compare_t_k
      };
      const response = await postJson("/api/fuel/analysis/dissociation-sweep", payload);
      setSweepData(response);
    } catch (err) {
      setError(err.message || "Failed to compute dissociation sweep.");
    } finally {
      setLoading(false);
    }
  };

  const elapsedLabel = useMemo(() => {
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }, [elapsedMs]);

  useEffect(() => {
    if (!loading) {
      return undefined;
    }
    const interval = setInterval(() => {
      setElapsedMs(Date.now() - computeStartRef.current);
    }, 1000);
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    if (!inputs?.fuel_id || singleLoading || !isDissociationMode) {
      return;
    }
    if (!singleData) {
      runSingleDiagnostics();
    }
  }, [inputs?.fuel_id, inputs?.f_over_a, inputs?.phi_input, inputs?.p_pa, inputs?.t_k, singleLoading, isDissociationMode]);

  const dissociation = singleData?.percent_dissociation || {};
  const retained = singleData?.percent_retained || {};
  const idealAmounts = singleData?.ideal_amounts || {};
  const eqAmounts = singleData?.equilibrium_amounts || {};
  const sanity = singleData?.sanity || {};
  const singleDefinition = singleData?.definition || {};
  const sweepDefinition = sweepData?.definition || {};
  const comparisonBasisLabel = formatCompareBasis(
    singleDefinition?.compare_temp_mode || "fixed",
    singleDefinition?.adiabatic_basis || "equilibrium"
  );
  const sweepBasisLabel = formatCompareBasis(
    sweepDefinition?.compare_temp_mode || "fixed",
    sweepDefinition?.adiabatic_basis || "equilibrium"
  );
  const sweepCompareTempLabel = Number.isFinite(sweepDefinition?.compare_temp_k)
    ? `${sweepDefinition.compare_temp_k.toFixed(1)} K`
    : Number.isFinite(sweepInputs.compare_t_k)
      ? `${Number(sweepInputs.compare_t_k).toFixed(1)} K`
      : null;

  const phiSweep = sweepData?.phi_sweep;
  const pressureSweep = sweepData?.pressure_sweep;

  const phiLabels = useMemo(() =>
    (phiSweep?.pressure_values_pa || []).map((pa) => `P = ${formatPressureKpa(pa)}`),
  [phiSweep]);
  const pressureLabels = useMemo(() =>
    (pressureSweep?.phi_values || []).map(formatPhiLabel),
  [pressureSweep]);

  const phiSeriesCo2 = useMemo(() => buildSeries({
    x: phiSweep?.phi_values,
    yMatrix: phiSweep?.percent_dissociation?.CO2,
    labels: phiLabels,
    xLabel: "phi",
    yLabel: "Deviation from ideal",
  }), [phiSweep, phiLabels]);

  const phiSeriesH2o = useMemo(() => buildSeries({
    x: phiSweep?.phi_values,
    yMatrix: phiSweep?.percent_dissociation?.H2O,
    labels: phiLabels,
    xLabel: "phi",
    yLabel: "Deviation from ideal",
  }), [phiSweep, phiLabels]);

  const pressureSeriesCo2 = useMemo(() => buildSeries({
    x: (pressureSweep?.pressure_values_pa || []).map((val) => val / 1000.0),
    yMatrix: pressureSweep?.percent_dissociation?.CO2,
    labels: pressureLabels,
    xLabel: "P (kPa)",
    yLabel: "Deviation from ideal",
  }), [pressureSweep, pressureLabels]);

  const pressureSeriesH2o = useMemo(() => buildSeries({
    x: (pressureSweep?.pressure_values_pa || []).map((val) => val / 1000.0),
    yMatrix: pressureSweep?.percent_dissociation?.H2O,
    labels: pressureLabels,
    xLabel: "P (kPa)",
    yLabel: "Deviation from ideal",
  }), [pressureSweep, pressureLabels]);

  const sanityRows = useMemo(() => {
    if (!sanity) {
      return [];
    }
    return [
      {
        Check: "Element balance max residual",
        Value: Number.isFinite(sanity.element_residual_max) ? sanity.element_residual_max.toExponential(2) : "--",
      },
      {
        Check: "Sum X",
        Value: Number.isFinite(sanity.sum_x) ? sanity.sum_x.toFixed(6) : "--",
      },
      {
        Check: "Sum Y",
        Value: Number.isFinite(sanity.sum_y) ? sanity.sum_y.toFixed(6) : "--",
      },
      {
        Check: "Min species mol",
        Value: Number.isFinite(sanity.min_mol) ? sanity.min_mol.toExponential(2) : "--",
      },
      {
        Check: "Nonnegative species",
        Value: sanity.nonnegative ? "Yes" : "No",
      }
    ];
  }, [sanity]);

  const sweepSanitySummary = useMemo(() => {
    if (!phiSweep?.sanity) {
      return null;
    }
    const elemFailures = countFailures(phiSweep.sanity.element_residual_max, (val) => Number.isFinite(val) && Math.abs(val) > 1e-6);
    const sumXFailures = countFailures(phiSweep.sanity.sum_x, (val) => Number.isFinite(val) && Math.abs(val - 1.0) > 1e-3);
    const sumYFailures = countFailures(phiSweep.sanity.sum_y, (val) => Number.isFinite(val) && Math.abs(val - 1.0) > 1e-3);
    const nonnegFailures = countFailures(phiSweep.sanity.nonnegative, (val) => val === false);
    return {
      elemFailures,
      sumXFailures,
      sumYFailures,
      nonnegFailures,
    };
  }, [phiSweep]);

  const plotConfig = {
    responsive: true,
    mathjax: "cdn",
  };

  const phiValue = safeNumber(singleData?.phi) ?? safeNumber(inputs?.phi_input);
  const pressureKpa = Number.isFinite(inputs?.p_pa) ? inputs.p_pa / 1000.0 : null;
  const compareTemp = safeNumber(singleData?.compare_temp_k);
  const co2Dev = safeNumber(dissociation?.CO2);
  const h2oDev = safeNumber(dissociation?.H2O);

  const highDissociationFlags = useMemo(() => {
    const flags = [];
    if (Number.isFinite(co2Dev)) {
      if (co2Dev >= 20) {
        flags.push("Warning: High dissociation regime detected for CO2.");
      } else if (Math.abs(co2Dev) < 2) {
        flags.push("OK: CO2 is near-ideal.");
      } else if (co2Dev < 0) {
        flags.push("Info: CO2 formation exceeds ideal assumption.");
      }
    }
    if (Number.isFinite(h2oDev)) {
      if (h2oDev >= 20) {
        flags.push("Warning: High dissociation regime detected for H2O.");
      } else if (Math.abs(h2oDev) < 2) {
        flags.push("OK: H2O is near-ideal.");
      } else if (h2oDev < 0) {
        flags.push("Info: H2O formation exceeds ideal assumption.");
      }
    }
    return flags;
  }, [co2Dev, h2oDev]);

  const phiAvgCo2 = useMemo(() => avgSeries(phiSweep?.percent_dissociation?.CO2), [phiSweep]);
  const phiAvgH2o = useMemo(() => avgSeries(phiSweep?.percent_dissociation?.H2O), [phiSweep]);
  const pressureAvgCo2 = useMemo(() => avgSeries(pressureSweep?.percent_dissociation?.CO2), [pressureSweep]);
  const pressureAvgH2o = useMemo(() => avgSeries(pressureSweep?.percent_dissociation?.H2O), [pressureSweep]);

  const phiTrend = trendDirection(phiAvgCo2.concat(phiAvgH2o).filter((val) => Number.isFinite(val)));
  const pressureTrend = trendDirection(pressureAvgCo2.concat(pressureAvgH2o).filter((val) => Number.isFinite(val)));
  const phiPeakNearStoich = peakNearStoich(phiSweep?.phi_values || [], phiAvgCo2);
  const h2oMoreSensitive = Number.isFinite(co2Dev) && Number.isFinite(h2oDev)
    ? Math.abs(h2oDev) > Math.abs(co2Dev)
    : null;

  const singleSummary = useMemo(() => {
    const parts = [];
    if (Number.isFinite(phiValue)) {
      parts.push(`phi=${phiValue.toFixed(2)}`);
    }
    if (Number.isFinite(compareTemp)) {
      parts.push(`T=${compareTemp.toFixed(0)} K`);
    }
    if (Number.isFinite(pressureKpa)) {
      parts.push(`P=${pressureKpa.toFixed(0)} kPa`);
    }
    const header = parts.length ? `At ${parts.join(", ")},` : "At the selected state,";
    const co2Text = summarizeDeviation(co2Dev, "CO2");
    const h2oText = summarizeDeviation(h2oDev, "H2O");
    return `${header} ${co2Text}; ${h2oText}.`;
  }, [phiValue, compareTemp, pressureKpa, co2Dev, h2oDev]);

  const singleInterpretation = useMemo(() => {
    const lines = [];
    if (Number.isFinite(co2Dev)) {
      if (co2Dev > 0) {
        lines.push("CO2 is depleted relative to ideal, indicating dissociation effects.");
      } else if (co2Dev < 0) {
        lines.push("CO2 is enriched relative to ideal, indicating formation beyond the ideal assumption.");
      }
    }
    if (Number.isFinite(h2oDev)) {
      if (h2oDev > 0) {
        lines.push("H2O is depleted relative to ideal, indicating dissociation effects.");
      } else if (h2oDev < 0) {
        lines.push("H2O is enriched relative to ideal, indicating formation beyond the ideal assumption.");
      }
    }
    if (Number.isFinite(phiValue) && Math.abs(phiValue - STOICH_PHI) <= 0.05) {
      lines.push("Although phi=1 is stoichiometric, equilibrium effects at this temperature prevent ideal complete-combustion products.");
    }
    if (Number.isFinite(compareTemp)) {
      lines.push("Higher comparison temperatures generally increase dissociation and positive deviations.");
    }
    if (h2oMoreSensitive === true) {
      lines.push("H2O appears more temperature-sensitive than CO2 at this state.");
    } else if (h2oMoreSensitive === false) {
      lines.push("CO2 appears comparable or more sensitive than H2O at this state.");
    }
    if (Number.isFinite(pressureKpa)) {
      lines.push("Higher pressure tends to suppress dissociation; lower pressure tends to increase deviation.");
    }
    return lines;
  }, [co2Dev, h2oDev, phiValue, compareTemp, h2oMoreSensitive, pressureKpa]);

  const sweepInterpretation = useMemo(() => {
    const lines = [];
    if (phiSweep?.phi_values?.length) {
      const leanNote = "Lean mixtures (phi<1) often show smaller positive deviation because excess oxygen stabilizes products.";
      const richNote = "Rich mixtures (phi>1) can show larger deviation due to incomplete oxidation and dissociation.";
      lines.push("Phi sweep:");
      lines.push(leanNote);
      if (phiPeakNearStoich) {
        lines.push("Peak positive deviation occurs near stoichiometric conditions, consistent with high flame temperatures.");
      }
      lines.push(richNote);
    }
    if (pressureSweep?.pressure_values_pa?.length) {
      lines.push("Pressure sweep:");
      if (pressureTrend === "decreasing") {
        lines.push("Deviation decreases with pressure, indicating suppression of dissociation at higher pressure.");
      } else if (pressureTrend === "increasing") {
        lines.push("Deviation increases with pressure; review mixture strength and comparison temperature for context.");
      } else {
        lines.push("Deviation is relatively flat with pressure across the selected range.");
      }
    }
    return lines;
  }, [phiSweep, pressureSweep, phiPeakNearStoich, pressureTrend]);

  const keyTakeaway = useMemo(() => {
    if (Number.isFinite(co2Dev) && co2Dev >= 20 || Number.isFinite(h2oDev) && h2oDev >= 20) {
      return "At these conditions, temperature-driven dissociation significantly alters product composition.";
    }
    if (Number.isFinite(co2Dev) && co2Dev < 0 || Number.isFinite(h2oDev) && h2oDev < 0) {
      return "Equilibrium favors formation beyond the ideal assumption for at least one product species.";
    }
    return "Products remain near the ideal complete-combustion prediction at this state.";
  }, [co2Dev, h2oDev]);

  if (!isDissociationMode) {
    return (
      <div className="analysis-output-panel">
        <h5>Percent Dissociation Diagnostics</h5>
        <div className="analysis-warning">
          <div><strong>Requires Equilibrium (dissociation) mode.</strong></div>
          <div>{modeWarning}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="analysis-output-panel">
      <h5>Percent Dissociation Diagnostics</h5>
      <div className="analysis-help-block">
        <div className="analysis-help-title">How to read this diagnostic</div>
        <div className="analysis-help-body">
          <p>Single-state values compare ideal complete-combustion products to equilibrium products at the same comparison temperature.</p>
          <ul>
            <li>Positive deviation means the species is depleted relative to ideal (dissociation-like behavior).</li>
            <li>Zero means the equilibrium amount matches ideal.</li>
            <li>Negative deviation means the species is enriched relative to ideal (formation beyond ideal).</li>
            <li>Retained % shows how much of the ideal product remains (100% = no change).</li>
            <li>Sweep plots show trends versus equivalence ratio and pressure for quick sensitivity checks.</li>
          </ul>
        </div>
      </div>
      <div className="analysis-output-grid">
        <div>
          <div className="analysis-output-label">Basis</div>
          <div>{comparisonBasisLabel}</div>
        </div>
        <div>
          <div className="analysis-output-label">Compare T (common)</div>
          <div>
            {Number.isFinite(singleData?.compare_temp_k)
              ? `${singleData.compare_temp_k.toFixed(1)} K`
              : "--"}
          </div>
        </div>
        <div>
          <div className="analysis-output-label">CO2 deviation from ideal</div>
          <div>
            {Number.isFinite(dissociation?.CO2)
              ? `${dissociation.CO2.toFixed(2)} %`
              : "--"}
          </div>
        </div>
        <div>
          <div className="analysis-output-label">H2O deviation from ideal</div>
          <div>
            {Number.isFinite(dissociation?.H2O)
              ? `${dissociation.H2O.toFixed(2)} %`
              : "--"}
          </div>
        </div>
        <div>
          <div className="analysis-output-label">CO2 retained</div>
          <div>{Number.isFinite(retained?.CO2) ? `${retained.CO2.toFixed(2)} %` : "--"}</div>
        </div>
        <div>
          <div className="analysis-output-label">H2O retained</div>
          <div>{Number.isFinite(retained?.H2O) ? `${retained.H2O.toFixed(2)} %` : "--"}</div>
        </div>
        <div>
          <div className="analysis-output-label">Ideal CO2 amount</div>
          <div>{Number.isFinite(idealAmounts?.CO2) ? idealAmounts.CO2.toFixed(6) : "--"}</div>
        </div>
        <div>
          <div className="analysis-output-label">Equilibrium CO2 amount</div>
          <div>{Number.isFinite(eqAmounts?.CO2) ? eqAmounts.CO2.toFixed(6) : "--"}</div>
        </div>
        <div>
          <div className="analysis-output-label">Ideal H2O amount</div>
          <div>{Number.isFinite(idealAmounts?.H2O) ? idealAmounts.H2O.toFixed(6) : "--"}</div>
        </div>
        <div>
          <div className="analysis-output-label">Equilibrium H2O amount</div>
          <div>{Number.isFinite(eqAmounts?.H2O) ? eqAmounts.H2O.toFixed(6) : "--"}</div>
        </div>
      </div>
      <div className="plot-caption">
        <div>
          <LatexText latex={String.raw`\%\,\text{deviation} = \left(\frac{n_{\mathrm{ideal}}-n_{\mathrm{eq}}}{n_{\mathrm{ideal}}}\right)\times 100`} />
        </div>
        <div>
          Depletion means equilibrium has less of a species than the ideal reference (n_eq &lt; n_ideal); enrichment means more (n_eq &gt; n_ideal).
          Retained percent tracks n_eq / n_ideal.
        </div>
      </div>

      <div className="analysis-inputs">
        <div className="analysis-input-grid">
          <label className="analysis-input-field">
            <span className="analysis-input-label">Compare mode</span>
            <select
              value={sweepInputs.compare_temp_mode}
              onChange={handleChange("compare_temp_mode")}
            >
              <option value="fixed">Fixed T (common)</option>
              <option value="adiabatic">Adiabatic T (common)</option>
            </select>
          </label>
          <label className="analysis-input-field">
            <span className="analysis-input-label">Adiabatic basis</span>
            <select
              value={sweepInputs.adiabatic_basis}
              onChange={handleChange("adiabatic_basis")}
              disabled={sweepInputs.compare_temp_mode !== "adiabatic"}
            >
              <option value="equilibrium">Equilibrium T_ad</option>
              <option value="ideal">Ideal T_ad</option>
              <option value="user">User T</option>
            </select>
          </label>
          <label className="analysis-input-field">
            <span className="analysis-input-label">Compare T (K)</span>
            <input
              type="number"
              step="10"
              value={sweepInputs.compare_t_k}
              onChange={handleChange("compare_t_k")}
              disabled={sweepInputs.compare_temp_mode !== "fixed" && sweepInputs.adiabatic_basis !== "user"}
            />
          </label>
        </div>
        <div className="analysis-input-hint">
          Shared by single-state and sweep diagnostics.
        </div>
        <div className="analysis-plot-actions">
          <button type="button" onClick={runSingleDiagnostics} disabled={singleLoading || !isDissociationMode}>
            {singleLoading ? "Running..." : "Run diagnostics"}
          </button>
          {singleError ? <span className="error">{singleError}</span> : null}
        </div>
      </div>

      <div className="analysis-output-panel">
        <div className="analysis-output-row">
          <h5>Sweep Diagnostics</h5>
          <button type="button" className="analysis-toggle" onClick={() => setShowSweeps((prev) => !prev)}>
            {showSweeps ? "Hide sweeps" : "Show sweeps"}
          </button>
        </div>
        {!showSweeps ? null : (
          <>
            <div className="analysis-inputs">
              <div className="analysis-help-block">
                <div className="analysis-help-title">Sweep interpretation</div>
                <div className="analysis-help-body">
                  <p>Use sweeps to understand trends with equivalence ratio and pressure.</p>
                  <ul>
                    <li>Positive values indicate dissociation effects; negative values indicate additional formation relative to ideal.</li>
                        <li> a +10% point means the equilibrium product amount is 10% lower than the ideal reference at that same condition; a -10% point means it is 10% higher.</li>
                    <li>Depletion (reduction or loss) means the equilibrium amount is lower than the ideal reference for that species.</li>
                    <li>Enrichment (increase or addition) means the equilibrium amount is higher than the ideal reference for that species.</li>
                    <li>Higher pressure generally suppresses dissociation, but the magnitude depends on mixture strength.</li>
                    <li>Fixed-T sweeps are recommended for direct, temperature-controlled comparisons.</li>
                  </ul>
                </div>
              </div>
              <div className="analysis-toggle-group">
                <div className="analysis-toggle-label">Sweep presets</div>
                <button
                  type="button"
                  className={`analysis-toggle ${isFastPreset ? "analysis-toggle--active" : ""}`}
                  disabled={!isDissociationMode}
                  onClick={() => setSweepInputs((prev) => ({ ...prev, ...FAST_SWEEP }))}
                >
                  Fast preview
                </button>
                <button
                  type="button"
                  className={`analysis-toggle ${isDetailedPreset ? "analysis-toggle--active" : ""}`}
                  disabled={!isDissociationMode}
                  onClick={() => setSweepInputs((prev) => ({ ...prev, ...DEFAULT_SWEEP }))}
                >
                  Detailed sweep
                </button>
              </div>
              <div className="analysis-input-section">
                <div className="analysis-input-section-header">Shared sweep inputs</div>
                <div className="analysis-input-hint">These settings drive both the phi sweep and pressure sweep. Phi sweep curves are labeled by pressure; pressure sweep curves are labeled by equivalence ratio.</div>
                <div className="analysis-input-grid">
                  <label className="analysis-input-field">
                    <span className="analysis-input-label">phi min</span>
                    <input type="number" step="0.01" value={sweepInputs.phi_min} onChange={handleChange("phi_min")} />
                  </label>
                  <label className="analysis-input-field">
                    <span className="analysis-input-label">phi max</span>
                    <input type="number" step="0.01" value={sweepInputs.phi_max} onChange={handleChange("phi_max")} />
                  </label>
                  <label className="analysis-input-field">
                    <span className="analysis-input-label">phi step</span>
                    <input type="number" step="0.01" value={sweepInputs.phi_step} onChange={handleChange("phi_step")} />
                  </label>
                  <label className="analysis-input-field">
                    <span className="analysis-input-label">phi list (pressure sweep)</span>
                    <input type="text" value={sweepInputs.phi_values} onChange={handleTextChange("phi_values")} />
                  </label>
                  <label className="analysis-input-field">
                    <span className="analysis-input-label">Pressures (kPa)</span>
                    <input type="text" value={sweepInputs.pressure_values_pa} onChange={handleTextChange("pressure_values_pa")} />
                  </label>
                  <label className="analysis-input-field">
                    <span className="analysis-input-label">P min (kPa)</span>
                    <input type="number" step="10" value={sweepInputs.p_min_pa} onChange={handleChange("p_min_pa")} />
                  </label>
                  <label className="analysis-input-field">
                    <span className="analysis-input-label">P max (kPa)</span>
                    <input type="number" step="10" value={sweepInputs.p_max_pa} onChange={handleChange("p_max_pa")} />
                  </label>
                  <label className="analysis-input-field">
                    <span className="analysis-input-label">P step (kPa)</span>
                    <input type="number" step="10" value={sweepInputs.p_step_pa} onChange={handleChange("p_step_pa")} />
                  </label>
                  <label className="analysis-input-field">
                    <span className="analysis-input-label">P points (log)</span>
                    <input type="number" step="1" value={sweepInputs.p_points} onChange={handleChange("p_points")} />
                  </label>
                  <label className="analysis-input-field">
                    <span className="analysis-input-label">P scale</span>
                    <select value={sweepInputs.p_scale} onChange={handleChange("p_scale")}> 
                      <option value="log">Log</option>
                      <option value="linear">Linear</option>
                    </select>
                  </label>
                </div>
              </div>
              <div className="analysis-plot-actions">
                <button type="button" onClick={handleCompute} disabled={loading || !isDissociationMode}>
                  {loading ? "Running..." : "Generate sweep plots"}
                </button>
                {loading && elapsedMs >= 2000 ? (
                  <span className="compute-timer">Please wait, computation time is {elapsedLabel}.</span>
                ) : null}
                {error ? <span className="error">{error}</span> : null}
              </div>
            </div>
          </>
        )}
      </div>

      {showSweeps && sweepSanitySummary ? (
        <div className="analysis-output-panel">
          <h5>Sweep sanity summary</h5>
          <div className="analysis-output-grid">
            <div>
              <div className="analysis-output-label">Element residual failures</div>
              <div>{sweepSanitySummary.elemFailures}</div>
            </div>
            <div>
              <div className="analysis-output-label">Sum X failures</div>
              <div>{sweepSanitySummary.sumXFailures}</div>
            </div>
            <div>
              <div className="analysis-output-label">Sum Y failures</div>
              <div>{sweepSanitySummary.sumYFailures}</div>
            </div>
            <div>
              <div className="analysis-output-label">Nonnegative failures</div>
              <div>{sweepSanitySummary.nonnegFailures}</div>
            </div>
          </div>
        </div>
      ) : null}

      {sanityRows.length ? (
        <TableView
          title="Single-state sanity checks"
          table={{ columns: ["Check", "Value"], rows: sanityRows }}
        />
      ) : null}
      {showSweeps ? (
        <div className="dissociation-plot-sections">
          <div className="dissociation-plot-section">
            <div className="dissociation-plot-section-header">Phi sweep</div>
            <div className="analysis-input-hint">
              Positive values indicate dissociation effects; negative values indicate additional formation relative to ideal.
            </div>
            <div className="dissociation-plot-grid">
              {phiSeriesCo2?.length ? (
                <div className="plot-card dissociation-plot-card">
                  <div className="plot-card-header">
                    <h3>CO2 deviation from ideal vs phi</h3>
                    <div className="plot-card-meta">
                      Basis: {sweepBasisLabel}{sweepCompareTempLabel ? `, T = ${sweepCompareTempLabel}` : ""}
                    </div>
                    <div className="plot-card-meta">Color: pressure</div>
                  </div>
                  <div className="plot-frame dissociation-plot-frame">
                    <Plot
                      data={phiSeriesCo2}
                      layout={buildLayout({
                        xTitle: "Equivalence ratio, phi [-]",
                        yTitle: "Deviation from ideal [%]",
                        isLogX: false,
                        showStoichLine: true,
                        showZeroLine: true
                      })}
                      config={plotConfig}
                      useResizeHandler
                      style={{ width: "100%", height: "100%" }}
                    />
                  </div>
                </div>
              ) : null}

              {phiSeriesH2o?.length ? (
                <div className="plot-card dissociation-plot-card">
                  <div className="plot-card-header">
                    <h3>H2O deviation from ideal vs phi</h3>
                    <div className="plot-card-meta">
                      Basis: {sweepBasisLabel}{sweepCompareTempLabel ? `, T = ${sweepCompareTempLabel}` : ""}
                    </div>
                    <div className="plot-card-meta">Color: pressure</div>
                  </div>
                  <div className="plot-frame dissociation-plot-frame">
                    <Plot
                      data={phiSeriesH2o}
                      layout={buildLayout({
                        xTitle: "Equivalence ratio, phi [-]",
                        yTitle: "Deviation from ideal [%]",
                        isLogX: false,
                        showStoichLine: true,
                        showZeroLine: true
                      })}
                      config={plotConfig}
                      useResizeHandler
                      style={{ width: "100%", height: "100%" }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="dissociation-plot-section">
            <div className="dissociation-plot-section-header">Pressure sweep</div>
            <div className="analysis-input-hint">
              Higher pressure generally suppresses dissociation; trends depend on equivalence ratio.
            </div>
            <div className="dissociation-plot-grid">
              {pressureSeriesCo2?.length ? (
                <div className="plot-card dissociation-plot-card">
                  <div className="plot-card-header">
                    <h3>CO2 deviation from ideal vs pressure</h3>
                    <div className="plot-card-meta">
                      Basis: {sweepBasisLabel}{sweepCompareTempLabel ? `, T = ${sweepCompareTempLabel}` : ""}
                    </div>
                    <div className="plot-card-meta">Color: equivalence ratio</div>
                  </div>
                  <div className="plot-frame dissociation-plot-frame">
                    <Plot
                      data={pressureSeriesCo2}
                      layout={buildLayout({
                        xTitle: sweepInputs.p_scale === "log" ? "Pressure, P [kPa] (log scale)" : "Pressure, P [kPa]",
                        yTitle: "Deviation from ideal [%]",
                        isLogX: sweepInputs.p_scale === "log",
                        showStoichLine: false,
                        showZeroLine: true,
                        tickAngle: 45,
                        tickFontSize: 10
                      })}
                      config={plotConfig}
                      useResizeHandler
                      style={{ width: "100%", height: "100%" }}
                    />
                  </div>
                </div>
              ) : null}

              {pressureSeriesH2o?.length ? (
                <div className="plot-card dissociation-plot-card">
                  <div className="plot-card-header">
                    <h3>H2O deviation from ideal vs pressure</h3>
                    <div className="plot-card-meta">
                      Basis: {sweepBasisLabel}{sweepCompareTempLabel ? `, T = ${sweepCompareTempLabel}` : ""}
                    </div>
                    <div className="plot-card-meta">Color: equivalence ratio</div>
                  </div>
                  <div className="plot-frame dissociation-plot-frame">
                    <Plot
                      data={pressureSeriesH2o}
                      layout={buildLayout({
                        xTitle: sweepInputs.p_scale === "log" ? "Pressure, P [kPa] (log scale)" : "Pressure, P [kPa]",
                        yTitle: "Deviation from ideal [%]",
                        isLogX: sweepInputs.p_scale === "log",
                        showStoichLine: false,
                        showZeroLine: true,
                        tickAngle: 45,
                        tickFontSize: 10
                      })}
                      config={plotConfig}
                      useResizeHandler
                      style={{ width: "100%", height: "100%" }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className="analysis-output-panel">
        <div className="analysis-output-row">
          <h5>Detailed Analysis</h5>
          <button type="button" className="analysis-toggle" onClick={() => setShowDetailed((prev) => !prev)}>
            {showDetailed ? "Hide" : "Show"}
          </button>
        </div>
        {!showDetailed ? null : (
          <>
            {highDissociationFlags.length ? (
              <div className="analysis-warning">
                {highDissociationFlags.map((flag) => (
                  <div key={flag}>{flag}</div>
                ))}
              </div>
            ) : null}
            <div className="analysis-help-block">
              <div className="analysis-help-title">Detailed Interpretation (Single State)</div>
              <div className="analysis-help-body">
                <p>{singleSummary}</p>
                {singleInterpretation.length ? (
                  <ul>
                    {singleInterpretation.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                ) : null}
                <p>{keyTakeaway}</p>
              </div>
            </div>
            <div className="analysis-help-block">
              <div className="analysis-help-title">Species-specific insights</div>
              <div className="analysis-help-body">
                <ul>
                  <li>CO2 is generally more stable and may show smaller deviations, especially on the lean side.</li>
                  <li>H2O is often more temperature-sensitive and can show stronger dissociation at high temperature.</li>
                </ul>
              </div>
            </div>
            {showSweeps ? (
              <div className="analysis-help-block">
                <div className="analysis-help-title">Trend Analysis (Sweep)</div>
                <div className="analysis-help-body">
                  {sweepInterpretation.length ? (
                    <ul>
                      {sweepInterpretation.map((line, idx) => (
                        <li key={`${line}-${idx}`}>{line}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>Run a sweep to generate trend interpretation.</p>
                  )}
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
