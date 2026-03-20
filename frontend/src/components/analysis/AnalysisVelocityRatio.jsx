import { useEffect, useMemo, useRef, useState } from "react";
import Plot from "react-plotly.js";
import { postJson } from "../../api/client";
import LatexText from "../LatexText";
import AnalysisInputs from "./AnalysisInputs";

const DEFAULT_INPUTS = {
  gamma: 1.4,
  tau_r: 1.45,
  tau_lambda: 8.4,
  tau_f: 170.0,
  tau_c_min: 1.05,
  tau_c_max: 7.0,
  npts: 400
};

const INPUT_FIELDS = [
  { key: "gamma", label: "\\gamma", latex: true, step: 0.01, min: 1.0, max: 1.67 },
  { key: "tau_r", label: "\\tau_r", latex: true, step: 0.001, min: 1.0, max: 4.0 },
  { key: "tau_lambda", label: "\\tau_\\lambda", latex: true, step: 0.1, min: 1.1, max: 20.0 },
  { key: "tau_f", label: "\\tau_f", latex: true, step: 1.0, min: 1.0, max: 300.0 },
  { key: "tau_c_min", label: "\\tau_c\\ min", latex: true, step: 0.01, min: 1.01, max: 10.0 },
  { key: "tau_c_max", label: "\\tau_c\\ max", latex: true, step: 0.1, min: 2.0, max: 80.0 },
  { key: "npts", label: "npts", latex: false, step: 50, min: 100, max: 2000 }
];

