import LatexText from "./LatexText";

const LATEX_HEADERS = {
  "A": "A",
  "A*": "A^*",
  "A/A*": "A/A^*",
  "P": "P",
  "Pt": "P_t",
  "Pt/Pt0": "P_t/P_{t0}",
  "P/Pt": "P/P_t",
  "T": "T",
  "Tt": "T_t",
  "Tt/Tt0": "T_t/T_{t0}",
  "T/Tt": "T/T_t",
  "M": "M",
  "f(M)": "f(M)",
  "mdot": "\\dot m",
  "tau": "\\tau",
  "pi": "\\pi",
  "ratio": "ratio"
};

function renderHeader(label) {
  const latex = LATEX_HEADERS[label];
  if (!latex) {
    return label;
  }
  return <LatexText latex={latex} />;
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
              {table.columns.map((col) => (
                <th key={col}>{renderHeader(col)}</th>
              ))}
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
