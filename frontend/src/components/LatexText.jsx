import { InlineMath } from "react-katex";

function normalizeLatex(value) {
  if (typeof value !== "string") {
    return "";
  }
  let out = value.trim();
  if (out.startsWith("$") && out.endsWith("$")) {
    out = out.slice(1, -1);
  }
  if (out.startsWith("\\(") && out.endsWith("\\)")) {
    out = out.slice(2, -2);
  }
  return out;
}

export default function LatexText({ latex, className }) {
  if (!latex) {
    return null;
  }
  const normalized = normalizeLatex(latex);
  return (
    <span className={className}>
      <InlineMath math={normalized} />
    </span>
  );
}
