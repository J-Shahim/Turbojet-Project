import LatexText from "./LatexText";

const LATEX_HEADERS = {
  "A": "A",
  "A*": "A^*",
  "A/A*": "A/A^*",
  "Ae/A0": "A_e/A_0",
  "Ae/A8": "A_e/A_8",
  "P": "P",
  "Pt": "P_t",
  "Pt/Pt0": "P_t/P_{t0}",
  "Pe/P0": "P_e/P_0",
  "P/Pt": "P/P_t",
  "T": "T",
  "Tt": "T_t",
  "Tt/Tt0": "T_t/T_{t0}",
  "T/Tt": "T/T_t",
  "Tbar": "\\mathbb{T}/(P_0A_0)",
  "tbar_max": "\\mathbb{T}_{max}",
  "M": "M",
  "Me": "M_e",
  "U": "U",
  "Ue/U0": "U_e/U_0",
  "isp_max": "(I_{sp}g/a_0)_{max}",
  "f(M)": "f(M)",
  "f(M2)": "f(M_2)",
  "mdot": "\\dot m",
  "tau": "\\tau",
  "tau_c": "\\tau_c",
  "tau_r": "\\tau_r",
  "pi": "\\pi",
  "pi_c": "\\pi_c",
  "ratio": "ratio"
};

const STATION_UNITS = {
  "A": "m^2",
  "A*": "m^2",
  "A/A*": "D.L.",
  "P": "kPa",
  "Pt": "kPa",
  "Pt/Pt0": "D.L.",
  "P/Pt": "D.L.",
  "T": "K",
  "Tt": "K",
  "Tt/Tt0": "D.L.",
  "T/Tt": "D.L.",
  "M": "D.L.",
  "U": "m/s",
  "f(M)": "D.L.",
  "mdot": "kg/s"
};

function renderHeader(label) {
  const latex = LATEX_HEADERS[label];
  if (latex) {
    return <LatexText latex={latex} />;
  }

  if (typeof label === "string") {
    const unitMatch = label.match(/^(.+?)\s*\(([^)]+)\)$/);
    if (unitMatch) {
      const base = unitMatch[1].trim();
      const unit = unitMatch[2].trim();
      const baseLatex = LATEX_HEADERS[base];
      if (baseLatex) {
        return (
          <span className="table-header">
            <LatexText latex={baseLatex} />
            <span className="table-unit">({unit})</span>
          </span>
        );
      }
    }
  }

  return label;
}

function renderMixedLatex(value) {
  const parts = [];
  const regex = /\\\((.+?)\\\)/g;
  let lastIndex = 0;
  let match;
  let index = 0;

  while ((match = regex.exec(value)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={`text-${index}`}>{value.slice(lastIndex, match.index)}</span>);
      index += 1;
    }
    parts.push(<LatexText key={`math-${index}`} latex={match[1]} />);
    index += 1;
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < value.length) {
    parts.push(<span key={`text-${index}`}>{value.slice(lastIndex)}</span>);
  }

  return <span className="latex-mixed">{parts}</span>;
}

function renderCell(value) {
  if (typeof value === "string") {
    if (value.includes("\\(")) {
      return renderMixedLatex(value);
    }
    const dollarMatch = value.match(/^\$(.*)\$$/);
    if (dollarMatch) {
      return <LatexText latex={dollarMatch[1]} />;
    }
  }
  return String(value ?? "");
}

export default function TableView({ title, table }) {
  if (!table) {
    return null;
  }

  const sectionClass = title === "Stations"
    ? "table-section table-section--stations"
    : title === "Ratios"
      ? "table-section table-section--ratios"
      : "table-section";
  const wrapperClass = title === "Stations"
    ? "table-wrapper table-wrapper--stations"
    : "table-wrapper";

  return (
    <section className={sectionClass}>
      <h3>{title}</h3>
      <div className={wrapperClass}>
        <table>
          <thead>
            <tr>
              {table.columns.map((col) => {
                const unit = title === "Stations" ? STATION_UNITS[col] : null;
                const label = unit ? `${col} (${unit})` : col;
                return <th key={col}>{renderHeader(label)}</th>;
              })}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, idx) => (
              <tr key={idx}>
                {table.columns.map((col) => (
                  <td key={col}>{renderCell(row[col])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
