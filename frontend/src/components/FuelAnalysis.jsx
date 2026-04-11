import { useEffect, useMemo, useRef, useState } from "react";
import { getJson, postJson } from "../api/client";
import NotebookMarkdown from "./analysis/NotebookMarkdown";
import TableView from "./TableView";
import Tabs from "./Tabs";
import LatexText from "./LatexText";
import FuelXiMap from "./FuelXiMap";
import derivationNotes from "../analysis/fuelAnalysisDerivation.md?raw";
import mechanismNotes from "../analysis/fuelAnalysisMechanisms.md?raw";
import purposeNotes from "../analysis/fuelPurposeNotes.md?raw";

const DEFAULT_INPUTS = {
  fuel_id: "CH4",
  f_over_a: 0.02,
  mode: "ideal",
  t_k: 2000.0,
  t_react_k: 298.15,
  p_pa: 101325.0,
  air_model: "dry_air",
  fuel_phase: "vapor",
  hv_basis: "lhv",
  hv_ref_t_k: 298.15
};

const MODE_OPTIONS = [
  { value: "ideal", label: "Ideal" },
  { value: "dissociation", label: "Dissociation (Cantera)" }
];
const AIR_MODEL_OPTIONS = [
  { value: "dry_air", label: "Dry air (O2 + 3.76 N2)" },
  { value: "oxygen", label: "O2 only" }
];
const FUEL_PHASE_OPTIONS = [
  { value: "vapor", label: "Vapor" },
  { value: "liquid", label: "Liquid" }
];
const HV_BASIS_OPTIONS = [
  { value: "lhv", label: "LHV" },
  { value: "hhv", label: "HHV" }
];

const SUBSCRIPT_MAP = {
  0: "₀",
  1: "₁",
  2: "₂",
  3: "₃",
  4: "₄",
  5: "₅",
  6: "₆",
  7: "₇",
  8: "₈",
  9: "₉"
};

function fuelCategory(fuel) {
  if (!fuel) {
    return "Other";
  }
  const formula = String(fuel.formula || "");
  const name = String(fuel.name || "");
  if (formula === "C12H26" && name.toLowerCase().includes("dodecane")) {
    return "RP-1 / Jet-A surrogate";
  }
  const cMatch = formula.match(/^C(\d+)/i);
  const hMatch = formula.match(/H(\d+)/i);
  const cCount = cMatch ? Number(cMatch[1]) : null;
  const hCount = hMatch ? Number(hMatch[1]) : null;
  const isParaffin = cCount && hCount === 2 * cCount + 2;
  const isOlefin = cCount && hCount === 2 * cCount;
  if (formula === "C6H6") {
    return "Aromatics";
  }
  if (cCount && cCount <= 3) {
    return "Light gases";
  }
  if (cCount && cCount >= 8) {
    if (isParaffin) {
      return "Kerosene's — Paraffins";
    }
    if (isOlefin) {
      return "Kerosene's — Olefins";
    }
    return "Kerosene's";
  }
  if (isParaffin) {
    return "General transportation — Paraffins";
  }
  if (isOlefin) {
    return "General transportation — Olefins";
  }
  return "General transportation";
}

function formatFormula(formula) {
  if (!formula) {
    return "";
  }
  return String(formula)
    .split("")
    .map((char) => (SUBSCRIPT_MAP[char] ?? char))
    .join("");
}

