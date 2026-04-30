import { useMemo, useState } from "react";
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
  "Species": "\\text{Species}_i",
  "Species_j": "\\text{Species}_j",
  "hbar": "\\bar{h}_i",
  "hbar_j": "\\bar{h}_j",
  "hbar_f": "\\bar{h}_f",
  "hbar_s": "\\bar{h}_{s,i}",
  "hbar_s_j": "\\bar{h}_{s,j}",
  "n_i hbar": "n_i \\bar{h}_i",
  "n_j hbar": "n_j \\bar{h}_j",
  "n_i hbar_f": "n_i \\bar{h}_f",
  "n_j hbar_f": "n_j \\bar{h}_f",
  "n_i hbar_s": "n_i \\bar{h}_{s,i}",
  "n_j hbar_s": "n_j \\bar{h}_{s,j}",
  "cpbar": "\\bar{c}_p",
  "n_i cpbar": "n_i \\bar{c}_p",
  "n_j cpbar": "n_j \\bar{c}_p",
  "sbar": "\\bar{s}_i^\\circ(T)",
  "sbar_j": "\\bar{s}_j^\\circ(T)",
  "sbar_ref": "\\bar{s}_i^\\circ(T_{ref})",
  "sbar_ref_j": "\\bar{s}_j^\\circ(T_{ref})",
  "sbar_s": "\\bar{s}_{s,i}",
  "sbar_s_j": "\\bar{s}_{s,j}",
  "sbar_i": "\\bar{s}_i",
  "sbar_j_actual": "\\bar{s}_j",
  "n_i sbar": "n_i \\bar{s}_i^\\circ(T)",
  "n_j sbar": "n_j \\bar{s}_j^\\circ(T)",
  "n_i sbar_ref": "n_i \\bar{s}_i^\\circ(T_{ref})",
  "n_j sbar_ref": "n_j \\bar{s}_j^\\circ(T_{ref})",
  "n_i sbar_s": "n_i \\bar{s}_{s,i}",
  "n_j sbar_s": "n_j \\bar{s}_{s,j}",
  "n_i sbar_i": "n_i \\bar{s}_i",
  "n_j sbar_j": "n_j \\bar{s}_j",
  "gbar": "\\bar{g}_i^\\circ(T)",
  "gbar_j": "\\bar{g}_j^\\circ(T)",
  "g_elements": "\\sum_j \\nu_{ij} \\bar{g}_j^\\circ(T)",
  "g_elements_i": "\\sum_j \\nu_{ij} \\bar{g}_j^\\circ(T)",
  "g_elements_j": "\\sum_j \\nu_{ij} \\bar{g}_j^\\circ(T)",
  "gfo": "\\bar{g}_f^\\circ(T)",
  "gfo_j": "\\bar{g}_f^\\circ(T)",
  "n_i gbar": "n_i \\bar{g}_i^\\circ(T)",
  "n_j gbar": "n_j \\bar{g}_j^\\circ(T)",
  "n_i g_elements": "n_i \\sum_j \\nu_{ij} \\bar{g}_j^\\circ(T)",
  "n_j g_elements": "n_j \\sum_j \\nu_{ij} \\bar{g}_j^\\circ(T)",
  "n_i gfo": "n_i \\bar{g}_f^\\circ(T)",
  "n_j gfo": "n_j \\bar{g}_f^\\circ(T)",
  "X": "X_i",
  "X_j": "X_j",
  "Y": "Y_i",
  "Y_j": "Y_j",
  "P_i": "P_i",
  "P_j": "P_j",
  "mdot": "\\dot m",
  "tau": "\\tau",
  "tau_c": "\\tau_c",
  "tau_r": "\\tau_r",
  "pi": "\\pi",
  "pi_c": "\\pi_c",
  "ratio": "ratio"
};

