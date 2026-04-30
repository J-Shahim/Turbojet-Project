import { useEffect, useMemo, useRef, useState } from "react";
import Plot from "react-plotly.js";
import LatexText from "./LatexText";
import TableView from "./TableView";
import { postJson } from "../api/client";

const DEFAULT_MAP_INPUTS = {
  t_k: 2000.0,
  phi_min: 0.0001,
  phi_max: 2.0,
  phi_step: 0.05,
  min_mol: 1.0e-6
};

function toNumberOrEmpty(value) {
  if (value === "") {
    return "";
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : value;
}

export default function FuelXiMap({ inputs, speciesList, mode, selectedPhi, selectedTadK }) {
  const [mapInputs, setMapInputs] = useState(DEFAULT_MAP_INPUTS);
  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [keySpeciesOnly, setKeySpeciesOnly] = useState(true);
  const [keySpeciesCount, setKeySpeciesCount] = useState(8);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [showTimer, setShowTimer] = useState(false);
  const computeStartRef = useRef(0);

  const formatElapsed = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const speciesOptions = useMemo(() => {
    if (!Array.isArray(speciesList)) {
      return [];
    }
    return Array.from(new Set(speciesList.filter(Boolean)));
  }, [speciesList]);

  const idealSeries = mapData?.ideal || {};
  const dissSeries = mapData?.dissociation || {};

  const handleChange = (key) => (event) => {
    const value = event.target.value;
    setMapInputs((prev) => ({ ...prev, [key]: toNumberOrEmpty(value) }));
  };

  const handleCompute = async () => {
    setLoading(true);
    setError("");
    try {
      if (!speciesOptions.length) {
        setError("Compute products first so the species list is populated.");
        setLoading(false);
        return;
      }
      const isDissociation = mode === "dissociation";
      const payload = {
        fuel_id: inputs?.fuel_id,
        species: speciesOptions,
        air_model: inputs?.air_model,
        p_pa: inputs?.p_pa,
        t_k: mapInputs.t_k,
        t_fuel_k: inputs?.t_fuel_k,
        t_air_k: inputs?.t_air_k,
        phi_min: mapInputs.phi_min,
        phi_max: mapInputs.phi_max,
        phi_step: mapInputs.phi_step,
        min_mol: mapInputs.min_mol,
        include_ideal: !isDissociation,
        include_dissociation: isDissociation
      };
      const response = await postJson("/api/fuel/analysis/xi-map", payload);
      setMapData(response);
    } catch (err) {
      setError(err.message || "Failed to compute Xi map.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading) {
      setShowTimer(false);
      return undefined;
    }
    computeStartRef.current = Date.now();
    setElapsedMs(0);
    setShowTimer(false);
    const showTimerId = setTimeout(() => {
      setShowTimer(true);
    }, 2000);
    const intervalId = setInterval(() => {
      setElapsedMs(Date.now() - computeStartRef.current);
    }, 1000);
    return () => {
      clearInterval(intervalId);
      clearTimeout(showTimerId);
    };
  }, [loading]);

  const plotConfig = {
    responsive: true,
    mathjax: "cdn"
  };

  const LINE_COLORS = [
    "#f9c74f",
    "#90be6d",
    "#43aa8b",
    "#4d908e",
    "#577590",
    "#f8961e",
    "#f3722c",
    "#f94144",
    "#9b5de5",
    "#00bbf9",
    "#00f5d4"
  ];

  const buildTrace = (title, series, tadSeries, options = {}) => {
    if (!series?.phi || !series?.xi || !series?.species) {
      return { title, traces: [] };
    }
    const scale = Number.isFinite(options.scale) ? options.scale : 1.0;
    const valueLabel = options.valueLabel || "X_i";
    const valueFormat = options.valueFormat || ".6f";
    const hasData = (values) => Array.isArray(values) && values.some((val) => Number.isFinite(val) && val > 0);
    const speciesSource = options.visibleSpecies?.length ? options.visibleSpecies : series.species;
    const traces = speciesSource
      .filter((species) => hasData(series.xi?.[species]))
      .map((species, idx) => {
        const rawValues = series.xi?.[species] || [];
        const isN2 = /^N_?2$/i.test(species);
        const values = rawValues.map((val) => {
          if (!Number.isFinite(val)) {
            return val;
          }
          const scaled = isN2 ? val / 10.0 : val;
          return scaled * scale;
        });
        const label = isN2 ? "N2/10" : species;
        const lineColor = LINE_COLORS[idx % LINE_COLORS.length];
        const maxIndex = values.reduce((bestIdx, val, currentIdx) => {
          if (!Number.isFinite(val)) {
            return bestIdx;
          }
          if (bestIdx < 0 || val > values[bestIdx]) {
            return currentIdx;
          }
          return bestIdx;
        }, -1);
        const lineTrace = {
          type: "scatter",
          mode: "lines+markers",
          name: label,
          x: series.phi,
          y: values,
          line: { width: 3.0, color: lineColor },
          marker: { size: 0, opacity: 0.0, color: lineColor },
          hovertemplate: `${label}<br>index=%{pointNumber}<br>phi=%{x:.4f}<br>${valueLabel}=%{y:${valueFormat}}<extra></extra>`
        };
        if (maxIndex >= 0) {
          return [
            lineTrace,
            {
              type: "scatter",
              mode: "markers",
              name: `${label} max`,
              x: [series.phi[maxIndex]],
              y: [values[maxIndex]],
              marker: {
                size: 9,
                symbol: "x",
                color: lineColor,
                line: { width: 1.5, color: "#ffffff" }
              },
              showlegend: false,
              hovertemplate: `${label} max<br>phi=%{x:.4f}<br>${valueLabel}=%{y:${valueFormat}}<extra></extra>`
            }
          ];
        }
        return [lineTrace];
      });

    const flatTraces = traces.flat();

    const tadValues = Array.isArray(tadSeries?.values) ? tadSeries.values : [];
    const tadHasFinite = tadValues.some((val) => Number.isFinite(val));
    if (tadSeries?.phi && tadHasFinite) {
      flatTraces.push({
        type: "scatter",
        mode: "lines",
        name: "Adiabatic flame temperature (T_ad(\u03c6))",
        x: tadSeries.phi,
        y: tadValues,
        yaxis: "y2",
        line: { width: 1.6, color: "#ffffff", dash: "dot" },
        connectgaps: false,
        hovertemplate: "Adiabatic flame temperature<br>index=%{pointNumber}<br>phi=%{x:.4f}<br>T_ad=%{y:.0f} K<extra></extra>"
      });
      const tadMaxIndex = tadValues.reduce((bestIdx, val, currentIdx) => {
        if (!Number.isFinite(val)) {
          return bestIdx;
        }
        if (bestIdx < 0 || val > tadValues[bestIdx]) {
          return currentIdx;
        }
        return bestIdx;
      }, -1);
      if (tadMaxIndex >= 0) {
        flatTraces.push({
          type: "scatter",
          mode: "markers",
          name: "T_ad max",
          x: [tadSeries.phi[tadMaxIndex]],
          y: [tadValues[tadMaxIndex]],
          yaxis: "y2",
          marker: {
            size: 9,
            symbol: "x",
            color: "#ffffff",
            line: { width: 1.5, color: "#ffffff" }
          },
          showlegend: false,
          hovertemplate: "T_ad max<br>phi=%{x:.4f}<br>T_ad=%{y:.0f} K<extra></extra>"
        });
      }
    }

    return { title, traces: flatTraces };
  };

  const idealTrace = buildTrace(
    "Ideal (no dissociation) products",
    idealSeries,
    { phi: mapData?.tad?.phi, values: mapData?.tad?.ideal }
  );
  const idealPpmTrace = buildTrace(
    "Ideal (no dissociation) products (ppm)",
    idealSeries,
    { phi: mapData?.tad?.phi, values: mapData?.tad?.ideal },
    { scale: 1.0e6, valueLabel: "ppm", valueFormat: ".2f" }
  );
  const dissTrace = buildTrace(
    "Equilibrium (dissociation) products",
    dissSeries,
    { phi: mapData?.tad?.phi, values: mapData?.tad?.dissociation }
  );
  const dissPpmTrace = buildTrace(
    "Equilibrium (dissociation) products (ppm)",
    dissSeries,
    { phi: mapData?.tad?.phi, values: mapData?.tad?.dissociation },
    { scale: 1.0e6, valueLabel: "ppm", valueFormat: ".2f" }
  );

  const activeMode = mode === "dissociation" ? "dissociation" : "ideal";
  const activeTadValues = activeMode === "dissociation"
    ? mapData?.tad?.dissociation
    : mapData?.tad?.ideal;
  const activeTadDiagnostics = activeMode === "dissociation"
    ? mapData?.tad?.dissociation_diagnostics
    : mapData?.tad?.ideal_diagnostics;

  const selectedPhiValue = Number.isFinite(selectedPhi) ? selectedPhi : null;
  const selectedTadValue = Number.isFinite(selectedTadK) ? selectedTadK : null;

  const visibleSpecies = useMemo(() => {
    const series = activeMode === "dissociation" ? dissSeries : idealSeries;
    if (!series?.species || !series?.xi) {
      return [];
    }
    if (!keySpeciesOnly) {
      return series.species;
    }
    const scores = series.species.map((species) => {
      const values = series.xi?.[species] || [];
      const maxVal = values.reduce((max, val) => (Number.isFinite(val) && val > max ? val : max), 0);
      return { species, maxVal };
    });
    return scores
      .sort((a, b) => b.maxVal - a.maxVal)
      .slice(0, Math.max(1, Number(keySpeciesCount) || 1))
      .map((item) => item.species);
  }, [activeMode, dissSeries, idealSeries, keySpeciesCount, keySpeciesOnly]);

  const hasTadGaps = useMemo(() => {
    if (!Array.isArray(activeTadValues)) {
      return false;
    }
    return activeTadValues.some((val) => !Number.isFinite(val));
  }, [activeTadValues]);

  const tadFailureCount = useMemo(() => {
    if (!Array.isArray(activeTadDiagnostics)) {
      return 0;
    }
    return activeTadDiagnostics.filter((item) => item?.converged === false || item?.note).length;
  }, [activeTadDiagnostics]);

  const buildXiLayout = ({ yTitle, yScale = "linear" }) => ({
    autosize: true,
    xaxis: {
      title: { text: "Equivalence ratio, phi [-]", font: { color: "#f3eaff", size: 14 } },
      tickfont: { color: "#f3eaff", size: 11 },
      color: "#f3eaff",
      automargin: true,
      gridcolor: "rgba(255, 214, 153, 0.2)",
      griddash: "dot",
      showgrid: true,
      showspikes: true,
      spikemode: "across",
      spikesnap: "cursor",
      spikethickness: 1,
      spikecolor: "rgba(243, 234, 255, 0.6)"
    },
    yaxis: {
      title: { text: yTitle, font: { color: "#f3eaff", size: 14 } },
      tickfont: { color: "#f3eaff", size: 11 },
      color: "#f3eaff",
      automargin: true,
      type: yScale,
      gridcolor: "rgba(255, 214, 153, 0.2)",
      griddash: "dot",
      showgrid: true
    },
    yaxis2: {
      title: { text: "Adiabatic flame temperature, T_ad [K]", font: { color: "#f3eaff", size: 13 }, standoff: 18 },
      tickfont: { color: "#f3eaff", size: 11 },
      color: "#f3eaff",
      overlaying: "y",
      side: "right",
      showgrid: false,
      zeroline: false
    },
    showlegend: true,
    legend: {
      orientation: "h",
      y: 1.08,
      x: 0,
      xanchor: "left",
      yanchor: "bottom",
      bgcolor: "rgba(0,0,0,0.4)",
      bordercolor: "rgba(255,255,255,0.15)",
      borderwidth: 1,
      font: { color: "#f3eaff", size: 11 }
    },
    hoverdistance: 15,
    spikedistance: 15,
    margin: { t: 80, r: 60, l: 70, b: 70 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(255,255,255,0.08)",
    font: { color: "#f3eaff", size: 12 }
  });

  const tadMatch = useMemo(() => {
    if (!Array.isArray(mapData?.tad?.phi)) {
      return null;
    }
    if (!Array.isArray(activeTadValues)) {
      return null;
    }
    if (selectedPhiValue === null || selectedTadValue === null) {
      return null;
    }
    let bestIdx = -1;
    let bestDiff = Infinity;
    mapData.tad.phi.forEach((phiVal, idx) => {
      if (!Number.isFinite(phiVal)) {
        return;
      }
      const diff = Math.abs(phiVal - selectedPhiValue);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = idx;
      }
    });
    if (bestIdx < 0) {
      return null;
    }
    const tadAtPhi = activeTadValues[bestIdx];
    if (!Number.isFinite(tadAtPhi)) {
      return {
        phi: mapData.tad.phi[bestIdx],
        t_ad_k: null,
        delta_k: null,
        phi_delta: bestDiff,
        match_ok: false
      };
    }
    const delta = tadAtPhi - selectedTadValue;
    return {
      phi: mapData.tad.phi[bestIdx],
      t_ad_k: tadAtPhi,
      delta_k: delta,
      phi_delta: bestDiff,
      match_ok: Math.abs(delta) <= 1.0
    };
  }, [activeTadValues, mapData?.tad?.phi, selectedPhiValue, selectedTadValue]);

  const tadDiagnosticsTable = useMemo(() => {
    if (!Array.isArray(activeTadDiagnostics) || !activeTadDiagnostics.length) {
      return null;
    }
    const rows = activeTadDiagnostics.map((item) => ({
      "phi": Number.isFinite(item?.phi) ? Number(item.phi).toFixed(4) : "--",
      "T_ad (K)": Number.isFinite(item?.t_ad_k) ? Number(item.t_ad_k).toFixed(2) : "--",
      "converged": item?.converged === true ? "Yes" : item?.converged === false ? "No" : "--",
      "iter": Number.isFinite(item?.iterations) ? item.iterations : "--",
      "residual (kJ)": Number.isFinite(item?.residual_kj) ? Number(item.residual_kj).toExponential(3) : "--",
      "note": item?.note || ""
    }));
    return {
      title: "Xi sweep diagnostics",
      table: {
        columns: ["phi", "T_ad (K)", "converged", "iter", "residual (kJ)", "note"],
        rows
      }
    };
  }, [activeTadDiagnostics]);

  const reactantLabel = useMemo(() => {
    const tFuel = inputs?.t_fuel_k;
    const tAir = inputs?.t_air_k;
    if (!Number.isFinite(tFuel) || !Number.isFinite(tAir)) {
      return "";
    }
    return `T_fuel=${Number(tFuel).toFixed(0)} K, T_air=${Number(tAir).toFixed(0)} K`;
  }, [inputs]);

  return (
    <div className="analysis-content">
      <div className="analysis-plot-block">
        <div className="analysis-plot-controls">
          <div className="analysis-inputs">
            <h4>Xi Map Controls</h4>
            <div className="analysis-input-grid">
              <label className="analysis-input-field">
                <span className="analysis-input-label">
                  <LatexText latex={String.raw`T_{prod}`} />
                  <span className="analysis-input-unit">(K)</span>
                </span>
                <input
                  type="number"
                  value={mapInputs.t_k}
                  step={1}
                  onChange={handleChange("t_k")}
                />
                <div className="analysis-input-hint">Fixed product temperature for Xi curves; the adiabatic T_ad sweep uses reactant temperatures from the main inputs.</div>
              </label>
              <label className="analysis-input-field">
                <span className="analysis-input-label"><LatexText latex={String.raw`\phi_{min}`} /></span>
                <input
                  type="number"
                  value={mapInputs.phi_min}
                  step={0.01}
                  onChange={handleChange("phi_min")}
                />
              </label>
              <label className="analysis-input-field">
                <span className="analysis-input-label"><LatexText latex={String.raw`\phi_{max}`} /></span>
                <input
                  type="number"
                  value={mapInputs.phi_max}
                  step={0.01}
                  onChange={handleChange("phi_max")}
                />
              </label>
              <label className="analysis-input-field">
                <span className="analysis-input-label"><LatexText latex={String.raw`\Delta\phi`} /></span>
                <input
                  type="number"
                  value={mapInputs.phi_step}
                  step={0.01}
                  onChange={handleChange("phi_step")}
                />
              </label>
              <label className="analysis-input-field">
                <span className="analysis-input-label">min mole</span>
                <input
                  type="number"
                  value={mapInputs.min_mol}
                  step={1.0e-7}
                  onChange={handleChange("min_mol")}
                />
              </label>
              <label className="analysis-input-field">
                <span className="analysis-input-label">Species (from results)</span>
                <div className="analysis-input-hint">
                  {speciesOptions.length ? speciesOptions.join(", ") : "Compute products first."}
                </div>
              </label>
              <label className="analysis-input-field">
                <span className="analysis-input-label">Key species only</span>
                <div className="analysis-input-toggle">
                  <input
                    type="checkbox"
                    checked={keySpeciesOnly}
                    onChange={(event) => setKeySpeciesOnly(event.target.checked)}
                  />
                  <span className="analysis-input-hint">
                    Top N species by max <LatexText latex={String.raw`X_i`} /> in this sweep.
                  </span>
                </div>
              </label>
              <label className="analysis-input-field">
                <span className="analysis-input-label">Key species count</span>
                <input
                  type="number"
                  min={3}
                  max={20}
                  step={1}
                  value={keySpeciesCount}
                  onChange={(event) => setKeySpeciesCount(toNumberOrEmpty(event.target.value))}
                  disabled={!keySpeciesOnly}
                />
              </label>
            </div>
          </div>
          <div className="analysis-plot-actions">
            <button type="button" onClick={handleCompute} disabled={loading}>
              {loading ? "Computing..." : "Compute Xi Map"}
            </button>
            {loading && showTimer ? (
              <span className="compute-timer">
                Please wait, computation time is {formatElapsed(elapsedMs)}.
              </span>
            ) : null}
            {error ? <span className="error">{error}</span> : null}
          </div>
        </div>
        <div className="xi-plot-stack">
          {activeMode === "ideal" ? (
            <div className="plot-card">
              <div className="plot-card-header">
                <h3>Ideal Products (Xi)</h3>
                <div className="plot-card-meta">Fixed T_prod = {Number(mapInputs.t_k).toFixed(0)} K{reactantLabel ? `; ${reactantLabel}` : ""}</div>
                <div className="plot-card-meta">Dashed line: adiabatic flame temperature T_ad(phi)</div>
              </div>
              <div className="plot-frame plot-frame--xi">
                <Plot
                  data={buildTrace(
                    idealTrace.title,
                    idealSeries,
                    { phi: mapData?.tad?.phi, values: mapData?.tad?.ideal },
                    { visibleSpecies }
                  ).traces}
                  layout={buildXiLayout({
                    yTitle: "Mole fraction, X_i [-]",
                    yScale: "linear"
                  })}
                  config={plotConfig}
                  style={{ width: "100%", height: "100%" }}
                  useResizeHandler
                />
              </div>
              {mapData?.ideal?.note ? (
                <p className="plot-caption">{mapData.ideal.note}</p>
              ) : null}
              {mapData?.tad?.ideal_note ? (
                <p className="plot-caption">T_ad (Ideal (no dissociation)): {mapData.tad.ideal_note}</p>
              ) : null}
            </div>
          ) : null}
          {activeMode === "ideal" ? (
            <div className="plot-card">
              <div className="plot-card-header">
                <h3>Ideal Products (ppm)</h3>
                <div className="plot-card-meta">Fixed T_prod = {Number(mapInputs.t_k).toFixed(0)} K{reactantLabel ? `; ${reactantLabel}` : ""}</div>
                <div className="plot-card-meta">Dashed line: adiabatic flame temperature T_ad(phi)</div>
              </div>
              <div className="plot-frame plot-frame--xi">
                <Plot
                  data={buildTrace(
                    idealPpmTrace.title,
                    idealSeries,
                    { phi: mapData?.tad?.phi, values: mapData?.tad?.ideal },
                    { scale: 1.0e6, valueLabel: "ppm", valueFormat: ".2f", visibleSpecies }
                  ).traces}
                  layout={buildXiLayout({
                    yTitle: "Mole fraction, X_i [ppm]",
                    yScale: "log"
                  })}
                  config={plotConfig}
                  style={{ width: "100%", height: "100%" }}
                  useResizeHandler
                />
              </div>
              {mapData?.ideal?.note ? (
                <p className="plot-caption">{mapData.ideal.note}</p>
              ) : null}
              {mapData?.tad?.ideal_note ? (
                <p className="plot-caption">T_ad (Ideal (no dissociation)): {mapData.tad.ideal_note}</p>
              ) : null}
            </div>
          ) : null}
          {activeMode === "dissociation" ? (
            <div className="plot-card">
              <div className="plot-card-header">
                <h3>Equilibrium Products (Xi)</h3>
                <div className="plot-card-meta">Fixed T_prod = {Number(mapInputs.t_k).toFixed(0)} K{reactantLabel ? `; ${reactantLabel}` : ""}</div>
                <div className="plot-card-meta">Dashed line: adiabatic flame temperature T_ad(phi)</div>
              </div>
              <div className="plot-frame plot-frame--xi">
                <Plot
                  data={buildTrace(
                    dissTrace.title,
                    dissSeries,
                    { phi: mapData?.tad?.phi, values: mapData?.tad?.dissociation },
                    { visibleSpecies }
                  ).traces}
                  layout={buildXiLayout({
                    yTitle: "Mole fraction, X_i [-]",
                    yScale: "linear"
                  })}
                  config={plotConfig}
                  style={{ width: "100%", height: "100%" }}
                  useResizeHandler
                />
              </div>
              {mapData?.dissociation?.note ? (
                <p className="plot-caption">{mapData.dissociation.note}</p>
              ) : null}
              {mapData?.tad?.dissociation_note ? (
                <p className="plot-caption">T_ad (Equilibrium (dissociation)): {mapData.tad.dissociation_note}</p>
              ) : null}
            </div>
          ) : null}
          {activeMode === "dissociation" ? (
            <div className="plot-card">
              <div className="plot-card-header">
                <h3>Equilibrium Products (ppm)</h3>
                <div className="plot-card-meta">Fixed T_prod = {Number(mapInputs.t_k).toFixed(0)} K{reactantLabel ? `; ${reactantLabel}` : ""}</div>
                <div className="plot-card-meta">Dashed line: adiabatic flame temperature T_ad(phi)</div>
              </div>
              <div className="plot-frame plot-frame--xi">
                <Plot
                  data={buildTrace(
                    dissPpmTrace.title,
                    dissSeries,
                    { phi: mapData?.tad?.phi, values: mapData?.tad?.dissociation },
                    { scale: 1.0e6, valueLabel: "ppm", valueFormat: ".2f", visibleSpecies }
                  ).traces}
                  layout={buildXiLayout({
                    yTitle: "Mole fraction, X_i [ppm]",
                    yScale: "log"
                  })}
                  config={plotConfig}
                  style={{ width: "100%", height: "100%" }}
                  useResizeHandler
                />
              </div>
              {mapData?.dissociation?.note ? (
                <p className="plot-caption">{mapData.dissociation.note}</p>
              ) : null}
              {mapData?.tad?.dissociation_note ? (
                <p className="plot-caption">T_ad (Equilibrium (dissociation)): {mapData.tad.dissociation_note}</p>
              ) : null}
            </div>
          ) : null}
        </div>
        <p className="plot-caption">
          Solid lines: species mole fractions at fixed product temperature. Dashed line: adiabatic flame temperature Tad(phi).
          Fixed-T composition curves and adiabatic temperature line represent different thermodynamic states and should not be directly compared.
        </p>
        {hasTadGaps || tadFailureCount > 0 ? (
          <p className="plot-caption">
            No adiabatic solution at some phi values. Gaps in the dashed line indicate missing or unconverged points.
          </p>
        ) : null}
        {tadMatch ? (
          <p className="plot-caption">
            Selected phi comparison: phi={Number.isFinite(tadMatch.phi) ? tadMatch.phi.toFixed(4) : "--"},
            T_ad (Xi)={Number.isFinite(tadMatch.t_ad_k) ? ` ${Number(tadMatch.t_ad_k).toFixed(2)} K` : " --"}
            {Number.isFinite(tadMatch.delta_k)
              ? `, Delta T=${Number(tadMatch.delta_k).toFixed(2)} K, match=${tadMatch.match_ok ? "OK" : "check"}`
              : ""}
          </p>
        ) : null}
        {tadDiagnosticsTable ? (
          <TableView
            title={tadDiagnosticsTable.title}
            table={tadDiagnosticsTable.table}
            enableSort
          />
        ) : null}
      </div>
    </div>
  );
}