export default function AnalysisVelocityRatio() {
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const plotContainerRef = useRef(null);
  const [plotWidth, setPlotWidth] = useState(0);
  const gapPx = 200;

  const handleChange = (key, value) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const handleCompute = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await postJson("/api/analysis/ideal/velocity-ratio", inputs);
      setData(response);
    } catch (err) {
      setError(err.message || "Failed to compute.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleCompute();
  }, []);

  useEffect(() => {
    const element = plotContainerRef.current;
    if (!element) {
      return undefined;
    }

    const updateWidth = () => {
      const nextWidth = element.getBoundingClientRect().width;
      if (Number.isFinite(nextWidth)) {
        setPlotWidth(nextWidth);
      }
    };

    if (typeof ResizeObserver === "undefined") {
      updateWidth();
      return undefined;
    }

    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    updateWidth();

    return () => observer.disconnect();
  }, []);

  const plotConfig = useMemo(() => ({ responsive: true, mathjax: "cdn" }), []);
  const layoutBase = useMemo(() => ({
    autosize: true,
    margin: { t: 90, r: Math.max(360, gapPx * 2 + 220), l: 80, b: 70 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(255,255,255,0.08)",
    font: { color: "#f3eaff", size: 13 },
    legend: {
      orientation: "v",
      x: 1.15,
      y: 0.5,
      xanchor: "left",
      yanchor: "middle",
      bgcolor: "rgba(0,0,0,0.4)",
      bordercolor: "#ff9f1c",
      borderwidth: 2
    },
  }), [gapPx]);

  const plotData = useMemo(() => {
    if (!data?.series?.tau_c?.x?.length) {
      return [];
    }
    const x = data.series.tau_c.x;
    const velocityRatio = data.series.tau_c.velocity_ratio;
    const me = data.series.tau_c.me;
    const tbar = data.series.tau_c.tbar;
    const m0 = data.params?.m0;

    const params = data.params || {};
    const pickValue = (value, key) => (Number.isFinite(value) ? value : inputs?.[key]);
    const formatValue = (value, digits) => (Number.isFinite(value) ? value.toFixed(digits) : "?");
    const tau_r_val = pickValue(params.tau_r, "tau_r");
    const tau_lambda_val = pickValue(params.tau_lambda, "tau_lambda");
    const tau_f_val = pickValue(params.tau_f, "tau_f");
    const gamma_val = pickValue(params.gamma, "gamma");
    const m0_val = (Number.isFinite(tau_r_val) && Number.isFinite(gamma_val))
      ? Math.sqrt(2.0 * (tau_r_val - 1.0) / (gamma_val - 1.0))
      : params.m0;
    const summaryLabel = `$U_e/U_0\ (M_0=${formatValue(m0_val, 2)},\\ \\tau_r=${formatValue(tau_r_val, 3)},\\ \\tau_\\lambda=${formatValue(tau_lambda_val, 3)},\\ \\tau_f=${formatValue(tau_f_val, 1)})$`;

    const interpolateValue = (xs, ys, target) => {
      if (!Number.isFinite(target) || !xs?.length || xs.length !== ys?.length) {
        return null;
      }
      for (let i = 1; i < xs.length; i += 1) {
        const x0 = xs[i - 1];
        const x1 = xs[i];
        if (!Number.isFinite(x0) || !Number.isFinite(x1)) {
          continue;
        }
        const crosses = (x0 - target) * (x1 - target) <= 0;
        if (!crosses) {
          continue;
        }
        const y0 = ys[i - 1];
        const y1 = ys[i];
        if (!Number.isFinite(y0) || !Number.isFinite(y1)) {
          return null;
        }
        if (x1 === x0) {
          return y0;
        }
        const t = (target - x0) / (x1 - x0);
        return y0 + t * (y1 - y0);
      }
      return null;
    };

    const traces = [
      {
        x,
        y: velocityRatio,
        type: "scatter",
        mode: "lines",
        name: summaryLabel,
        line: { color: "#1f77b4", width: 2 }
      }
    ];

    const markerMap = {
      calc: { color: "#1f77b4", symbol: "circle" },
      numeric: { color: "#ff7f0e", symbol: "x" },
      fuel_off: { color: "#9467bd", symbol: "diamond" }
    };
    const meMarkerMap = {
      calc: { color: "#2ca02c", symbol: "circle" },
      numeric: { color: "#bcbd22", symbol: "x" },
      fuel_off: { color: "#8c564b", symbol: "diamond" }
    };

    const calcTauC = Number.isFinite(tau_lambda_val) && Number.isFinite(tau_r_val)
      ? Math.sqrt(tau_lambda_val) / tau_r_val
      : null;
    const fuelOffTauC = Number.isFinite(tau_lambda_val) && Number.isFinite(tau_r_val)
      ? tau_lambda_val / tau_r_val
      : null;
    const numericIndex = velocityRatio.reduce((bestIndex, value, index) => {
      if (!Number.isFinite(value)) {
        return bestIndex;
      }
      if (bestIndex === null || value > velocityRatio[bestIndex]) {
        return index;
      }
      return bestIndex;
    }, null);
    const numericTauC = Number.isFinite(numericIndex) ? x[numericIndex] : null;
    const meLegendEntries = [];
    const markerSpecs = [
      {
        key: "calc",
        tau_c: calcTauC,
        velocity: Number.isFinite(calcTauC) ? interpolateValue(x, velocityRatio, calcTauC) : null,
        meValue: Number.isFinite(calcTauC) ? interpolateValue(x, me, calcTauC) : null,
        label: Number.isFinite(calcTauC)
          ? `$\\text{calc max-thrust: }\\tau_c=\\sqrt{\\tau_\\lambda}/\\tau_r=${calcTauC.toFixed(4)}$`
          : null,
      },
      {
        key: "numeric",
        tau_c: numericTauC,
        velocity: Number.isFinite(numericIndex) ? velocityRatio[numericIndex] : null,
        meValue: Number.isFinite(numericIndex) ? me[numericIndex] : null,
        label: Number.isFinite(numericIndex)
          ? `$\\text{plot max: }(\\tau_c, U_e/U_0)=(${numericTauC.toFixed(4)}, ${velocityRatio[numericIndex].toFixed(4)})$`
          : null,
      },
      {
        key: "fuel_off",
        tau_c: fuelOffTauC,
        velocity: Number.isFinite(fuelOffTauC) ? interpolateValue(x, velocityRatio, fuelOffTauC) : null,
        meValue: Number.isFinite(fuelOffTauC) ? interpolateValue(x, me, fuelOffTauC) : null,
        label: Number.isFinite(fuelOffTauC)
          ? `$\\text{fuel shutoff: }\\tau_c=\\tau_\\lambda/\\tau_r=${fuelOffTauC.toFixed(4)}$`
          : null,
      }
    ];

    markerSpecs.forEach((spec) => {
      if (!Number.isFinite(spec.tau_c) || !Number.isFinite(spec.velocity) || !spec.label) {
        return;
      }
      const vrMarkerColor = markerMap[spec.key]?.color || "#ffffff";
      const vrMarkerSymbol = markerMap[spec.key]?.symbol || "circle";
      traces.push({
        x: [spec.tau_c],
        y: [spec.velocity],
        type: "scatter",
        mode: "markers",
        name: spec.label,
        marker: {
          color: vrMarkerColor,
          symbol: vrMarkerSymbol,
          size: 9,
          line: { color: vrMarkerColor, width: 1 }
        },
      });
      if (Number.isFinite(spec.meValue)) {
        let meLabel = "$M_e$";
        if (spec.key === "calc") {
          meLabel = `$M_e:\\ \\text{calc max-thrust} (${spec.meValue.toFixed(3)})$`;
        } else if (spec.key === "numeric") {
          meLabel = `$M_e:\\ \\text{numeric max} (${spec.meValue.toFixed(3)})$`;
        } else if (spec.key === "fuel_off") {
          meLabel = `$M_e:\\ \\text{fuel shutoff} (${spec.meValue.toFixed(3)})$`;
        }
        const meMarkerColor = meMarkerMap[spec.key]?.color || "#76c893";
        const meMarkerSymbol = meMarkerMap[spec.key]?.symbol || "circle";
        traces.push({
          x: [spec.tau_c],
          y: [spec.meValue],
          type: "scatter",
          mode: "markers",
          name: meLabel,
          yaxis: "y2",
          marker: {
            color: meMarkerColor,
            symbol: meMarkerSymbol,
            size: 7,
            line: { color: meMarkerColor, width: 1 }
          },
          showlegend: false
        });
        meLegendEntries.push({
          name: meLabel,
          marker: meMarkerMap[spec.key]
        });
      }
    });

    traces.push({
      x,
      y: me,
      type: "scatter",
      mode: "lines",
      name: "$M_e$",
      yaxis: "y2",
      line: { color: "#2ca02c", width: 2, dash: "dash" }
    });
    traces.push({
      x,
      y: tbar,
      type: "scatter",
      mode: "lines",
      name: "$\\mathbb{T}/(P_0A_0)$",
      yaxis: "y3",
      line: { color: "#d62728", width: 2, dash: "dot" }
    });
    if (Number.isFinite(m0_val)) {
      traces.push({
        x,
        y: x.map(() => m0_val),
        type: "scatter",
        mode: "lines",
        name: "$M_0$ Flight Mach",
        yaxis: "y4",
        line: { color: "#7f7f7f", width: 1.8, dash: "dot" }
      });
    }

    meLegendEntries.forEach((entry) => {
      const legendMarkerColor = entry.marker?.color || "#76c893";
      const legendMarkerSymbol = entry.marker?.symbol || "circle";
      traces.push({
        x: [null],
        y: [null],
        type: "scatter",
        mode: "markers",
        name: entry.name,
        marker: {
          color: legendMarkerColor,
          symbol: legendMarkerSymbol,
          size: 7,
          line: { color: legendMarkerColor, width: 1 }
        },
        showlegend: true
      });
    });
    return traces;
  }, [data]);

  const summaryLatex = data?.params
    ? String.raw`M_0=${data.params.m0.toFixed(2)},\ \tau_r=${data.params.tau_r.toFixed(3)},\ \tau_\lambda=${data.params.tau_lambda.toFixed(2)},\ \tau_f=${data.params.tau_f.toFixed(1)}`
    : "";

  const axisLayout = useMemo(() => {
    const width = plotWidth > 0 ? plotWidth : 1000;
    const gap = gapPx / width;
    const domainEnd = Math.max(0, 1 - 2 * gap);
    const mePos = domainEnd;
    const tbarPos = domainEnd + gap;
    const m0Pos = domainEnd + 2 * gap;
    const rightMarginPx = Math.max(360, gapPx * 2 + 220);
    const rightEnd = Math.min(1.7, 1 + rightMarginPx / width);
    const rightBoxWidth = Math.min(0.9, 600 / width);
    const rightBoxStart = Math.max(0, rightEnd - rightBoxWidth);
    return {
      domainEnd,
      mePos,
      tbarPos,
      m0Pos,
      rightEnd,
      rightBoxStart
    };
  }, [gapPx, plotWidth]);

  const layoutGuides = [
    {
      type: "line",
      xref: "paper",
      yref: "paper",
      x0: axisLayout.mePos,
      x1: axisLayout.mePos,
      y0: 0.0,
      y1: 1.0,
      line: { color: "#76c893", width: 2, dash: "dot" },
      layer: "above"
    },
    {
      type: "line",
      xref: "paper",
      yref: "paper",
      x0: axisLayout.tbarPos,
      x1: axisLayout.tbarPos,
      y0: 0.0,
      y1: 1.0,
      line: { color: "#ff9f1c", width: 2, dash: "dot" },
      layer: "above"
    },
    {
      type: "line",
      xref: "paper",
      yref: "paper",
      x0: axisLayout.m0Pos,
      x1: axisLayout.m0Pos,
      y0: 0.0,
      y1: 1.0,
      line: { color: "#b0b0b0", width: 2, dash: "dot" },
      layer: "above"
    }
  ];

  return (
    <div className="analysis-plot-block">
      <div className="analysis-plot-controls">
        <AnalysisInputs title="Velocity Ratio Inputs" fields={INPUT_FIELDS} values={inputs} onChange={handleChange} />
        <div className="analysis-plot-actions">
          <button type="button" onClick={handleCompute} disabled={loading}>
            {loading ? "Running..." : "Compute"}
          </button>
          {error ? <span className="error">{error}</span> : null}
        </div>
      </div>
      {summaryLatex ? (
        <p className="plot-caption">
          <LatexText latex={summaryLatex} />
        </p>
      ) : null}
      {data?.error ? <p className="plot-caption">{data.error}</p> : null}
      {data?.warnings?.curve ? <p className="plot-caption">{data.warnings.curve}</p> : null}
      <div className="plot-card plot-card--accent">
        <div className="plot-frame plot-frame--performance" ref={plotContainerRef}>
          <Plot
            data={plotData}
            layout={{
              ...layoutBase,
              shapes: layoutGuides,
              title: {
                text: "$\\text{Velocity Ratio, Exit Mach, Thrust, and }M_0\\text{ vs }\\tau_c$",
                font: { color: "#f3eaff", size: 18 },
                x: axisLayout.domainEnd / 2,
                xanchor: "center",
                xref: "paper"
              },
              xaxis: {
                title: { text: data?.labels?.tau_c || "tau_c", standoff: 12 },
                color: "#f3eaff",
                gridcolor: "rgba(255, 214, 153, 0.35)",
                griddash: "dot",
                showgrid: true,
                domain: [0.0, axisLayout.domainEnd],
                showline: true,
                linecolor: "#ff9f1c",
                linewidth: 2
              },
              yaxis: {
                title: { text: data?.labels?.velocity_ratio || "Ue/U0" },
                color: "#f3eaff",
                gridcolor: "rgba(255, 214, 153, 0.35)",
                griddash: "dot",
                showgrid: true,
                showline: true,
                linecolor: "#ff9f1c",
                linewidth: 2
              },
              yaxis2: {
                title: { text: data?.labels?.me || "Me" },
                overlaying: "y",
                side: "right",
                position: axisLayout.mePos,
                anchor: "free",
                color: "#76c893",
                showgrid: false,
                showline: true,
                linecolor: "#76c893",
                linewidth: 2
              },
              yaxis3: {
                title: { text: data?.labels?.tbar || "Tbar" },
                overlaying: "y",
                side: "right",
                position: axisLayout.tbarPos,
                anchor: "free",
                color: "#ff9f1c",
                showgrid: false,
                showline: true,
                linecolor: "#ff9f1c",
                linewidth: 2
              },
              yaxis4: {
                title: { text: data?.labels?.m0 || "M0" },
                overlaying: "y",
                side: "right",
                position: axisLayout.m0Pos,
                anchor: "free",
                color: "#b0b0b0",
                showgrid: false,
                showline: true,
                linecolor: "#b0b0b0",
                linewidth: 2
              }
            }}
            config={plotConfig}
            style={{ width: "100%", height: "420px" }}
            useResizeHandler
          />
        </div>
      </div>
    </div>
  );
}