function toNumberOrEmpty(value) {
  if (value === "") {
    return "";
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : value;
}

function dictToTable(title, data) {
  if (!data || typeof data !== "object") {
    return null;
  }
  const rows = Object.entries(data).map(([key, value]) => ({
    Species: key,
    Amount: Number.isFinite(value) ? value.toFixed(6) : String(value)
  }));
  if (!rows.length) {
    return null;
  }
  return { title, table: { columns: ["Species", "Amount"], rows } };
}

function toLatexSpecies(species) {
  if (!species) {
    return "";
  }
  if (species === "C_s") {
    return "Soot (C)";
  }
  const out = String(species)
    .toUpperCase()
    .replace(/_(\w+)/g, "_{$1}")
    .replace(/([A-Za-z])([0-9]+)/g, "$1_{$2}");
  return `$${out}$`;
}

function productsToTable(listData, dictData, options = {}) {
  const { minMol = 0, title = "Products" } = options;
  if (Array.isArray(listData) && listData.length) {
    const rows = listData
      .map((item) => {
        const mol = Number.isFinite(item?.mol) ? item.mol : Number(item?.mol);
        const mw = Number.isFinite(item?.mw) ? item.mw : Number(item?.mw);
        const mass = Number.isFinite(mol) && Number.isFinite(mw) ? mol * mw : null;
        const h = Number.isFinite(item?.hbar_kJ_per_kmol)
          ? item.hbar_kJ_per_kmol
          : Number(item?.hbar_kJ_per_kmol);
        const cpbar = Number.isFinite(item?.cpbar_kJ_per_kmol_k)
          ? item.cpbar_kJ_per_kmol_k
          : Number(item?.cpbar_kJ_per_kmol_k);
        const sbar = Number.isFinite(item?.sbar_kJ_per_kmol_k)
          ? item.sbar_kJ_per_kmol_k
          : Number(item?.sbar_kJ_per_kmol_k);
        const gfo = Number.isFinite(item?.gfo_kJ_per_kmol)
          ? item.gfo_kJ_per_kmol
          : Number(item?.gfo_kJ_per_kmol);
        const molFrac = Number.isFinite(item?.mol_frac) ? item.mol_frac : Number(item?.mol_frac);
        const massFrac = Number.isFinite(item?.mass_frac) ? item.mass_frac : Number(item?.mass_frac);
        const pPa = Number.isFinite(options?.p_pa) ? options.p_pa : Number(options?.p_pa);
        const pKPa = Number.isFinite(molFrac) && Number.isFinite(pPa) ? (molFrac * pPa) / 1000.0 : null;
        const species = item?.species ?? "";
        return {
          species,
          Species: toLatexSpecies(species),
          "Mol (kmol)": Number.isFinite(mol) ? mol.toFixed(6) : "--",
          "MW (kg/kmol)": Number.isFinite(mw) ? mw.toFixed(5) : "--",
          "Mass (kg)": Number.isFinite(mass) ? mass.toFixed(6) : "--",
          "hbar (kJ/kmol)": Number.isFinite(h) ? h.toFixed(2) : "--",
          "cpbar (kJ/kmol-K)": Number.isFinite(cpbar) ? cpbar.toFixed(2) : "--",
          "sbar (kJ/kmol-K)": Number.isFinite(sbar) ? sbar.toFixed(2) : "--",
          "gfo (kJ/kmol)": Number.isFinite(gfo) ? gfo.toFixed(2) : "--",
          "X": Number.isFinite(molFrac) ? molFrac.toFixed(6) : "--",
          "Y": Number.isFinite(massFrac) ? massFrac.toFixed(6) : "--"
          ,"P_i (kPa)": Number.isFinite(pKPa) ? pKPa.toFixed(3) : "--"
        };
      })
      .filter((row) => {
        const mol = Number(row["Mol (kmol)"]);
        return Number.isFinite(mol) ? mol >= minMol : false;
      })
      .sort((a, b) => Number(b.Mol) - Number(a.Mol));
    return {
      title,
      table: {
        columns: [
          "Species",
          "Mol (kmol)",
          "MW (kg/kmol)",
          "Mass (kg)",
          "hbar (kJ/kmol)",
          "cpbar (kJ/kmol-K)",
          "sbar (kJ/kmol-K)",
          "gfo (kJ/kmol)",
          "X",
          "Y",
          "P_i (kPa)"
        ],
        rows
      }
    };
  }

  if (!dictData || typeof dictData !== "object") {
    return null;
  }
  const rows = Object.entries(dictData).map(([key, value]) => {
    const mol = Number.isFinite(value) ? value : Number(value);
    return {
      Species: toLatexSpecies(key),
      "Mol (kmol)": Number.isFinite(mol) ? mol.toFixed(6) : String(value),
      "MW (kg/kmol)": "--",
      "Mass (kg)": "--"
    };
  });
  if (!rows.length) {
    return null;
  }
  return {
    title,
    table: {
      columns: ["Species", "Mol (kmol)", "MW (kg/kmol)", "Mass (kg)"],
      rows
    }
  };
}

function reactantsToTable(data, p_pa) {
  if (!Array.isArray(data) || !data.length) {
    return null;
  }
  const rows = data.map((item) => {
    const mol = Number.isFinite(item?.mol) ? item.mol : Number(item?.mol);
    const mw = Number.isFinite(item?.mw) ? item.mw : Number(item?.mw);
    const mass = Number.isFinite(mol) && Number.isFinite(mw) ? mol * mw : null;
    const h = Number.isFinite(item?.hbar_kJ_per_kmol)
      ? item.hbar_kJ_per_kmol
      : Number(item?.hbar_kJ_per_kmol);
    const cpbar = Number.isFinite(item?.cpbar_kJ_per_kmol_k)
      ? item.cpbar_kJ_per_kmol_k
      : Number(item?.cpbar_kJ_per_kmol_k);
    const sbar = Number.isFinite(item?.sbar_kJ_per_kmol_k)
      ? item.sbar_kJ_per_kmol_k
      : Number(item?.sbar_kJ_per_kmol_k);
    const gfo = Number.isFinite(item?.gfo_kJ_per_kmol)
      ? item.gfo_kJ_per_kmol
      : Number(item?.gfo_kJ_per_kmol);
    const molFrac = Number.isFinite(item?.mol_frac) ? item.mol_frac : Number(item?.mol_frac);
    const massFrac = Number.isFinite(item?.mass_frac) ? item.mass_frac : Number(item?.mass_frac);
    const pPa = Number.isFinite(p_pa) ? p_pa : Number(p_pa);
    const pKPa = Number.isFinite(molFrac) && Number.isFinite(pPa) ? (molFrac * pPa) / 1000.0 : null;
    return {
      Species: toLatexSpecies(item?.species ?? ""),
      "Mol (kmol)": Number.isFinite(mol) ? mol.toFixed(6) : "--",
      "MW (kg/kmol)": Number.isFinite(mw) ? mw.toFixed(5) : "--",
      "Mass (kg)": Number.isFinite(mass) ? mass.toFixed(6) : "--",
      "hbar (kJ/kmol)": Number.isFinite(h) ? h.toFixed(2) : "--",
      "cpbar (kJ/kmol-K)": Number.isFinite(cpbar) ? cpbar.toFixed(2) : "--",
      "sbar (kJ/kmol-K)": Number.isFinite(sbar) ? sbar.toFixed(2) : "--",
      "gfo (kJ/kmol)": Number.isFinite(gfo) ? gfo.toFixed(2) : "--",
      "X": Number.isFinite(molFrac) ? molFrac.toFixed(6) : "--",
      "Y": Number.isFinite(massFrac) ? massFrac.toFixed(6) : "--",
      "P_i (kPa)": Number.isFinite(pKPa) ? pKPa.toFixed(3) : "--"
    };
  });
  return {
    title: "Reactants",
    table: {
      columns: [
        "Species",
        "Mol (kmol)",
        "MW (kg/kmol)",
        "Mass (kg)",
        "hbar (kJ/kmol)",
        "cpbar (kJ/kmol-K)",
        "sbar (kJ/kmol-K)",
        "gfo (kJ/kmol)",
        "X",
        "Y",
        "P_i (kPa)"
      ],
      rows
    }
  };
}

function elementBalanceToTable(balance) {
  if (!balance) {
    return null;
  }
  const reactants = balance.reactants || {};
  const ideal = balance.ideal || {};
  const dissociation = balance.dissociation || {};
  const dissociationFiltered = balance.dissociation_filtered || dissociation;
  const elements = ["C", "H", "O", "N"];
  const rows = elements.map((el) => {
    const r = Number(reactants[el] ?? 0);
    const i = Number(ideal[el] ?? 0);
    const d = Number(dissociation[el] ?? 0);
    const df = Number(dissociationFiltered[el] ?? 0);
    return {
      Element: el,
      Reactants: r.toFixed(6),
      Ideal: i.toFixed(6),
      Dissociation: d.toFixed(6),
      Dissociation_Filtered: df.toFixed(6),
      Ideal_Delta: (i - r).toExponential(2),
      Dissociation_Delta: (d - r).toExponential(2),
      Dissociation_Filtered_Delta: (df - r).toExponential(2)
    };
  });
  return {
    title: "Element Balance",
    table: {
      columns: [
        "Element",
        "Reactants",
        "Ideal",
        "Dissociation",
        "Dissociation_Filtered",
        "Ideal_Delta",
        "Dissociation_Delta",
        "Dissociation_Filtered_Delta"
      ],
      rows
    }
  };
}

function massBalanceToTable(balance) {
  if (!balance) {
    return null;
  }
  const reactants = Number(balance.reactants ?? 0);
  const ideal = Number(balance.ideal ?? 0);
  const dissociation = Number(balance.dissociation ?? 0);
  const dissociationFiltered = Number(balance.dissociation_filtered ?? dissociation);
  return {
    title: "Mass Balance",
    table: {
      columns: ["Basis", "Total Mass", "Delta"],
      rows: [
        {
          Basis: "Reactants",
          "Total Mass": reactants.toFixed(6),
          Delta: "--"
        },
        {
          Basis: "Ideal Products",
          "Total Mass": ideal.toFixed(6),
          Delta: (ideal - reactants).toExponential(2)
        },
        {
          Basis: "Dissociation Products",
          "Total Mass": dissociation.toFixed(6),
          Delta: (dissociation - reactants).toExponential(2)
        },
        {
          Basis: "Dissociation Products (Filtered)",
          "Total Mass": dissociationFiltered.toFixed(6),
          Delta: (dissociationFiltered - reactants).toExponential(2)
        }
      ]
    }
  };
}

function moleBalanceToTable(balance) {
  if (!balance) {
    return null;
  }
  const reactants = Number(balance.reactants ?? 0);
  const ideal = Number(balance.ideal ?? 0);
  const dissociation = Number(balance.dissociation ?? 0);
  const dissociationFiltered = Number(balance.dissociation_filtered ?? dissociation);
  return {
    title: "Mole Balance",
    table: {
      columns: ["Basis", "Total Moles", "Delta"],
      rows: [
        {
          Basis: "Reactants",
          "Total Moles": reactants.toFixed(6),
          Delta: "--"
        },
        {
          Basis: "Ideal Products",
          "Total Moles": ideal.toFixed(6),
          Delta: (ideal - reactants).toExponential(2)
        },
        {
          Basis: "Dissociation Products",
          "Total Moles": dissociation.toFixed(6),
          Delta: (dissociation - reactants).toExponential(2)
        },
        {
          Basis: "Dissociation Products (Filtered)",
          "Total Moles": dissociationFiltered.toFixed(6),
          Delta: (dissociationFiltered - reactants).toExponential(2)
        }
      ]
    }
  };
}

function partialPressureBalanceToTable({ reactants, ideal, products, p_pa, mode }) {
  const pressurePa = Number.isFinite(p_pa) ? p_pa : Number(p_pa);
  if (!Number.isFinite(pressurePa)) {
    return null;
  }

  const sumX = (list) => {
    if (!Array.isArray(list) || !list.length) {
      return null;
    }
    const total = list.reduce((acc, item) => {
      const x = Number.isFinite(item?.mol_frac) ? item.mol_frac : Number(item?.mol_frac);
      return Number.isFinite(x) ? acc + x : acc;
    }, 0.0);
    return Number.isFinite(total) ? total : null;
  };

  const targetKPa = pressurePa / 1000.0;
  const rows = [];

  const reactantX = sumX(reactants);
  if (reactantX !== null) {
    const sumP = reactantX * targetKPa;
    rows.push({
      Basis: "Reactants",
      "Sum P_i (kPa)": sumP.toFixed(3),
      "Target P (kPa)": targetKPa.toFixed(3),
      Delta: (sumP - targetKPa).toExponential(2)
    });
  }

  const idealX = sumX(ideal);
  if (idealX !== null) {
    const sumP = idealX * targetKPa;
    rows.push({
      Basis: "Ideal Products",
      "Sum P_i (kPa)": sumP.toFixed(3),
      "Target P (kPa)": targetKPa.toFixed(3),
      Delta: (sumP - targetKPa).toExponential(2)
    });
  }

  const prodX = sumX(products);
  if (prodX !== null) {
    const sumP = prodX * targetKPa;
    rows.push({
      Basis: mode === "dissociation" ? "Dissociation Products" : "Products",
      "Sum P_i (kPa)": sumP.toFixed(3),
      "Target P (kPa)": targetKPa.toFixed(3),
      Delta: (sumP - targetKPa).toExponential(2)
    });
  }

  if (!rows.length) {
    return null;
  }

  return {
    title: "Partial Pressure Check",
    table: {
      columns: ["Basis", "Sum P_i (kPa)", "Target P (kPa)", "Delta"],
      rows
    }
  };
}

function derivationToMarkdown(text) {
  if (!text) {
    return "";
  }
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) {
    return "";
  }

  let inBlockquote = false;
  let lastWasBlockquote = false;
  let listBuffer = null;
  let output = "";

  const appendBlock = (block) => {
    if (!block) {
      return;
    }
    const formatted = inBlockquote
      ? block
          .split("\n")
          .map((line) => `> ${line}`)
          .join("\n")
      : block;
    if (output) {
      if (lastWasBlockquote && inBlockquote) {
        output += "\n> \n";
      } else {
        output += "\n\n";
      }
    }
    output += formatted;
    lastWasBlockquote = inBlockquote;
  };

  const flushList = () => {
    if (!listBuffer) {
      return;
    }
    appendBlock(listBuffer);
    listBuffer = null;
  };

  lines.forEach((line) => {
    if (line.startsWith("LABEL:")) {
      flushList();
      const label = line.slice(6).trim();
      if (label) {
        appendBlock(`**${label}**`);
      }
      return;
    }
    if (line.startsWith("MATH:")) {
      flushList();
      const value = line.slice(5).trim();
      if (value) {
        appendBlock(`$$\n${value}\n$$`);
      }
      return;
    }
    if (line.startsWith("TEXT:")) {
      const value = line.slice(5).trim();
      if (!value) {
        return;
      }
      if (value === "BLOCKQUOTE_START") {
        flushList();
        inBlockquote = true;
        return;
      }
      if (value === "BLOCKQUOTE_END") {
        flushList();
        inBlockquote = false;
        return;
      }
      if (value.startsWith("- ")) {
        if (listBuffer) {
          listBuffer += `\n${value}`;
        } else {
          listBuffer = value;
        }
        return;
      }
      flushList();
      appendBlock(value);
      return;
    }
    flushList();
    appendBlock(`$$\n${line}\n$$`);
  });
  flushList();
  return output;
}