const HEADER_LABELS = {
  "Mol": "Amount",
  "MW": "Molecular weight",
  "Mass": "Mass",
  "X": "Mole fraction",
  "Y": "Mass fraction",
  "P_i": "Partial pressure",
  "P_j": "Partial pressure",
  "hbar": "Molar enthalpy",
  "hbar_j": "Molar enthalpy",
  "hbar_f": "Formation enthalpy",
  "hbar_s": "Sensible enthalpy",
  "hbar_s_j": "Sensible enthalpy",
  "n_i hbar": "Total enthalpy",
  "n_j hbar": "Total enthalpy",
  "n_i hbar_f": "Total formation enthalpy",
  "n_j hbar_f": "Total formation enthalpy",
  "n_i hbar_s": "Total sensible enthalpy",
  "n_j hbar_s": "Total sensible enthalpy",
  "cpbar": "Molar heat capacity",
  "n_i cpbar": "Heat capacity total",
  "n_j cpbar": "Heat capacity total",
  "sbar": "Std molar entropy",
  "sbar_j": "Std molar entropy",
  "sbar_ref": "Std entropy at",
  "sbar_ref_j": "Std entropy at",
  "sbar_s": "Sensible entropy",
  "sbar_s_j": "Sensible entropy",
  "sbar_i": "Entropy at",
  "sbar_j_actual": "Entropy at",
  "n_i sbar": "Std entropy total",
  "n_j sbar": "Std entropy total",
  "n_i sbar_ref": "Std entropy at T_ref total",
  "n_j sbar_ref": "Std entropy at T_ref total",
  "n_i sbar_s": "Sensible entropy total",
  "n_j sbar_s": "Sensible entropy total",
  "n_i sbar_i": "Entropy total",
  "n_j sbar_j": "Entropy total",
  "gbar": "Std molar Gibbs",
  "gbar_j": "Std molar Gibbs",
  "g_elements": "Element reference term",
  "g_elements_i": "Element reference term",
  "g_elements_j": "Element reference term",
  "gfo": "Std Gibbs of formation",
  "gfo_j": "Std Gibbs of formation",
  "n_i gbar": "Std Gibbs total",
  "n_j gbar": "Std Gibbs total",
  "n_i g_elements": "Element term total",
  "n_j g_elements": "Element term total",
  "n_i gfo": "Formation Gibbs total",
  "n_j gfo": "Formation Gibbs total"
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
  if (typeof label === "string") {
    const speciesMatch = label.match(/^Species_\d+$/);
    if (speciesMatch) {
      return <LatexText latex={String.raw`\text{Species}_i`} />;
    }
    const molMatch = label.match(/^Mol_\d+\s*\(([^)]+)\)$/);
    if (molMatch) {
      return `Mol (${molMatch[1]})`;
    }
  }
  const latex = LATEX_HEADERS[label];
  if (latex) {
    const desc = HEADER_LABELS[label];
    if (desc) {
      return (
        <span className="table-header">
          <span className="table-header-label">{desc}</span>
          <LatexText latex={latex} />
        </span>
      );
    }
    return <LatexText latex={latex} />;
  }

  if (typeof label === "string") {
    const unitMatch = label.match(/^(.+?)\s*\(([^)]+)\)$/);
    if (unitMatch) {
      const base = unitMatch[1].trim();
      const unit = unitMatch[2].trim();
      const baseLatex = LATEX_HEADERS[base];
      const baseLabel = HEADER_LABELS[base] || base;
      if (baseLatex) {
        return (
          <span className="table-header">
            <span className="table-header-label">{baseLabel}</span>
            <LatexText latex={baseLatex} />
            <span className="table-unit">({unit})</span>
          </span>
        );
      }
      if (HEADER_LABELS[base]) {
        return (
          <span className="table-header">
            <span className="table-header-label">{baseLabel}</span>
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

function toNumericValue(value) {
  if (value === null || value === undefined) {
    return Number.NaN;
  }
  if (typeof value === "number") {
    return value;
  }
  const raw = String(value).replace(/,/g, "").trim();
  if (!raw || raw === "--") {
    return Number.NaN;
  }
  const num = Number(raw);
  return Number.isFinite(num) ? num : Number.NaN;
}

export default function TableView({ title, table, enableSort = false }) {
  if (!table) {
    return null;
  }

  const [sortKey, setSortKey] = useState("");
  const [sortDir, setSortDir] = useState("desc");

  const rows = useMemo(() => {
    if (!sortKey) {
      return table.rows;
    }
    const sorted = [...table.rows];
    sorted.sort((a, b) => {
      const aVal = a?.[sortKey];
      const bVal = b?.[sortKey];
      const aNum = toNumericValue(aVal);
      const bNum = toNumericValue(bVal);
      const aIsNum = Number.isFinite(aNum);
      const bIsNum = Number.isFinite(bNum);

      if (aIsNum && bIsNum) {
        return sortDir === "asc" ? aNum - bNum : bNum - aNum;
      }
      if (aIsNum !== bIsNum) {
        return aIsNum ? -1 : 1;
      }
      const aText = String(aVal ?? "");
      const bText = String(bVal ?? "");
      const cmp = aText.localeCompare(bText);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [sortDir, sortKey, table.rows]);

  const sumRow = useMemo(() => {
    if (!Array.isArray(table.rows) || table.rows.length === 0 || !Array.isArray(table.sumColumns)) {
      return null;
    }
    const sums = {};
    let hasAny = false;
    table.sumColumns.forEach((col) => {
      const total = table.rows.reduce((acc, row) => {
        const value = toNumericValue(row?.[col]);
        return Number.isFinite(value) ? acc + value : acc;
      }, 0.0);
      if (Number.isFinite(total)) {
        sums[col] = total;
        hasAny = true;
      }
    });
    if (!hasAny) {
      return null;
    }
    const labelColumn = table.columns[0];
    return {
      ...sums,
      [labelColumn]: "Sum"
    };
  }, [table.columns, table.rows, table.sumColumns]);

  const avgRow = useMemo(() => {
    if (!Array.isArray(table.rows) || table.rows.length === 0 || !Array.isArray(table.avgColumns)) {
      return null;
    }
    const labelColumn = table.columns[0];
    const averages = {};
    let hasAny = false;
    table.avgColumns.forEach((spec) => {
      const col = spec?.col;
      const numeratorCol = spec?.numerator;
      const denominatorCol = spec?.denominator;
      if (!col || !numeratorCol || !denominatorCol) {
        return;
      }
      const numerator = table.rows.reduce((acc, row) => {
        const value = toNumericValue(row?.[numeratorCol]);
        return Number.isFinite(value) ? acc + value : acc;
      }, 0.0);
      const denominator = denominatorCol === "__count__"
        ? table.rows.reduce((acc, row) => {
            const value = toNumericValue(row?.[numeratorCol]);
            return Number.isFinite(value) ? acc + 1 : acc;
          }, 0.0)
        : table.rows.reduce((acc, row) => {
            const value = toNumericValue(row?.[denominatorCol]);
            return Number.isFinite(value) ? acc + value : acc;
          }, 0.0);
      if (Number.isFinite(numerator) && Number.isFinite(denominator) && denominator !== 0) {
        averages[col] = numerator / denominator;
        hasAny = true;
      }
    });
    if (!hasAny) {
      return null;
    }
    return {
      ...averages,
      [labelColumn]: "Avg"
    };
  }, [table.avgColumns, table.columns, table.rows]);

  const formatSum = (value) => {
    if (!Number.isFinite(value)) {
      return "";
    }
    const absVal = Math.abs(value);
    if (absVal >= 1e5 || (absVal > 0 && absVal < 1e-3)) {
      return value.toExponential(3);
    }
    return value.toFixed(3);
  };

  const sectionClass = title === "Stations"
    ? "table-section table-section--stations"
    : title === "Ratios"
      ? "table-section table-section--ratios"
      : "table-section";
  const wrapperClass = title === "Stations"
    ? "table-wrapper table-wrapper--stations"
    : "table-wrapper";

  const isWideTable = table.columns.length >= 8;

  return (
    <section className={sectionClass}>
      <div className="table-title-row">
        <h3>{title}</h3>
        {enableSort ? (
          <div className="table-controls">
            <label className="table-control">
              <span>Sort by</span>
              <select value={sortKey} onChange={(event) => setSortKey(event.target.value)}>
                <option value="">None</option>
                {table.columns.map((col) => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </label>
            <label className="table-control">
              <span>Order</span>
              <select value={sortDir} onChange={(event) => setSortDir(event.target.value)}>
                <option value="desc">High to low</option>
                <option value="asc">Low to high</option>
              </select>
            </label>
          </div>
        ) : null}
      </div>
      <div className={wrapperClass}>
        <table className={isWideTable ? "table-wide" : undefined}>
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
            {rows.map((row, idx) => (
              <tr key={idx}>
                {table.columns.map((col) => (
                  <td key={col}>{renderCell(row[col])}</td>
                ))}
              </tr>
            ))}
          </tbody>
          {sumRow || avgRow ? (
            <tfoot>
              {sumRow ? (
                <tr>
                  {table.columns.map((col) => {
                    if (col === table.columns[0]) {
                      return <td key={col}>{sumRow[col]}</td>;
                    }
                    const value = sumRow[col];
                    return <td key={col}>{formatSum(value)}</td>;
                  })}
                </tr>
              ) : null}
              {avgRow ? (
                <tr>
                  {table.columns.map((col) => {
                    if (col === table.columns[0]) {
                      return <td key={col}>{avgRow[col]}</td>;
                    }
                    const value = avgRow[col];
                    return <td key={col}>{formatSum(value)}</td>;
                  })}
                </tr>
              ) : null}
            </tfoot>
          ) : null}
        </table>
      </div>
    </section>
  );
}
