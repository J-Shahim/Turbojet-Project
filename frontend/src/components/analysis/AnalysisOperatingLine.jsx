import { useEffect, useMemo, useState } from "react";
import Plot from "react-plotly.js";
import { postJson } from "../../api/client";
import LatexText from "../LatexText";
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
  { key: "gamma", label: "\\gamma", latex: true, step: 0.01, min: 1.05, max: 1.67 },
  { key: "A4s_over_A2", label: "A_{4*}/A_2", latex: true, step: 0.001, min: 0.005, max: 0.5 },
  { key: "A4s_over_A8", label: "A_{4*}/A_8", latex: true, step: 0.005, min: 0.01, max: 0.99 },
  { key: "pi_c_min", label: "\\pi_c\\ min", latex: true, step: 0.01, min: 1.01, max: 10.0 },
  { key: "pi_c_max", label: "\\pi_c\\ max", latex: true, step: 0.5, min: 2.0, max: 200.0 },
  { key: "fM2_pick", label: "f(M_2)\\ pick", latex: true, step: 0.001, min: 0.01, max: 1.0 },
  { key: "npts", label: "npts", latex: false, step: 50, min: 100, max: 4000 }
];

export default function AnalysisOperatingLine() {
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      {data?.markers ? (
        <div className="analysis-output-panel">
          <h5>Key Points</h5>
          <div className="analysis-output-grid">
            {data.markers.min ? (
              <div>
                <LatexText latex={`f(M_2)_{min}=${data.markers.min.f_m2.toFixed(4)},\\ \pi_c=${data.markers.min.pi_c.toFixed(3)}`} />
              </div>
            ) : null}
            {data.markers.pick ? (
              <div>
                <LatexText latex={`f(M_2)_{pick}=${data.markers.pick.f_m2.toFixed(4)},\\ \pi_c=${data.markers.pick.pi_c.toFixed(3)}`} />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
