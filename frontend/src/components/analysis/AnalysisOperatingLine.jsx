import { useEffect, useMemo, useRef, useState } from "react";
import Plot from "react-plotly.js";
import { postJson } from "../../api/client";
import TableView from "../TableView";
import AnalysisInputs from "./AnalysisInputs";

const DEFAULT_INPUTS = {
  gamma: 1.4,
  A4s_over_A2: 1.0 / 14.0,
  A4s_over_A8: 1.0 / 4.0,
  pi_c_min: 1.01,
  pi_c_max: 60.0,
  npts: 800,
  fM2_pick: 0.20
};

const INPUT_FIELDS = [
  { key: "gamma", label: "\\gamma", latex: true, step: 0.01, min: 1.05, max: 1.67, unit: "D.L." },
  { key: "A4s_over_A2", label: "A_{4*}/A_2", latex: true, step: 0.001, min: 0.005, max: 0.5, unit: "D.L." },
  { key: "A4s_over_A8", label: "A_{4*}/A_8", latex: true, step: 0.005, min: 0.01, max: 0.99, unit: "D.L." },
  { key: "pi_c_min", label: "\\pi_c\\ min", latex: true, step: 0.01, min: 1.01, max: 10.0, unit: "D.L." },
  { key: "pi_c_max", label: "\\pi_c\\ max", latex: true, step: 0.5, min: 2.0, max: 200.0, unit: "D.L." },
  { key: "fM2_pick", label: "f(M_2)\\ pick", latex: true, step: 0.001, min: 0.01, max: 1.0, unit: "D.L." },
  { key: "npts", label: "npts", latex: false, step: 50, min: 100, max: 4000, unit: "#" }
];

export default function AnalysisOperatingLine() {
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
      const response = await postJson("/api/analysis/ideal/operating-line", inputs);
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
    if (!data?.series?.f_m2?.length) {
      return [];
    }

    const traces = [
      {
        x: data.series.f_m2,
        y: data.series.pi_c,
        type: "scatter",
        mode: "lines",
        name: "f(M2)",
        line: { color: "#5fb3ff", width: 2 }
      }
    ];

    if (data.markers?.min?.f_m2) {
      traces.push({
        x: [data.markers.min.f_m2],
        y: [data.markers.min.pi_c],
        type: "scatter",
        mode: "markers",
        name: "min",
        marker: { color: "#ff6b6b", size: 9 }
      });
    }

    if (data.markers?.pick?.f_m2) {
      traces.push({
        x: [data.markers.pick.f_m2],
        y: [data.markers.pick.pi_c],
        type: "scatter",
        mode: "markers",
        name: "pick",
        marker: { color: "#ffffff", size: 8 }
      });
    }

    return traces;
  }, [data]);

  const markerTable = useMemo(() => {
    if (!data?.markers) {
      return null;
    }
    const format = (value, digits = 4) => (Number.isFinite(value) ? value.toFixed(digits) : "--");
    const rows = [];
    if (data.markers.min && Number.isFinite(data.markers.min.f_m2)) {
      rows.push({
        Point: "min",
        "f(M2)": format(data.markers.min.f_m2, 4),
        pi_c: format(data.markers.min.pi_c, 3)
      });
    }
    if (data.markers.pick && Number.isFinite(data.markers.pick.f_m2)) {
      rows.push({
        Point: "pick",
        "f(M2)": format(data.markers.pick.f_m2, 4),
        pi_c: format(data.markers.pick.pi_c, 3)
      });
    }
    if (!rows.length) {
      return null;
    }
    return {
      columns: ["Point", "f(M2)", "pi_c"],
      rows
    };
  }, [data]);

  return (
    <div className="analysis-plot-block">
      <div className="analysis-plot-controls">
        <AnalysisInputs title="Operating Line Inputs" fields={INPUT_FIELDS} values={inputs} onChange={handleChange} />
        <div className="analysis-plot-actions">
          <button type="button" onClick={handleCompute} disabled={loading}>
            {loading ? "Running..." : "Compute"}
          </button>
          {error ? <span className="error">{error}</span> : null}
        </div>
      </div>
      {data?.error ? <p className="plot-caption">{data.error}</p> : null}
      <div className="plot-card">
        <div className="plot-frame plot-frame--performance">
          <Plot
            data={plotData}
            layout={{
              ...layoutBase,
              title: { text: data?.labels?.title || "Operating Line", font: { color: "#f3eaff", size: 18 } },
              xaxis: { title: { text: data?.labels?.f_m2 || "f(M2)", standoff: 12 }, color: "#f3eaff", gridcolor: "rgba(255, 214, 153, 0.35)", griddash: "dot", showgrid: true },
              yaxis: { title: { text: data?.labels?.pi_c || "pi_c", standoff: 12 }, color: "#f3eaff", gridcolor: "rgba(255, 214, 153, 0.35)", griddash: "dot", showgrid: true }
            }}
            config={plotConfig}
            style={{ width: "100%", height: "420px" }}
            useResizeHandler
          />
        </div>
      </div>
      {markerTable ? <TableView title="Operating Line Points" table={markerTable} /> : null}
    </div>
  );
}
