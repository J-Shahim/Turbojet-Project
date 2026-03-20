import { useEffect, useState } from "react";
import { BlockMath } from "react-katex";
import { postJson } from "../../api/client";

const normalizeLatex = (value) => {
  if (typeof value !== "string") {
    return "";
  }
  let out = value.trim();
  if (out.startsWith("$$") && out.endsWith("$$")) {
    out = out.slice(2, -2);
  } else if (out.startsWith("$") && out.endsWith("$")) {
    out = out.slice(1, -1);
  } else if (out.startsWith("\\(") && out.endsWith("\\)")) {
    out = out.slice(2, -2);
  }
  return out;
};

export default function AnalysisStripModelEquations() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await postJson("/api/analysis/ideal/strip-model-equations", {});
        if (isMounted) {
          setData(response);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Failed to load equations.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const equations = Array.isArray(data?.equations) ? data.equations : [];

  return (
    <div className="analysis-equations">
      {loading ? <div className="plot-caption">Loading equations...</div> : null}
      {error ? <div className="plot-caption">{error}</div> : null}
      {!loading && !error && equations.length === 0 ? (
        <div className="plot-caption">No equations returned.</div>
      ) : null}
      {equations.map((item, index) => (
        <div key={`${item.title || "eq"}-${index}`} className="analysis-equation">
          {item.title ? <div className="analysis-equation-title">{item.title}</div> : null}
          {item.latex ? <BlockMath math={normalizeLatex(item.latex)} /> : null}
        </div>
      ))}
    </div>
  );
}
