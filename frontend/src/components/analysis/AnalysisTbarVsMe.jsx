import { useEffect, useMemo, useRef, useState } from "react";
import Plot from "react-plotly.js";
import { postJson } from "../../api/client";
import LatexText from "../LatexText";
import TableView from "../TableView";
import AnalysisInputs from "./AnalysisInputs";

const DEFAULT_INPUTS = {
  gamma: 1.4,
  M0: 3.0,
  Tte_over_T0: 5.658,
  Pte_over_P0: 85.955,
  A8_over_A0: 0.143,
  npts: 500,
  Me_pick: 2.5
};

const INPUT_FIELDS = [
  { key: "gamma", label: "\\gamma", latex: true, step: 0.01, min: 1.05, max: 1.67, unit: "D.L." },
  { key: "M0", label: "M_0", latex: true, step: 0.05, min: 0.1, max: 8.0, unit: "D.L." },
  { key: "Tte_over_T0", label: "T_{te}/T_0", latex: true, step: 0.01, min: 0.2, max: 12.0, unit: "D.L." },
  { key: "Pte_over_P0", label: "P_{te}/P_0", latex: true, step: 0.05, min: 0.2, max: 120.0, unit: "D.L." },
  { key: "A8_over_A0", label: "A_8/A_0", latex: true, step: 0.001, min: 0.001, max: 1.0, unit: "D.L." },
  { key: "Me_pick", label: "M_e\\ (pick)", latex: true, step: 0.01, min: 1.0, max: 12.0, unit: "D.L." },
  { key: "npts", label: "npts", latex: false, step: 50, min: 100, max: 3000, unit: "#" }
];

export default function AnalysisTbarVsMe() {
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const autoComputeRef = useRef(false);

  const handleChange = (key, value) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const handleCompute = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await postJson("/api/analysis/ideal/tbar-vs-me", inputs);
      setData(response);
    } catch (err) {
      setError(err.message || "Failed to compute.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoComputeRef.current) {
      return;
    }
    autoComputeRef.current = true;
    handleCompute();
  }, []);

  const plotConfig = useMemo(() => ({ responsive: true, mathjax: "cdn" }), []);
  const layoutBase = useMemo(() => ({
    autosize: true,
    margin: { t: 80, r: 40, l: 80, b: 70 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(255,255,255,0.08)",
    font: { color: "#f3eaff", size: 13 }
  }), []);

  const plotData = useMemo(() => {
    if (!data?.series?.me?.length) {
      return [];
    }
    const traces = [
      {
        x: data.series.me,
        y: data.series.tbar,
        type: "scatter",
        mode: "lines",
        name: "Tbar",
        line: { color: "#76c893", width: 2 }
      }
    ];

    if (Number.isFinite(data?.selected?.me)) {
      traces.push({
        x: [data.selected.me],
        y: [data.selected.tbar],
        type: "scatter",
        mode: "markers",
        name: "Selected",
        marker: { color: "#5fb3ff", size: 10, symbol: "circle" }
      });
    }
    return traces;
  }, [data]);

  const summaryLatex = data?.params
    ? String.raw`\gamma=${data.params.gamma.toFixed(2)},\ M_0=${data.params.m0.toFixed(2)},\ T_{te}/T_0=${data.params.tte_over_t0.toFixed(3)},\ P_{te}/P_0=${data.params.pte_over_p0.toFixed(3)},\ A_8/A_0=${data.params.a8_over_a0.toFixed(4)}`
    : "";

  const selectedTable = useMemo(() => {
    if (!data?.selected || !Number.isFinite(data.selected.me)) {
      return null;
    }
    const format = (value, digits = 4) => (Number.isFinite(value) ? value.toFixed(digits) : "--");
    return {
      columns: ["Me", "Tbar", "Pe/P0", "Ae/A8", "Ae/A0"],
      rows: [
        {
          Me: format(data.selected.me, 4),
          Tbar: format(data.selected.tbar, 4),
          "Pe/P0": format(data.selected.pe_over_p0, 4),
          "Ae/A8": format(data.selected.ae_over_a8, 4),
          "Ae/A0": format(data.selected.ae_over_a0, 4)
        }
      ]
    };
  }, [data]);

  return (
    <div className="analysis-plot-block">
      <div className="analysis-plot-controls">
        <AnalysisInputs title="Tbar vs Me Inputs" fields={INPUT_FIELDS} values={inputs} onChange={handleChange} />
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
      <div className="plot-card">
        <div className="plot-frame plot-frame--performance">
          <Plot
            data={plotData}
            layout={{
              ...layoutBase,
              title: { text: data?.labels?.title || "Tbar vs Me", font: { color: "#f3eaff", size: 18 } },
              xaxis: {
                title: { text: data?.labels?.me || "Me", standoff: 14 },
                color: "#f3eaff",
                gridcolor: "rgba(255, 214, 153, 0.35)",
                griddash: "dot",
                showgrid: true
              },
              yaxis: {
                title: { text: data?.labels?.tbar || "Tbar", standoff: 14 },
                color: "#f3eaff",
                gridcolor: "rgba(255, 214, 153, 0.35)",
                griddash: "dot",
                showgrid: true
              }
            }}
            config={plotConfig}
            style={{ width: "100%", height: "420px" }}
            useResizeHandler
          />
        </div>
      </div>
      {selectedTable ? <TableView title="Selected Point" table={selectedTable} /> : null}
    </div>
  );
}
