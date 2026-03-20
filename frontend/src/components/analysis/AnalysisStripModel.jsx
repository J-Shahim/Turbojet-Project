import { useEffect, useState } from "react";
import { postJson } from "../../api/client";
import StripModel from "../StripModel";
import AnalysisInputs from "./AnalysisInputs";

const DEFAULT_INPUTS = {
  gamma: 1.4,
  n_stages: 8.0,
  alpha2a_deg: 10.0,
  beta2b_deg: 60.0,
  tau_r: 1.0,
  t0: 288.15,
  f_m2_min: 0.15,
  f_m2_max: 0.95,
  n_f_m2: 220,
  mb_corr_min: 0.50,
  mb_corr_max: 1.20,
  n_speed_lines: 8,
  mb_user: 0.85,
  a2_over_a4s: 14.0,
  a4s_over_a8: 0.25,
  tau_min: 3.0,
  tau_max: 9.0,
  n_tau_lines: 6,
  tau_user: 6.0,
  fuel_to_air: 0.02,
  pi_b: 0.95,
  pi_c_operating_min: 1.01,
  pi_c_operating_max: 40.0,
  n_pi_operating: 300
};

const INPUT_FIELDS = [
  { key: "gamma", label: "\\gamma", latex: true, step: 0.01, min: 1.2, max: 1.67 },
  { key: "n_stages", label: "n_{stages}", latex: true, step: 0.5, min: 2.0, max: 20.0 },
  { key: "alpha2a_deg", label: "\\alpha_{2a}\\ (deg)", latex: true, step: 0.5, min: -5.0, max: 30.0 },
  { key: "beta2b_deg", label: "\\beta_{2b}\\ (deg)", latex: true, step: 0.5, min: 20.0, max: 80.0 },
  { key: "tau_r", label: "\\tau_r", latex: true, step: 0.01, min: 0.6, max: 2.0 },
  { key: "t0", label: "T_0", latex: true, step: 1.0, min: 200.0, max: 350.0 },
  { key: "mb_corr_min", label: "M_{b0}/\\sqrt{\\tau_r}\\ (min)", latex: true, step: 0.01, min: 0.2, max: 1.5 },
  { key: "mb_corr_max", label: "M_{b0}/\\sqrt{\\tau_r}\\ (max)", latex: true, step: 0.01, min: 0.3, max: 2.0 },
  { key: "n_speed_lines", label: "n\\ (speed lines)", latex: false, step: 1, min: 3, max: 14 },
  { key: "mb_user", label: "M_{b0}/\\sqrt{\\tau_r}\\ (user)", latex: true, step: 0.01, min: 0.2, max: 2.0 },
  { key: "a2_over_a4s", label: "A_2/A_{4*}", latex: true, step: 0.5, min: 2.0, max: 30.0 },
  { key: "a4s_over_a8", label: "A_{4*}/A_8", latex: true, step: 0.005, min: 0.01, max: 0.99 },
  { key: "f_m2_min", label: "f(M_2)\\ (min)", latex: true, step: 0.01, min: 0.05, max: 0.9 },
  { key: "f_m2_max", label: "f(M_2)\\ (max)", latex: true, step: 0.01, min: 0.2, max: 1.2 },
  { key: "n_f_m2", label: "n\\ f(M_2)", latex: false, step: 10, min: 50, max: 600 },
  { key: "pi_c_operating_min", label: "\\pi_c\\ (min)", latex: true, step: 0.01, min: 1.01, max: 5.0 },
  { key: "pi_c_operating_max", label: "\\pi_c\\ (max)", latex: true, step: 0.5, min: 2.0, max: 120.0 },
  { key: "n_pi_operating", label: "n\\ \\pi_c", latex: false, step: 10, min: 50, max: 600 },
  { key: "tau_min", label: "\\tau_{\\lambda}/\\tau_r\\ (min)", latex: true, step: 0.1, min: 1.2, max: 12.0 },
  { key: "tau_max", label: "\\tau_{\\lambda}/\\tau_r\\ (max)", latex: true, step: 0.1, min: 1.3, max: 16.0 },
  { key: "n_tau_lines", label: "n\\ \\tau", latex: false, step: 1, min: 2, max: 14 },
  { key: "tau_user", label: "\\tau_{\\lambda}/\\tau_r\\ (user)", latex: true, step: 0.05, min: 1.2, max: 16.0 },
  { key: "fuel_to_air", label: "f", latex: true, step: 0.001, min: 0.0, max: 0.08 },
  { key: "pi_b", label: "\\pi_b", latex: true, step: 0.005, min: 0.8, max: 1.0 }
];

export default function AnalysisStripModel() {
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
      const response = await postJson("/api/analysis/ideal/strip-model", inputs);
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
        <AnalysisInputs title="Strip-Model Inputs" fields={INPUT_FIELDS} values={inputs} onChange={handleChange} />
        <div className="analysis-plot-actions">
          <button type="button" onClick={handleCompute} disabled={loading}>
            {loading ? "Running..." : "Compute"}
          </button>
          {error ? <span className="error">{error}</span> : null}
        </div>
      </div>
      <StripModel
        data={data}
        inputs={inputs}
        revision={0}
        onChange={handleChange}
        onReset={null}
        showMk1={false}
      />
    </div>
  );
}
