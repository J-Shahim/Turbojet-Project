import { useEffect, useState } from "react";
import { postJson } from "../../api/client";
import IdealAnalysis from "../IdealAnalysis";
import AnalysisInputs from "./AnalysisInputs";

const DEFAULT_INPUTS = {
  gamma: 1.4,
  tau_lambda: 8.4,
  tau_f: 170.0,
  tau_r_ref: 1.45,
  tau_c_ref: 2.5,
  tau_c_min: 1.05,
  tau_c_max: 40.0,
  tau_r_min: 1.05,
  tau_r_max: 3.0,
  npts: 400
};

const INPUT_FIELDS = [
  { key: "gamma", label: "\\gamma", latex: true, step: 0.01, min: 1.0, max: 1.67 },
  { key: "tau_lambda", label: "\\tau_\\lambda", latex: true, step: 0.1, min: 1.1, max: 20.0 },
  { key: "tau_f", label: "\\tau_f", latex: true, step: 1.0, min: 1.0, max: 300.0 },
  { key: "tau_r_ref", label: "\\tau_r\\ (ref)", latex: true, step: 0.01, min: 1.01, max: 4.0 },
  { key: "tau_c_ref", label: "\\tau_c\\ (ref)", latex: true, step: 0.05, min: 1.01, max: 40.0 },
  { key: "tau_c_min", label: "\\tau_c\\ min", latex: true, step: 0.01, min: 1.01, max: 10.0 },
  { key: "tau_c_max", label: "\\tau_c\\ max", latex: true, step: 0.1, min: 2.0, max: 80.0 },
  { key: "tau_r_min", label: "\\tau_r\\ min", latex: true, step: 0.01, min: 1.01, max: 5.0 },
  { key: "tau_r_max", label: "\\tau_r\\ max", latex: true, step: 0.05, min: 1.1, max: 6.0 },
  { key: "npts", label: "npts", latex: false, step: 50, min: 100, max: 2000 }
];

export default function AnalysisTauSweeps() {
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
      const response = await postJson("/api/analysis/ideal/tau-sweeps", inputs);
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

  return (
    <div className="analysis-plot-block">
      <div className="analysis-plot-controls">
        <AnalysisInputs title="Tau Sweep Inputs" fields={INPUT_FIELDS} values={inputs} onChange={handleChange} />
        <div className="analysis-plot-actions">
          <button type="button" onClick={handleCompute} disabled={loading}>
            {loading ? "Running..." : "Compute"}
          </button>
          {error ? <span className="error">{error}</span> : null}
        </div>
      </div>
      <IdealAnalysis data={data} />
    </div>
  );
}
