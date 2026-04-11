import { useMemo, useState } from "react";
import Plot from "react-plotly.js";
import LatexText from "./LatexText";
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

export default function FuelXiMap({ inputs, speciesList, mode }) {
  const [mapInputs, setMapInputs] = useState(DEFAULT_MAP_INPUTS);
  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    const traces = series.species
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
        name: "T_ad",
        x: tadSeries.phi,
        y: tadValues,
        yaxis: "y2",
        line: { width: 1.6, color: "#ffffff", dash: "dot" },
        hovertemplate: "T_ad<br>index=%{pointNumber}<br>phi=%{x:.4f}<br>T_ad=%{y:.0f} K<extra></extra>"
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
    "Ideal Products",
    idealSeries,
    { phi: mapData?.tad?.phi, values: mapData?.tad?.ideal }
  );
  const idealPpmTrace = buildTrace(
    "Ideal Products (ppm)",
    idealSeries,
    { phi: mapData?.tad?.phi, values: mapData?.tad?.ideal },
    { scale: 1.0e6, valueLabel: "ppm", valueFormat: ".2f" }
  );
  const dissTrace = buildTrace(
    "Dissociation Products",
    dissSeries,
    { phi: mapData?.tad?.phi, values: mapData?.tad?.dissociation }
  );
  const dissPpmTrace = buildTrace(
    "Dissociation Products (ppm)",
    dissSeries,
    { phi: mapData?.tad?.phi, values: mapData?.tad?.dissociation },
    { scale: 1.0e6, valueLabel: "ppm", valueFormat: ".2f" }
  );

  const activeMode = mode === "dissociation" ? "dissociation" : "ideal";

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
                <div className="analysis-input-hint">Fixed products temperature for Xi curves; does not set the T_ad vs phi line.</div>
              </label>
              <label className="analysis-input-field">
                <span className="analysis-input-label">phi min</span>
                <input
                  type="number"
                  value={mapInputs.phi_min}
                  step={0.01}
                  onChange={handleChange("phi_min")}
                />
              </label>
              <label className="analysis-input-field">
                <span className="analysis-input-label">phi max</span>
                <input
                  type="number"
                  value={mapInputs.phi_max}
                  step={0.01}
                  onChange={handleChange("phi_max")}
                />
              </label>
              <label className="analysis-input-field">
                <span className="analysis-input-label">phi step</span>
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
            </div>
          </div>
          <div className="analysis-plot-actions">
            <button type="button" onClick={handleCompute} disabled={loading}>
              {loading ? "Computing..." : "Compute Xi Map"}
            </button>
            {error ? <span className="error">{error}</span> : null}
          </div>
        </div>
        <div className="xi-plot-stack">
          {activeMode === "ideal" ? (
            <div className="plot-card">
              <div className="plot-frame plot-frame--performance">
                <Plot
                  data={idealTrace.traces}
                  layout={{
                    autosize: true,
                    title: {
                      text: `${idealTrace.title}<br><span style="font-size:12px;opacity:0.85">Fixed T_prod = ${Number(mapInputs.t_k).toFixed(0)} K</span>`,
                      font: { color: "#f3eaff", size: 17 }
                    },
                    xaxis: {
                      title: { text: "$\\text{Equivalence ratio, }\\phi\\ \\text{[d.l.]}$", font: { color: "#f3eaff", size: 14 } },
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
                      title: { text: "$\\text{Mole fraction, }X_i\\ \\text{[d.l.]}$", font: { color: "#f3eaff", size: 14 } },
                      tickfont: { color: "#f3eaff", size: 11 },
                      color: "#f3eaff",
                      automargin: true,
                      gridcolor: "rgba(255, 214, 153, 0.2)",
                      griddash: "dot",
                      showgrid: true
                    },
                    yaxis2: {
                      title: { text: "$\\text{Adiabatic flame temperature, }T_{ad}\\ \\text{[K]}$", font: { color: "#f3eaff", size: 13 }, standoff: 18 },
                      tickfont: { color: "#f3eaff", size: 11 },
                      color: "#f3eaff",
                      overlaying: "y",
                      side: "right",
                      showgrid: false,
                      zeroline: false
                    },
                    showlegend: true,
                    legend: {
                      orientation: "v",
                      y: 1.0,
                      x: 1.1,
                      xanchor: "left",
                      yanchor: "top",
                      bgcolor: "rgba(0,0,0,0.5)",
                      bordercolor: "rgba(255,255,255,0.15)",
                      borderwidth: 1,
                      font: { color: "#f3eaff", size: 12 }
                    },
                    hoverdistance: 15,
                    spikedistance: 15,
                    margin: { t: 90, r: 160, l: 70, b: 70 },
                    paper_bgcolor: "rgba(0,0,0,0)",
                    plot_bgcolor: "rgba(255,255,255,0.08)",
                    font: { color: "#f3eaff", size: 12 }
                  }}
                  config={plotConfig}
                  style={{ width: "100%", height: "100%" }}
                  useResizeHandler
                />
              </div>
              {mapData?.ideal?.note ? (
                <p className="plot-caption">{mapData.ideal.note}</p>
              ) : null}
              {mapData?.tad?.ideal_note ? (
                <p className="plot-caption">T_ad (ideal): {mapData.tad.ideal_note}</p>
              ) : null}
            </div>
          ) : null}
          {activeMode === "ideal" ? (
            <div className="plot-card">
              <div className="plot-frame plot-frame--performance">
                <Plot
                  data={idealPpmTrace.traces}
                  layout={{
                    autosize: true,
                    title: {
                      text: `${idealPpmTrace.title}<br><span style="font-size:12px;opacity:0.85">Fixed T_prod = ${Number(mapInputs.t_k).toFixed(0)} K</span>`,
                      font: { color: "#f3eaff", size: 17 }
                    },
                    xaxis: {
                      title: { text: "$\\text{Equivalence ratio, }\\phi\\ \\text{[d.l.]}$", font: { color: "#f3eaff", size: 14 } },
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
                      title: { text: "$\\text{Mole fraction, }X_i\\ \\text{[ppm]}$", font: { color: "#f3eaff", size: 14 } },
                      tickfont: { color: "#f3eaff", size: 11 },
                      color: "#f3eaff",
                      type: "log",
                      automargin: true,
                      gridcolor: "rgba(255, 214, 153, 0.2)",
                      griddash: "dot",
                      showgrid: true
                    },
                    yaxis2: {
                      title: { text: "$\\text{Adiabatic flame temperature, }T_{ad}\\ \\text{[K]}$", font: { color: "#f3eaff", size: 13 }, standoff: 18 },
                      tickfont: { color: "#f3eaff", size: 11 },
                      color: "#f3eaff",
                      overlaying: "y",
                      side: "right",
                      showgrid: false,
                      zeroline: false
                    },
                    showlegend: true,
                    legend: {
                      orientation: "v",
                      y: 1.0,
                      x: 1.1,
                      xanchor: "left",
                      yanchor: "top",
                      bgcolor: "rgba(0,0,0,0.5)",
                      bordercolor: "rgba(255,255,255,0.15)",
                      borderwidth: 1,
                      font: { color: "#f3eaff", size: 12 }
                    },
                    hoverdistance: 15,
                    spikedistance: 15,
                    margin: { t: 90, r: 160, l: 70, b: 70 },
                    paper_bgcolor: "rgba(0,0,0,0)",
                    plot_bgcolor: "rgba(255,255,255,0.08)",
                    font: { color: "#f3eaff", size: 12 }
                  }}
                  config={plotConfig}
                  style={{ width: "100%", height: "100%" }}
                  useResizeHandler
                />
              </div>
              {mapData?.ideal?.note ? (
                <p className="plot-caption">{mapData.ideal.note}</p>
              ) : null}
              {mapData?.tad?.ideal_note ? (
                <p className="plot-caption">T_ad (ideal): {mapData.tad.ideal_note}</p>
              ) : null}
            </div>
          ) : null}
          {activeMode === "dissociation" ? (
            <div className="plot-card">
              <div className="plot-frame plot-frame--performance">
                <Plot
                  data={dissTrace.traces}
                  layout={{
                    autosize: true,
                    title: {
                      text: `${dissTrace.title}<br><span style="font-size:12px;opacity:0.85">Fixed T_prod = ${Number(mapInputs.t_k).toFixed(0)} K</span>`,
                      font: { color: "#f3eaff", size: 17 }
                    },
                    xaxis: {
                      title: { text: "$\\text{Equivalence ratio, }\\phi\\ \\text{[d.l.]}$", font: { color: "#f3eaff", size: 14 } },
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
                      title: { text: "$\\text{Mole fraction, }X_i\\ \\text{[d.l.]}$", font: { color: "#f3eaff", size: 14 } },
                      tickfont: { color: "#f3eaff", size: 11 },
                      color: "#f3eaff",
                      automargin: true,
                      gridcolor: "rgba(255, 214, 153, 0.2)",
                      griddash: "dot",
                      showgrid: true
                    },
                    yaxis2: {
                      title: { text: "$\\text{Adiabatic flame temperature, }T_{ad}\\ \\text{[K]}$", font: { color: "#f3eaff", size: 13 }, standoff: 18 },
                      tickfont: { color: "#f3eaff", size: 11 },
                      color: "#f3eaff",
                      overlaying: "y",
                      side: "right",
                      showgrid: false,
                      zeroline: false
                    },
                    showlegend: true,
                    legend: {
                      orientation: "v",
                      y: 1.0,
                      x: 1.1,
                      xanchor: "left",
                      yanchor: "top",
                      bgcolor: "rgba(0,0,0,0.5)",
                      bordercolor: "rgba(255,255,255,0.15)",
                      borderwidth: 1,
                      font: { color: "#f3eaff", size: 12 }
                    },
                    hoverdistance: 15,
                    spikedistance: 15,
                    margin: { t: 90, r: 160, l: 70, b: 70 },
                    paper_bgcolor: "rgba(0,0,0,0)",
                    plot_bgcolor: "rgba(255,255,255,0.08)",
                    font: { color: "#f3eaff", size: 12 }
                  }}
                  config={plotConfig}
                  style={{ width: "100%", height: "100%" }}
                  useResizeHandler
                />
              </div>
              {mapData?.dissociation?.note ? (
                <p className="plot-caption">{mapData.dissociation.note}</p>
              ) : null}
              {mapData?.tad?.dissociation_note ? (
                <p className="plot-caption">T_ad (dissociation): {mapData.tad.dissociation_note}</p>
              ) : null}
            </div>
          ) : null}
          {activeMode === "dissociation" ? (
            <div className="plot-card">
              <div className="plot-frame plot-frame--performance">
                <Plot
                  data={dissPpmTrace.traces}
                  layout={{
                    autosize: true,
                    title: {
                      text: `${dissPpmTrace.title}<br><span style="font-size:12px;opacity:0.85">Fixed T_prod = ${Number(mapInputs.t_k).toFixed(0)} K</span>`,
                      font: { color: "#f3eaff", size: 17 }
                    },
                    xaxis: {
                      title: { text: "$\\text{Equivalence ratio, }\\phi\\ \\text{[d.l.]}$", font: { color: "#f3eaff", size: 14 } },
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
                      title: { text: "$\\text{Mole fraction, }X_i\\ \\text{[ppm]}$", font: { color: "#f3eaff", size: 14 } },
                      tickfont: { color: "#f3eaff", size: 11 },
                      color: "#f3eaff",
                      type: "log",
                      automargin: true,
                      gridcolor: "rgba(255, 214, 153, 0.2)",
                      griddash: "dot",
                      showgrid: true
                    },
                    yaxis2: {
                      title: { text: "$\\text{Adiabatic flame temperature, }T_{ad}\\ \\text{[K]}$", font: { color: "#f3eaff", size: 13 }, standoff: 18 },
                      tickfont: { color: "#f3eaff", size: 11 },
                      color: "#f3eaff",
                      overlaying: "y",
                      side: "right",
                      showgrid: false,
                      zeroline: false
                    },
                    showlegend: true,
                    legend: {
                      orientation: "v",
                      y: 1.0,
                      x: 1.1,
                      xanchor: "left",
                      yanchor: "top",
                      bgcolor: "rgba(0,0,0,0.5)",
                      bordercolor: "rgba(255,255,255,0.15)",
                      borderwidth: 1,
                      font: { color: "#f3eaff", size: 12 }
                    },
                    hoverdistance: 15,
                    spikedistance: 15,
                    margin: { t: 90, r: 160, l: 70, b: 70 },
                    paper_bgcolor: "rgba(0,0,0,0)",
                    plot_bgcolor: "rgba(255,255,255,0.08)",
                    font: { color: "#f3eaff", size: 12 }
                  }}
                  config={plotConfig}
                  style={{ width: "100%", height: "100%" }}
                  useResizeHandler
                />
              </div>
              {mapData?.dissociation?.note ? (
                <p className="plot-caption">{mapData.dissociation.note}</p>
              ) : null}
              {mapData?.tad?.dissociation_note ? (
                <p className="plot-caption">T_ad (dissociation): {mapData.tad.dissociation_note}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
