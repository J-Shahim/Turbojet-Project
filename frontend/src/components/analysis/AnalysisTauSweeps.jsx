import { useEffect, useMemo, useRef, useState } from "react";
import { postJson } from "../../api/client";
import IdealAnalysis from "../IdealAnalysis";
import TableView from "../TableView";
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
  { key: "gamma", label: "\\gamma", latex: true, step: 0.01, min: 1.0, max: 1.67, unit: "D.L." },
  { key: "tau_lambda", label: "\\tau_\\lambda", latex: true, step: 0.1, min: 1.1, max: 20.0, unit: "D.L." },
  { key: "tau_f", label: "\\tau_f", latex: true, step: 1.0, min: 1.0, max: 300.0, unit: "D.L." },
  { key: "tau_r_ref", label: "\\tau_r\\ (ref)", latex: true, step: 0.01, min: 1.01, max: 4.0, unit: "D.L." },
  { key: "tau_c_ref", label: "\\tau_c\\ (ref)", latex: true, step: 0.05, min: 1.01, max: 40.0, unit: "D.L." },
  { key: "tau_c_min", label: "\\tau_c\\ min", latex: true, step: 0.01, min: 1.01, max: 10.0, unit: "D.L." },
  { key: "tau_c_max", label: "\\tau_c\\ max", latex: true, step: 0.1, min: 2.0, max: 80.0, unit: "D.L." },
  { key: "tau_r_min", label: "\\tau_r\\ min", latex: true, step: 0.01, min: 1.01, max: 5.0, unit: "D.L." },
  { key: "tau_r_max", label: "\\tau_r\\ max", latex: true, step: 0.05, min: 1.1, max: 6.0, unit: "D.L." },
  { key: "npts", label: "npts", latex: false, step: 50, min: 100, max: 2000, unit: "#" }
];

export default function AnalysisTauSweeps() {
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
      const response = await postJson("/api/analysis/ideal/tau-sweeps", inputs);
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

  const summaryTable = useMemo(() => {
    if (!data?.series) {
      return null;
    }

    const format = (value, digits = 4) => (Number.isFinite(value) ? value.toFixed(digits) : "--");
    const rangeOf = (values) => {
      if (!Array.isArray(values) || values.length === 0) {
        return null;
      }
      const clean = values.filter((val) => Number.isFinite(val));
      if (!clean.length) {
        return null;
      }
      return { min: Math.min(...clean), max: Math.max(...clean) };
    };
    const maxOf = (xs, ys) => {
      if (!Array.isArray(xs) || !Array.isArray(ys) || xs.length !== ys.length) {
        return null;
      }
      let maxVal = -Infinity;
      let maxX = null;
      ys.forEach((val, idx) => {
        if (!Number.isFinite(val)) {
          return;
        }
        if (val > maxVal) {
          maxVal = val;
          maxX = xs[idx];
        }
      });
      if (!Number.isFinite(maxVal) || !Number.isFinite(maxX)) {
        return null;
      }
      return { x: maxX, y: maxVal };
    };
    const rangeLabel = (values, fallbackMin, fallbackMax) => {
      const range = rangeOf(values);
      const min = Number.isFinite(fallbackMin) ? fallbackMin : range?.min;
      const max = Number.isFinite(fallbackMax) ? fallbackMax : range?.max;
      if (!Number.isFinite(min) || !Number.isFinite(max)) {
        return "--";
      }
      return `${format(min, 3)} - ${format(max, 3)}`;
    };
    const peakLabel = (peak) => {
      if (!peak) {
        return "--";
      }
      return `${format(peak.y)} @ ${format(peak.x, 3)}`;
    };

    const tauC = data.series.tau_c;
    const tauR = data.series.tau_r;
    const rows = [];

    if (tauC?.x?.length) {
      rows.push({
        Sweep: "tau_c",
        Range: rangeLabel(tauC.x, data.params?.tau_c_min, data.params?.tau_c_max),
        tbar_max: peakLabel(maxOf(tauC.x, tauC.tbar)),
        isp_max: peakLabel(maxOf(tauC.x, tauC.isp))
      });
    }

    if (tauR?.x?.length) {
      rows.push({
        Sweep: "tau_r",
        Range: rangeLabel(tauR.x, data.params?.tau_r_min, data.params?.tau_r_max),
        tbar_max: peakLabel(maxOf(tauR.x, tauR.tbar)),
        isp_max: peakLabel(maxOf(tauR.x, tauR.isp))
      });
    }

    if (!rows.length) {
      return null;
    }

    return {
      columns: ["Sweep", "Range", "tbar_max", "isp_max"],
      rows
    };
  }, [data]);

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
      {summaryTable ? <TableView title="Tau Sweep Summary" table={summaryTable} /> : null}
    </div>
  );
}