export default function FuelAnalysis({ simF }) {
  const [activeTab, setActiveTab] = useState("results");
    const [resultsTab, setResultsTab] = useState("overview");
  const [fuels, setFuels] = useState([]);
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [showExcluded, setShowExcluded] = useState(false);
  const autoComputeRef = useRef(false);
  const computeStartRef = useRef(0);

  const formatElapsed = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  useEffect(() => {
    let mounted = true;
    getJson("/api/fuel/list")
      .then((payload) => {
        if (!mounted) {
          return;
        }
        const list = Array.isArray(payload) ? payload : [];
        setFuels(list);
        if (list.length && !inputs.fuel_id) {
          setInputs((prev) => ({ ...prev, fuel_id: list[0].fuel_id }));
        }
      })
      .catch((err) => {
        if (!mounted) {
          return;
        }
        setError(err.message || "Failed to load fuel list.");
      });
    return () => {
      mounted = false;
    };
  }, [inputs.fuel_id]);

  const handleChange = (key) => (event) => {
    const value = event.target.value;
    if (key === "fuel_id" || key === "mode" || key === "air_model") {
      setInputs((prev) => ({ ...prev, [key]: value }));
      return;
    }
    setInputs((prev) => ({ ...prev, [key]: toNumberOrEmpty(value) }));
  };

  const handleCompute = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await postJson("/api/fuel/analysis", inputs);
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

  useEffect(() => {
    if (!loading) {
      return undefined;
    }
    computeStartRef.current = Date.now();
    setElapsedMs(0);
    const intervalId = setInterval(() => {
      setElapsedMs(Date.now() - computeStartRef.current);
    }, 1000);
    return () => clearInterval(intervalId);
  }, [loading]);

  const derivationMarkdown = useMemo(() => {
    if (data?.derivation_markdown) {
      return data.derivation_markdown;
    }
    return derivationToMarkdown(data?.derivation);
  }, [data]);
  const fuelGroups = useMemo(() => {
    const groups = new Map();
    fuels.forEach((fuel) => {
      const category = fuelCategory(fuel);
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category).push(fuel);
    });
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [fuels]);
  const reactantsTable = useMemo(
    () => reactantsToTable(data?.result?.reactants, data?.inputs?.p_pa),
    [data]
  );
  const elementBalanceTable = useMemo(
    () => elementBalanceToTable(data?.result?.element_balance),
    [data]
  );
  const massBalanceTable = useMemo(
    () => massBalanceToTable(data?.result?.mass_balance),
    [data]
  );
  const moleBalanceTable = useMemo(
    () => moleBalanceToTable(data?.result?.mole_balance),
    [data]
  );
  const partialPressureTable = useMemo(
    () => partialPressureBalanceToTable({
      reactants: data?.result?.reactants,
      ideal: data?.result?.ideal_products_list,
      products: data?.result?.products_list,
      p_pa: data?.inputs?.p_pa,
      mode: data?.mode
    }),
    [data]
  );
  const minMol = 0.000001;
  const xiSpeciesList = useMemo(() => {
    const collect = (list) => (Array.isArray(list) ? list : [])
      .filter((item) => Number.isFinite(item?.mol) && item.mol >= minMol)
      .map((item) => item?.species)
      .filter(Boolean);
    const combined = [
      ...collect(data?.result?.products_list),
      ...collect(data?.result?.ideal_products_list)
    ];
    return Array.from(new Set(combined));
  }, [data, minMol]);
  const idealProductsTable = useMemo(
    () => productsToTable(
      data?.result?.ideal_products_list,
      data?.result?.products,
      { minMol, title: "Products (Ideal)", p_pa: data?.inputs?.p_pa }
    ),
    [data]
  );
  const productsTable = useMemo(
    () => productsToTable(
      data?.result?.products_list,
      data?.result?.products,
      data?.mode === "dissociation"
        ? { minMol, title: "Products (Dissociation)", p_pa: data?.inputs?.p_pa }
        : { minMol, title: "Products", p_pa: data?.inputs?.p_pa }
    ),
    [data]
  );
  const excludedSpecies = useMemo(() => {
    const list = data?.result?.excluded_species;
    if (!Array.isArray(list) || !list.length) {
      return null;
    }
    const entries = list.map((item) => ({
      species: toLatexSpecies(item?.species ?? ""),
      mol: Number.isFinite(item?.mol) ? Number(item.mol).toExponential(3) : "--"
    }));
    const rows = [];
    for (let i = 0; i < entries.length; i += 2) {
      const left = entries[i];
      const right = entries[i + 1];
      rows.push({
        Species_1: left?.species ?? "",
        "Mol_1 (kmol)": left?.mol ?? "--",
        Species_2: right?.species ?? "",
        "Mol_2 (kmol)": right?.mol ?? "--"
      });
    }
    return {
      title: "Excluded species (mol < 1e-7)",
      table: {
        columns: ["Species_1", "Mol_1 (kmol)", "Species_2", "Mol_2 (kmol)"],
        rows
      }
    };
  }, [data]);
  const pollutantsTable = useMemo(() => dictToTable("Pollutants", data?.result?.pollutants), [data]);

  return (
    <section className="analysis-tab">
      <div className="section-header">
        <h3>Fuel-Air Combustion Analysis</h3>
        <p>
          Run the combustion prototype in the browser. Select a fuel, set the fuel-air ratio, and
          compute products and equivalence ratio. Dissociation mode requires Cantera on the backend.
        </p>
      </div>
      <Tabs
        tabs={[
          { key: "purpose", label: "Purpose" },
          { key: "derivation", label: "Derivation" },
          { key: "mechanisms", label: "Mechanisms" },
            { key: "results", label: "Results" }
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        className="tabs-sub"
      />
      {activeTab === "derivation" ? (
        <div className="analysis-content">
          <NotebookMarkdown content={derivationNotes} />
        </div>
      ) : null}
      {activeTab === "purpose" ? (
        <div className="analysis-content">
          <NotebookMarkdown content={purposeNotes} />
        </div>
      ) : null}
      {activeTab === "mechanisms" ? (
        <div className="analysis-content">
          <NotebookMarkdown content={mechanismNotes} />
        </div>
      ) : null}
      {activeTab !== "results" ? null : (
      <div className="fuel-analysis-grid">
        <div className="analysis-plot-controls">
          <div className="analysis-inputs">
            <h4>Inputs</h4>
            <div className="analysis-input-grid">
              <label className="analysis-input-field">
                <span className="analysis-input-label">Fuel</span>
                <select value={inputs.fuel_id} onChange={handleChange("fuel_id")}>
                  {fuelGroups.map(([group, list]) => (
                    <optgroup key={group} label={group}>
                      {list.map((fuel) => (
                        <option key={fuel.fuel_id} value={fuel.fuel_id}>
                          {formatFormula(fuel.fuel_id)} - {fuel.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              <label className="analysis-input-field">
                <span className="analysis-input-label">Mode</span>
                <select value={inputs.mode} onChange={handleChange("mode")}>
                  {MODE_OPTIONS.map((mode) => (
                    <option key={mode.value} value={mode.value}>
                      {mode.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="analysis-input-field">
                <span className="analysis-input-label">Air model</span>
                <select value={inputs.air_model} onChange={handleChange("air_model")}>
                  {AIR_MODEL_OPTIONS.map((model) => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="analysis-input-field">
                <span className="analysis-input-label">Fuel phase</span>
                <select value={inputs.fuel_phase} onChange={handleChange("fuel_phase")}>
                  {FUEL_PHASE_OPTIONS.map((phase) => (
                    <option key={phase.value} value={phase.value}>
                      {phase.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="analysis-input-field">
                <span className="analysis-input-label">Heating value</span>
                <select value={inputs.hv_basis} onChange={handleChange("hv_basis")}>
                  {HV_BASIS_OPTIONS.map((basis) => (
                    <option key={basis.value} value={basis.value}>
                      {basis.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="analysis-input-field">
                <span className="analysis-input-label">
                  <LatexText latex={String.raw`HV\ T_{ref}`} />
                  <span className="analysis-input-unit">(K)</span>
                </span>
                <input
                  type="number"
                  min="200"
                  step="1"
                  value={inputs.hv_ref_t_k}
                  onChange={handleChange("hv_ref_t_k")}
                />
              </label>
              <label className="analysis-input-field">
                <span className="analysis-input-label">
                  <LatexText latex={String.raw`f = \frac{\dot{m}_f}{\dot{m}_a}`} />
                  <span className="analysis-input-unit">(D.L.)</span>
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.0001"
                  value={inputs.f_over_a}
                  onChange={handleChange("f_over_a")}
                />
                {Number.isFinite(simF) ? (
                  <span className="analysis-input-hint">
                    <LatexText latex={String.raw`f_{sim} = ${Number(simF).toFixed(4)}`} />
                  </span>
                ) : null}
              </label>
              <label className="analysis-input-field">
                <span className="analysis-input-label">
                  <LatexText latex={String.raw`T_{ad}`} />
                  <span className="analysis-input-unit">(K)</span>
                </span>
                <input
                  type="number"
                  min="200"
                  step="10"
                  value={inputs.t_k}
                  onChange={handleChange("t_k")}
                />
              </label>
              <label className="analysis-input-field">
                <span className="analysis-input-label">
                  <LatexText latex={String.raw`T_{react}`} />
                  <span className="analysis-input-unit">(K)</span>
                </span>
                <input
                  type="number"
                  min="200"
                  step="10"
                  value={inputs.t_react_k}
                  onChange={handleChange("t_react_k")}
                />
              </label>
              <label className="analysis-input-field">
                <span className="analysis-input-label">
                  P
                  <span className="analysis-input-unit">(Pa)</span>
                </span>
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  value={inputs.p_pa}
                  onChange={handleChange("p_pa")}
                />
              </label>
            </div>
          </div>
          <div className="analysis-plot-actions">
            <button type="button" onClick={handleCompute} disabled={loading}>
              {loading ? "Running..." : "Compute"}
            </button>
            {loading && elapsedMs >= 2000 ? (
              <span className="compute-timer">
                Please wait, computation time is {formatElapsed(elapsedMs)}.
              </span>
            ) : null}
            {error ? <span className="error">{error}</span> : null}
          </div>
        </div>

        <div className="fuel-analysis-results">
          <Tabs
            tabs={[
              { key: "overview", label: "Overview" },
              { key: "sanity", label: "Sanity Checks" },
              { key: "xi-map", label: "Xi Map" }
            ]}
            activeTab={resultsTab}
            onTabChange={setResultsTab}
            className="tabs-sub"
          />
          {!data ? (
            <div className="plot-placeholder">Run the solver to see results.</div>
          ) : (
            <>
              {resultsTab === "overview" ? (
                <>
              {data?.result?.mechanism?.is_surrogate ? (
                <div className="analysis-warning">
                  <strong>Surrogate mechanism in use.</strong>
                  <span>
                    {data.result.mechanism.note || "Dissociation and heating value results are approximate."}
                  </span>
                </div>
              ) : null}
              <div className="analysis-output-panel">
                <h5>Summary</h5>
                <div className="analysis-output-grid">
                  <div>
                    <div className="analysis-output-label"><LatexText latex={String.raw`\phi`} /></div>
                    <div>{Number.isFinite(data?.result?.phi) ? data.result.phi.toFixed(4) : "--"}</div>
                  </div>
                  <div>
                    <div className="analysis-output-label"><LatexText latex={String.raw`AFR`} /></div>
                    <div>{Number.isFinite(data?.result?.afr) ? data.result.afr.toFixed(3) : "--"}</div>
                  </div>
                  <div>
                    <div className="analysis-output-label"><LatexText latex={String.raw`AFR_{st}`} /></div>
                    <div>{Number.isFinite(data?.result?.afr_stoich) ? data.result.afr_stoich.toFixed(3) : "--"}</div>
                  </div>
                  <div>
                    <div className="analysis-output-label">Mode</div>
                    <div>{data?.mode || "--"}</div>
                  </div>
                  <div>
                    <div className="analysis-output-label">Regime</div>
                    <div>{data?.result?.regime || "--"}</div>
                  </div>
                  <div>
                    <div className="analysis-output-label">Air model</div>
                    <div>{data?.result?.air_model || "--"}</div>
                  </div>
                  <div>
                    <div className="analysis-output-label">Fuel phase</div>
                    <div>{data?.result?.fuel_phase || "--"}</div>
                  </div>
                  <div>
                    <div className="analysis-output-label"><LatexText latex={String.raw`HV`} /></div>
                    <div>
                      {Number.isFinite(data?.result?.heating_value?.value_kJ_per_kg)
                        ? `${data.result.heating_value.value_kJ_per_kg.toFixed(1)} kJ/kg (${String(data.result.heating_value.basis || "").toUpperCase()})`
                        : "--"}
                    </div>
                  </div>
                  <div>
                    <div className="analysis-output-label"><LatexText latex={String.raw`R_u`} /></div>
                    <div>8.314 kJ/(kmol*K)</div>
                  </div>
                  <div>
                    <div className="analysis-output-label"><LatexText latex={String.raw`HV_{eq}`} /></div>
                    <div>
                      {Number.isFinite(data?.result?.heating_value?.eq_value_kJ_per_kg)
                        ? `${data.result.heating_value.eq_value_kJ_per_kg.toFixed(1)} kJ/kg`
                        : "--"}
                    </div>
                  </div>
                  <div>
                    <div className="analysis-output-label">Mechanism</div>
                    <div>
                      {data?.result?.mechanism?.name
                        ? `${data.result.mechanism.name}${data.result.mechanism.species ? ` (${data.result.mechanism.species})` : ""}`
                        : "--"}
                    </div>
                  </div>
                </div>
              </div>
              {data?.result?.mechanism?.name ? (
                <div className="analysis-output-panel">
                  <h5>Mechanism info</h5>
                  <div className="analysis-output-grid">
                    <div>
                      <div className="analysis-output-label">Elements</div>
                      <div>
                        {Array.isArray(data?.result?.mechanism?.elements)
                          ? data.result.mechanism.elements.join(", ")
                          : "--"}
                      </div>
                    </div>
                    <div>
                      <div className="analysis-output-label">Species count</div>
                      <div>
                        {Number.isFinite(data?.result?.mechanism?.species_count)
                          ? data.result.mechanism.species_count
                          : "--"}
                      </div>
                    </div>
                    <div>
                      <div className="analysis-output-label">Reaction count</div>
                      <div>
                        {Number.isFinite(data?.result?.mechanism?.reaction_count)
                          ? data.result.mechanism.reaction_count
                          : "--"}
                      </div>
                    </div>
                    <div>
                      <div className="analysis-output-label">Thermo fields</div>
                      <div>cp(T), h(T), s(T), g(T)</div>
                    </div>
                    <div>
                      <div className="analysis-output-label">Tables</div>
                      <div>MW, hbar, cpbar, sbar, gfo</div>
                    </div>
                  </div>
                </div>
              ) : null}
              {data?.result?.heating_value && data.result.heating_value.eq_available === false && data.result.heating_value.eq_note ? (
                <div className="analysis-output-panel">
                  <h5>HV_eq note</h5>
                  <p className="plot-caption">{data.result.heating_value.eq_note}</p>
                </div>
              ) : null}
              {data?.result?.mechanism?.fuel_enthalpy_surrogate ? (
                <div className="analysis-output-panel">
                  <h5>Fuel enthalpy note</h5>
                  <p className="plot-caption">
                    Fuel enthalpy is taken from the selected mechanism species (surrogate) because
                    the exact fuel formula is not present in that mechanism.
                  </p>
                </div>
              ) : null}

              {data?.result?.note ? (
                <div className="analysis-output-panel">
                  <h5>Note</h5>
                  <p className="plot-caption">{data.result.note}</p>
                </div>
              ) : null}

              {reactantsTable ? (
                <TableView
                  title={`${reactantsTable.title} (T = ${Number(data?.inputs?.t_react_k ?? 0).toFixed(2)} K)`}
                  table={reactantsTable.table}
                  enableSort
                />
              ) : null}
              {data?.mode === "dissociation" && idealProductsTable ? (
                <TableView
                  title={`${idealProductsTable.title} (T = ${Number(data?.inputs?.t_k ?? 0).toFixed(2)} K)`}
                  table={idealProductsTable.table}
                  enableSort
                />
              ) : null}
              {productsTable ? (
                <TableView
                  title={`${productsTable.title} (T = ${Number(data?.inputs?.t_k ?? 0).toFixed(2)} K)`}
                  table={productsTable.table}
                  enableSort
                />
              ) : null}
              {data?.mode === "dissociation" && excludedSpecies ? (
                <div className="analysis-output-panel">
                  <div className="analysis-output-row">
                    <h5>{excludedSpecies.title}</h5>
                    <button
                      type="button"
                      className="analysis-toggle"
                      onClick={() => setShowExcluded((prev) => !prev)}
                    >
                      {showExcluded ? "Hide" : "Show"}
                    </button>
                  </div>
                  {showExcluded ? (
                    <TableView
                      title={excludedSpecies.title}
                      table={excludedSpecies.table}
                      enableSort
                    />
                  ) : null}
                </div>
              ) : null}
              {pollutantsTable ? null : null}

              {derivationMarkdown ? (
                <div className="analysis-output-panel analysis-output-panel--derivation">
                  <h5>LaTeX Derivation</h5>
                  <NotebookMarkdown content={derivationMarkdown} />
                </div>
              ) : null}
                </>
              ) : null}
              {resultsTab === "sanity" ? (
                <>
                  {elementBalanceTable ? (
                    <TableView
                      title={elementBalanceTable.title}
                      table={elementBalanceTable.table}
                      enableSort
                    />
                  ) : null}
                  {massBalanceTable ? (
                    <TableView
                      title={massBalanceTable.title}
                      table={massBalanceTable.table}
                      enableSort
                    />
                  ) : null}
                  {moleBalanceTable ? (
                    <TableView
                      title={moleBalanceTable.title}
                      table={moleBalanceTable.table}
                      enableSort
                    />
                  ) : null}
                  {partialPressureTable ? (
                    <TableView
                      title={partialPressureTable.title}
                      table={partialPressureTable.table}
                      enableSort
                    />
                  ) : null}
                </>
              ) : null}
              {resultsTab === "xi-map" ? (
                <FuelXiMap
                  inputs={inputs}
                  speciesList={xiSpeciesList}
                  mode={inputs?.mode}
                />
              ) : null}
            </>
          )}
        </div>
      </div>
      )}
    </section>
  );
}
