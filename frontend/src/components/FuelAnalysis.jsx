import { useEffect, useMemo, useRef, useState } from "react";
import { getJson, postJson } from "../api/client";
import NotebookMarkdown from "./analysis/NotebookMarkdown";
import TableView from "./TableView";
import Tabs from "./Tabs";
import LatexText from "./LatexText";
import FuelXiMap from "./FuelXiMap";
import FuelDissociationDiagnostics from "./FuelDissociationDiagnostics";
import derivationNotes from "../analysis/fuelAnalysisDerivation.md?raw";
import mechanismNotes from "../analysis/fuelAnalysisMechanisms.md?raw";
import purposeNotes from "../analysis/fuelPurposeNotes.md?raw";

const DEFAULT_INPUTS = {
  fuel_id: "CH4",
  mixture_input_mode: "f",
  f_over_a: 0.02,
  phi_input: null,
  mode: "ideal",
  temp_mode: "fixed",
  t_k: 2000.0,
  t_fuel_k: 298.15,
  t_air_k: 298.15,
  p_pa: 101325.0,
  air_model: "dry_air",
  fuel_phase: "vapor",
  hv_basis: "lhv",
  hv_ref_t_k: 298.15
};

const CHEMISTRY_MODE_LABELS = {
  ideal: "Ideal (no dissociation)",
  dissociation: "Equilibrium (dissociation)"
};
const CHEMISTRY_MODE_DESCRIPTIONS = {
  ideal: "Assumes complete combustion with fixed product composition and no chemical dissociation. Products are determined by stoichiometry only.",
  dissociation: "Allows chemical equilibrium and dissociation of species at high temperature. Product composition is determined by minimizing Gibbs free energy at constant temperature and pressure."
};
const TEMP_MODE_LABELS = {
  fixed: "Fixed-T evaluation",
  adiabatic: "Adiabatic solve"
};
const TEMP_MODE_DESCRIPTIONS = {
  fixed: "Computes thermodynamic properties at a user-specified product temperature. Energy conservation is not enforced.",
  adiabatic: "Solves for the product temperature such that total enthalpy of reactants equals products (H_{react} = H_{prod})."
};

const MODE_OPTIONS = [
  { value: "ideal", label: CHEMISTRY_MODE_LABELS.ideal },
  { value: "dissociation", label: CHEMISTRY_MODE_LABELS.dissociation }
];
const TEMP_MODE_OPTIONS = [
  { value: "fixed", label: TEMP_MODE_LABELS.fixed },
  { value: "adiabatic", label: TEMP_MODE_LABELS.adiabatic }
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

const chemistryLabelFor = (mode) => CHEMISTRY_MODE_LABELS[mode] || (mode ? String(mode) : "--");
const chemistryDescriptionFor = (mode) => CHEMISTRY_MODE_DESCRIPTIONS[mode] || "";
const temperatureLabelFor = (mode) => TEMP_MODE_LABELS[mode] || (mode ? String(mode) : "--");
const temperatureDescriptionFor = (mode) => TEMP_MODE_DESCRIPTIONS[mode] || "";

function parseFormulaElements(formula) {
  if (!formula) {
    return {};
  }
  const parts = {};
  const tokens = String(formula).match(/([A-Z][a-z]?)(\d*)/g) || [];
  tokens.forEach((token) => {
    const match = token.match(/([A-Z][a-z]?)(\d*)/);
    if (!match) {
      return;
    }
    const element = match[1];
    const count = match[2] ? Number(match[2]) : 1.0;
    parts[element] = (parts[element] || 0.0) + count;
  });
  return parts;
}

function stoichOxygenMoles(formula) {
  const counts = parseFormulaElements(formula);
  const c = counts.C || 0.0;
  const h = counts.H || 0.0;
  const o = counts.O || 0.0;
  return c + h / 4.0 - o / 2.0;
}

function stoichAfr(formula, mwFuel, airModel) {
  const a = stoichOxygenMoles(formula);
  if (!Number.isFinite(a) || a <= 0) {
    return null;
  }
  const n2o2 = airModel === "oxygen" ? 0.0 : 3.76;
  const massAir = a * (31.998 + n2o2 * 28.0134);
  if (!Number.isFinite(massAir) || massAir <= 0) {
    return null;
  }
  const fOverAStoich = Number(mwFuel) / massAir;
  if (!Number.isFinite(fOverAStoich) || fOverAStoich <= 0) {
    return null;
  }
  return 1.0 / fOverAStoich;
}

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
  const rows = buildSpeciesRows(listData, dictData, { minMol, p_pa: options?.p_pa });
  return buildSpeciesTables(title, rows);
}

const MASS_COLUMNS = ["Species", "Molar species amount (kmol)", "MW (kg/kmol)", "Mass (kg)"];
const COMPOSITION_COLUMNS = ["Species", "X", "Y", "P_i (kPa)"];
const THERMO_COLUMNS = [
  "Species",
  "hbar (kJ/kmol)",
  "hbar_f (kJ/kmol)",
  "hbar_s (kJ/kmol)",
  "cpbar (kJ/kmol-K)",
  "sbar (kJ/kmol-K)",
  "sbar_ref (kJ/kmol-K)",
  "sbar_s (kJ/kmol-K)",
  "sbar_i (kJ/kmol-K)",
  "gbar (kJ/kmol)",
  "g_elements (kJ/kmol)",
  "gfo (kJ/kmol)"
];

function buildSpeciesRows(listData, dictData, options = {}) {
  const { minMol = 0, p_pa } = options;
  if (Array.isArray(listData) && listData.length) {
    return listData
      .map((item) => {
        const mol = Number.isFinite(item?.mol) ? item.mol : Number(item?.mol);
        const mw = Number.isFinite(item?.mw) ? item.mw : Number(item?.mw);
        const mass = Number.isFinite(mol) && Number.isFinite(mw) ? mol * mw : null;
        const h = Number.isFinite(item?.hbar_kJ_per_kmol)
          ? item.hbar_kJ_per_kmol
          : Number(item?.hbar_kJ_per_kmol);
        const hbarF = Number.isFinite(item?.hbar_f_kJ_per_kmol)
          ? item.hbar_f_kJ_per_kmol
          : Number(item?.hbar_f_kJ_per_kmol);
        const hbarS = Number.isFinite(item?.hbar_s_kJ_per_kmol)
          ? item.hbar_s_kJ_per_kmol
          : Number(item?.hbar_s_kJ_per_kmol);
        const cpbar = Number.isFinite(item?.cpbar_kJ_per_kmol_k)
          ? item.cpbar_kJ_per_kmol_k
          : Number(item?.cpbar_kJ_per_kmol_k);
        const sbar = Number.isFinite(item?.sbar_kJ_per_kmol_k)
          ? item.sbar_kJ_per_kmol_k
          : Number(item?.sbar_kJ_per_kmol_k);
        const sbarRef = Number.isFinite(item?.sbar_ref_kJ_per_kmol_k)
          ? item.sbar_ref_kJ_per_kmol_k
          : Number(item?.sbar_ref_kJ_per_kmol_k);
        const sbarS = Number.isFinite(item?.sbar_s_kJ_per_kmol_k)
          ? item.sbar_s_kJ_per_kmol_k
          : Number(item?.sbar_s_kJ_per_kmol_k);
        const gfo = Number.isFinite(item?.gfo_kJ_per_kmol)
          ? item.gfo_kJ_per_kmol
          : Number(item?.gfo_kJ_per_kmol);
        const gbar = Number.isFinite(item?.gbar_kJ_per_kmol)
          ? item.gbar_kJ_per_kmol
          : Number(item?.gbar_kJ_per_kmol);
        const gElements = Number.isFinite(item?.g_elements_kJ_per_kmol)
          ? item.g_elements_kJ_per_kmol
          : Number(item?.g_elements_kJ_per_kmol);
        const molFrac = Number.isFinite(item?.mol_frac) ? item.mol_frac : Number(item?.mol_frac);
        const massFrac = Number.isFinite(item?.mass_frac) ? item.mass_frac : Number(item?.mass_frac);
        const pPa = Number.isFinite(p_pa) ? p_pa : Number(p_pa);
        const pKPa = Number.isFinite(molFrac) && Number.isFinite(pPa) ? (molFrac * pPa) / 1000.0 : null;
        const pI = Number.isFinite(molFrac) && Number.isFinite(pPa) ? molFrac * pPa : null;
        const sbarI = Number.isFinite(sbar) && Number.isFinite(pI) && pI > 0
          ? sbar - 8.314 * Math.log(pI / 101325.0)
          : null;
        const nH = Number.isFinite(mol) && Number.isFinite(h) ? mol * h : null;
        const nHf = Number.isFinite(mol) && Number.isFinite(hbarF) ? mol * hbarF : null;
        const nHs = Number.isFinite(mol) && Number.isFinite(hbarS) ? mol * hbarS : null;
        const nCp = Number.isFinite(mol) && Number.isFinite(cpbar) ? mol * cpbar : null;
        const nS = Number.isFinite(mol) && Number.isFinite(sbar) ? mol * sbar : null;
        const nSref = Number.isFinite(mol) && Number.isFinite(sbarRef) ? mol * sbarRef : null;
        const nSs = Number.isFinite(mol) && Number.isFinite(sbarS) ? mol * sbarS : null;
        const nSi = Number.isFinite(mol) && Number.isFinite(sbarI) ? mol * sbarI : null;
        const nG = Number.isFinite(mol) && Number.isFinite(gbar) ? mol * gbar : null;
        const nGe = Number.isFinite(mol) && Number.isFinite(gElements) ? mol * gElements : null;
        const nGfo = Number.isFinite(mol) && Number.isFinite(gfo) ? mol * gfo : null;
        const species = item?.species ?? "";
        return {
          species,
          Species: toLatexSpecies(species),
          "Mol (kmol)": Number.isFinite(mol) ? mol.toFixed(6) : "--",
          "Molar species amount (kmol)": Number.isFinite(mol) ? mol.toFixed(6) : "--",
          "MW (kg/kmol)": Number.isFinite(mw) ? mw.toFixed(5) : "--",
          "Mass (kg)": Number.isFinite(mass) ? mass.toFixed(6) : "--",
          "hbar (kJ/kmol)": Number.isFinite(h) ? h.toFixed(2) : "--",
          "n_i hbar (kJ)": Number.isFinite(nH) ? nH.toFixed(2) : "--",
          "hbar_f (kJ/kmol)": Number.isFinite(hbarF) ? hbarF.toFixed(2) : "--",
          "n_i hbar_f (kJ)": Number.isFinite(nHf) ? nHf.toFixed(2) : "--",
          "hbar_s (kJ/kmol)": Number.isFinite(hbarS) ? hbarS.toFixed(2) : "--",
          "n_i hbar_s (kJ)": Number.isFinite(nHs) ? nHs.toFixed(2) : "--",
          "cpbar (kJ/kmol-K)": Number.isFinite(cpbar) ? cpbar.toFixed(2) : "--",
          "n_i cpbar (kJ/K)": Number.isFinite(nCp) ? nCp.toFixed(2) : "--",
          "sbar (kJ/kmol-K)": Number.isFinite(sbar) ? sbar.toFixed(2) : "--",
          "n_i sbar (kJ/K)": Number.isFinite(nS) ? nS.toFixed(2) : "--",
          "sbar_ref (kJ/kmol-K)": Number.isFinite(sbarRef) ? sbarRef.toFixed(2) : "--",
          "n_i sbar_ref (kJ/K)": Number.isFinite(nSref) ? nSref.toFixed(2) : "--",
          "sbar_s (kJ/kmol-K)": Number.isFinite(sbarS) ? sbarS.toFixed(2) : "--",
          "n_i sbar_s (kJ/K)": Number.isFinite(nSs) ? nSs.toFixed(2) : "--",
          "sbar_i (kJ/kmol-K)": Number.isFinite(sbarI) ? sbarI.toFixed(2) : "--",
          "n_i sbar_i (kJ/K)": Number.isFinite(nSi) ? nSi.toFixed(2) : "--",
          "gbar (kJ/kmol)": Number.isFinite(gbar) ? gbar.toFixed(2) : "--",
          "n_i gbar (kJ)": Number.isFinite(nG) ? nG.toFixed(2) : "--",
          "g_elements (kJ/kmol)": Number.isFinite(gElements) ? gElements.toFixed(2) : "--",
          "n_i g_elements (kJ)": Number.isFinite(nGe) ? nGe.toFixed(2) : "--",
          "gfo (kJ/kmol)": Number.isFinite(gfo) ? gfo.toFixed(2) : "--",
          "n_i gfo (kJ)": Number.isFinite(nGfo) ? nGfo.toFixed(2) : "--",
          "X": Number.isFinite(molFrac) ? molFrac.toFixed(6) : "--",
          "Y": Number.isFinite(massFrac) ? massFrac.toFixed(6) : "--",
          "P_i (kPa)": Number.isFinite(pKPa) ? pKPa.toFixed(3) : "--"
        };
      })
      .filter((row) => {
        const mol = Number(row["Mol (kmol)"]);
        return Number.isFinite(mol) ? mol >= minMol : false;
      })
      .sort((a, b) => Number(b.Mol) - Number(a.Mol));
  }

  if (!dictData || typeof dictData !== "object") {
    return [];
  }
  return Object.entries(dictData).map(([key, value]) => {
    const mol = Number.isFinite(value) ? value : Number(value);
    return {
      Species: toLatexSpecies(key),
      "Mol (kmol)": Number.isFinite(mol) ? mol.toFixed(6) : String(value),
      "Molar species amount (kmol)": Number.isFinite(mol) ? mol.toFixed(6) : String(value),
      "MW (kg/kmol)": "--",
      "Mass (kg)": "--",
      "hbar (kJ/kmol)": "--",
      "n_i hbar (kJ)": "--",
      "hbar_f (kJ/kmol)": "--",
      "n_i hbar_f (kJ)": "--",
      "hbar_s (kJ/kmol)": "--",
      "n_i hbar_s (kJ)": "--",
      "cpbar (kJ/kmol-K)": "--",
      "n_i cpbar (kJ/K)": "--",
      "sbar (kJ/kmol-K)": "--",
      "n_i sbar (kJ/K)": "--",
      "sbar_ref (kJ/kmol-K)": "--",
      "n_i sbar_ref (kJ/K)": "--",
      "sbar_s (kJ/kmol-K)": "--",
      "n_i sbar_s (kJ/K)": "--",
      "sbar_i (kJ/kmol-K)": "--",
      "n_i sbar_i (kJ/K)": "--",
      "gbar (kJ/kmol)": "--",
      "n_i gbar (kJ)": "--",
      "g_elements (kJ/kmol)": "--",
      "n_i g_elements (kJ)": "--",
      "gfo (kJ/kmol)": "--",
      "n_i gfo (kJ)": "--",
      "X": "--",
      "Y": "--",
      "P_i (kPa)": "--"
    };
  });
}

function buildSpeciesTables(title, rows) {
  if (!Array.isArray(rows) || !rows.length) {
    return null;
  }
  return {
    mass: {
      title: `${title} - Mass/MW/Mol`,
      table: {
        columns: MASS_COLUMNS,
        rows
      }
    },
    composition: {
      title: `${title} - X/Y/P_i`,
      table: {
        columns: COMPOSITION_COLUMNS,
        rows
      }
    },
    thermo: {
      title: `${title} - Thermo (h,s,g)`,
      table: {
        columns: THERMO_COLUMNS,
        rows
      }
    }
  };
}

function elementBalanceToTable(balance) {
  if (!balance) {
    return null;
  }
  const idealLabel = CHEMISTRY_MODE_LABELS.ideal;
  const dissLabel = CHEMISTRY_MODE_LABELS.dissociation;
  const dissFilteredLabel = `${dissLabel} (Filtered)`;
  const idealDeltaLabel = `${idealLabel} Δ`;
  const dissDeltaLabel = `${dissLabel} Δ`;
  const dissFilteredDeltaLabel = `${dissLabel} (Filtered) Δ`;
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
      [idealLabel]: i.toFixed(6),
      [dissLabel]: d.toFixed(6),
      [dissFilteredLabel]: df.toFixed(6),
      [idealDeltaLabel]: (i - r).toExponential(2),
      [dissDeltaLabel]: (d - r).toExponential(2),
      [dissFilteredDeltaLabel]: (df - r).toExponential(2)
    };
  });
  return {
    title: "Element Balance",
    table: {
      columns: [
        "Element",
        "Reactants",
        idealLabel,
        dissLabel,
        dissFilteredLabel,
        idealDeltaLabel,
        dissDeltaLabel,
        dissFilteredDeltaLabel
      ],
      rows
    }
  };
}

function massBalanceToTable(balance) {
  if (!balance) {
    return null;
  }
  const idealLabel = `${CHEMISTRY_MODE_LABELS.ideal} Products`;
  const dissLabel = `${CHEMISTRY_MODE_LABELS.dissociation} Products`;
  const dissFilteredLabel = `${CHEMISTRY_MODE_LABELS.dissociation} Products (Filtered)`;
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
          Basis: idealLabel,
          "Total Mass": ideal.toFixed(6),
          Delta: (ideal - reactants).toExponential(2)
        },
        {
          Basis: dissLabel,
          "Total Mass": dissociation.toFixed(6),
          Delta: (dissociation - reactants).toExponential(2)
        },
        {
          Basis: dissFilteredLabel,
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
  const idealLabel = `${CHEMISTRY_MODE_LABELS.ideal} Products`;
  const dissLabel = `${CHEMISTRY_MODE_LABELS.dissociation} Products`;
  const dissFilteredLabel = `${CHEMISTRY_MODE_LABELS.dissociation} Products (Filtered)`;
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
          Basis: idealLabel,
          "Total Moles": ideal.toFixed(6),
          Delta: (ideal - reactants).toExponential(2)
        },
        {
          Basis: dissLabel,
          "Total Moles": dissociation.toFixed(6),
          Delta: (dissociation - reactants).toExponential(2)
        },
        {
          Basis: dissFilteredLabel,
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
      Basis: `${CHEMISTRY_MODE_LABELS.ideal} Products`,
      "Sum P_i (kPa)": sumP.toFixed(3),
      "Target P (kPa)": targetKPa.toFixed(3),
      Delta: (sumP - targetKPa).toExponential(2)
    });
  }

  const prodX = sumX(products);
  if (prodX !== null) {
    const sumP = prodX * targetKPa;
    rows.push({
      Basis: mode === "dissociation" ? `${CHEMISTRY_MODE_LABELS.dissociation} Products` : "Products",
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
  const [reactantsTableTab, setReactantsTableTab] = useState("mass");
  const [idealProductsTableTab, setIdealProductsTableTab] = useState("mass");
  const [productsTableTab, setProductsTableTab] = useState("mass");
  const [reactantsThermoTab, setReactantsThermoTab] = useState("h");
  const [idealProductsThermoTab, setIdealProductsThermoTab] = useState("h");
  const [productsThermoTab, setProductsThermoTab] = useState("h");
  const [fuels, setFuels] = useState([]);
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [showExcluded, setShowExcluded] = useState(false);
  const autoComputeRef = useRef(false);
  const computeStartRef = useRef(0);

  const analysis = data?.result?.analysis;
  const analysisMode = analysis?.analysis_mode ?? inputs.temp_mode ?? "fixed";
  const productTempLabel = analysisMode === "adiabatic" ? "T_{ad}" : "T_{prod}";
  const chemistryModelLabel = data?.chemistry_model
    ?? chemistryLabelFor(data?.mode ?? inputs.mode);
  const temperatureModeLabel = data?.temperature_mode
    ?? temperatureLabelFor(analysisMode);
  const modelSummaryLabel = `${chemistryModelLabel}, ${temperatureModeLabel}`;

  const selectedFuel = useMemo(
    () => fuels.find((fuel) => fuel.fuel_id === inputs.fuel_id),
    [fuels, inputs.fuel_id]
  );
  const afrStoich = useMemo(() => {
    if (!selectedFuel) {
      return null;
    }
    return stoichAfr(selectedFuel.formula, selectedFuel.mw_kg_per_kmol, inputs.air_model);
  }, [selectedFuel, inputs.air_model]);
  const fStoich = useMemo(() => {
    if (!Number.isFinite(afrStoich) || afrStoich <= 0) {
      return null;
    }
    return 1.0 / afrStoich;
  }, [afrStoich]);
  const phiFromF = useMemo(() => {
    if (!Number.isFinite(inputs.f_over_a) || !Number.isFinite(afrStoich) || afrStoich <= 0) {
      return null;
    }
    return Number(inputs.f_over_a) * Number(afrStoich);
  }, [inputs.f_over_a, afrStoich]);
  const fFromPhi = useMemo(() => {
    if (!Number.isFinite(inputs.phi_input) || !Number.isFinite(fStoich) || fStoich <= 0) {
      return null;
    }
    return Number(inputs.phi_input) * fStoich;
  }, [inputs.phi_input, fStoich]);

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

  const handleMixtureModeChange = (event) => {
    const value = event.target.value;
    setInputs((prev) => {
      if (value === "phi") {
        const nextPhi = Number.isFinite(phiFromF) ? phiFromF : prev.phi_input;
        return {
          ...prev,
          mixture_input_mode: value,
          phi_input: Number.isFinite(nextPhi) ? nextPhi : prev.phi_input
        };
      }
      const nextF = Number.isFinite(fFromPhi) ? fFromPhi : prev.f_over_a;
      return {
        ...prev,
        mixture_input_mode: "f",
        f_over_a: Number.isFinite(nextF) ? nextF : prev.f_over_a
      };
    });
  };

  const handleFChange = (event) => {
    const value = toNumberOrEmpty(event.target.value);
    setInputs((prev) => {
      const next = { ...prev, f_over_a: value };
      if (prev.mixture_input_mode === "f" && Number.isFinite(value) && Number.isFinite(afrStoich)) {
        next.phi_input = Number(value) * Number(afrStoich);
      }
      return next;
    });
  };

  const handlePhiChange = (event) => {
    const value = toNumberOrEmpty(event.target.value);
    setInputs((prev) => {
      const next = { ...prev, phi_input: value };
      if (prev.mixture_input_mode === "phi" && Number.isFinite(value) && Number.isFinite(fStoich)) {
        next.f_over_a = Number(value) * Number(fStoich);
      }
      return next;
    });
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

  const normalizeDerivationMarkdown = (text) => {
    if (!text) {
      return text;
    }
    return text
      .replace(/\r\n/g, "\n")
      .replace(/\bBLOCKQUOTE_START\b/g, "")
      .replace(/\bBLOCKQUOTE_END\b/g, "")
      .replace(
        /Q_\{p,\\mathrm\{WGS\}\} \(ideal products\) unavailable \(zero CO or H2\)/g,
        "$Q_{p,\\mathrm{WGS}}$ (ideal products) unavailable (zero CO or H2)"
      )
      .replace(
        /Q_\{p,\\mathrm\{WGS\}\} \(dissociated products\) unavailable \(zero CO or H2\)/g,
        "$Q_{p,\\mathrm{WGS}}$ (dissociated products) unavailable (zero CO or H2)"
      )
      .replace(
        /Q_\{p,\\mathrm\{WGS\}\} unavailable \(zero CO or H2\)/g,
        "$Q_{p,\\mathrm{WGS}}$ unavailable (zero CO or H2)"
      )
      .replace(
        /Q_\{p,\\mathrm\{overall\}\} unavailable \(missing species or zero mole fractions\)/g,
        "$Q_{p,\\mathrm{overall}}$ unavailable (missing species or zero mole fractions)"
      )
      .replace(
        /Computed directly from table mole fractions using\s*P_i = X_i P\./g,
        "Computed directly from table mole fractions using $P_i = X_i P$."
      );
  };

  const derivationMarkdown = useMemo(() => {
    if (data?.derivation_markdown) {
      return normalizeDerivationMarkdown(data.derivation_markdown);
    }
    return normalizeDerivationMarkdown(derivationToMarkdown(data?.derivation));
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
  const reactantsTables = useMemo(() => {
    const rows = buildSpeciesRows(data?.result?.reactants, null, { p_pa: data?.inputs?.p_pa });
    return buildSpeciesTables("Reactants", rows);
  }, [data]);
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
  const idealProductsTables = useMemo(() => {
    const rows = buildSpeciesRows(
      data?.result?.ideal_products_list,
      data?.result?.products,
      { minMol, p_pa: data?.inputs?.p_pa }
    );
    return buildSpeciesTables(`${CHEMISTRY_MODE_LABELS.ideal} Products`, rows);
  }, [data, minMol]);
  const productsTables = useMemo(() => {
    const title = data?.mode === "dissociation"
      ? `${CHEMISTRY_MODE_LABELS.dissociation} Products`
      : "Products";
    const rows = buildSpeciesRows(
      data?.result?.products_list,
      data?.result?.products,
      { minMol, p_pa: data?.inputs?.p_pa }
    );
    return buildSpeciesTables(title, rows);
  }, [data, minMol]);
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

  const tableTabs = [
    { key: "mass", label: "Mass/MW/Mol" },
    { key: "composition", label: "X/Y/P_i" },
    { key: "thermo", label: "Thermo (h,s,g)" }
  ];

  const thermoTabs = [
    { key: "h", label: "Enthalpy" },
    { key: "s", label: "Entropy" },
    { key: "g", label: "Gibbs free energy" }
  ];

  const THERMO_H_COLUMNS = [
    "Species",
    "hbar (kJ/kmol)",
    "n_i hbar (kJ)",
    "hbar_f (kJ/kmol)",
    "n_i hbar_f (kJ)",
    "hbar_s (kJ/kmol)",
    "n_i hbar_s (kJ)",
    "cpbar (kJ/kmol-K)",
    "n_i cpbar (kJ/K)"
  ];
  const THERMO_S_COLUMNS = [
    "Species",
    "sbar (kJ/kmol-K)",
    "n_i sbar (kJ/K)",
    "sbar_ref (kJ/kmol-K)",
    "n_i sbar_ref (kJ/K)",
    "sbar_s (kJ/kmol-K)",
    "n_i sbar_s (kJ/K)",
    "sbar_i (kJ/kmol-K)",
    "n_i sbar_i (kJ/K)",
    "cpbar (kJ/kmol-K)",
    "n_i cpbar (kJ/K)"
  ];
  const THERMO_G_COLUMNS = [
    "Species",
    "gbar (kJ/kmol)",
    "n_i gbar (kJ)",
    "g_elements (kJ/kmol)",
    "n_i g_elements (kJ)",
    "gfo (kJ/kmol)",
    "n_i gfo (kJ)",
    "cpbar (kJ/kmol-K)",
    "n_i cpbar (kJ/K)"
  ];

  const THERMO_H_SUM_COLUMNS = [
    "n_i hbar (kJ)",
    "n_i hbar_f (kJ)",
    "n_i hbar_s (kJ)",
    "n_i cpbar (kJ/K)"
  ];
  const THERMO_S_SUM_COLUMNS = [
    "n_i sbar (kJ/K)",
    "n_i sbar_ref (kJ/K)",
    "n_i sbar_s (kJ/K)",
    "n_i sbar_i (kJ/K)",
    "n_i cpbar (kJ/K)"
  ];
  const THERMO_G_SUM_COLUMNS = [
    "n_i gbar (kJ)",
    "n_i g_elements (kJ)",
    "n_i gfo (kJ)",
    "n_i cpbar (kJ/K)"
  ];
  const THERMO_CP_AVG_COLUMNS = [
    {
      col: "cpbar (kJ/kmol-K)",
      numerator: "n_i cpbar (kJ/K)",
      denominator: "Mol (kmol)"
    },
    {
      col: "n_i cpbar (kJ/K)",
      numerator: "n_i cpbar (kJ/K)",
      denominator: "__count__"
    }
  ];

  const REACTANT_COLUMN_KEY_MAP = {
    "Species": "Species_j",
    "hbar (kJ/kmol)": "hbar_j (kJ/kmol)",
    "hbar_s (kJ/kmol)": "hbar_s_j (kJ/kmol)",
    "sbar (kJ/kmol-K)": "sbar_j (kJ/kmol-K)",
    "sbar_ref (kJ/kmol-K)": "sbar_ref_j (kJ/kmol-K)",
    "sbar_s (kJ/kmol-K)": "sbar_s_j (kJ/kmol-K)",
    "sbar_i (kJ/kmol-K)": "sbar_j_actual (kJ/kmol-K)",
    "gbar (kJ/kmol)": "gbar_j (kJ/kmol)",
    "gfo (kJ/kmol)": "gfo_j (kJ/kmol)",
    "n_i hbar (kJ)": "n_j hbar (kJ)",
    "n_i hbar_f (kJ)": "n_j hbar_f (kJ)",
    "n_i hbar_s (kJ)": "n_j hbar_s (kJ)",
    "n_i cpbar (kJ/K)": "n_j cpbar (kJ/K)",
    "n_i sbar (kJ/K)": "n_j sbar (kJ/K)",
    "n_i sbar_ref (kJ/K)": "n_j sbar_ref (kJ/K)",
    "n_i sbar_s (kJ/K)": "n_j sbar_s (kJ/K)",
    "n_i sbar_i (kJ/K)": "n_j sbar_j (kJ/K)",
    "n_i gbar (kJ)": "n_j gbar (kJ)",
    "n_i g_elements (kJ)": "n_j g_elements (kJ)",
    "n_i gfo (kJ)": "n_j gfo (kJ)",
    "X": "X_j",
    "Y": "Y_j",
    "P_i (kPa)": "P_j (kPa)"
  };

  const remapTableKeys = (table, keyMap) => {
    if (!table || typeof table !== "object" || !keyMap) {
      return table;
    }
    const remapKey = (key) => (keyMap[key] ? keyMap[key] : key);
    const remapRow = (row) => {
      if (!row || typeof row !== "object") {
        return row;
      }
      const updates = {};
      Object.entries(row).forEach(([key, value]) => {
        const nextKey = remapKey(key);
        if (nextKey !== key) {
          updates[nextKey] = value;
        } else {
          updates[key] = value;
        }
      });
      return updates;
    };
    const remapAvgSpec = (spec) => {
      if (!spec || typeof spec !== "object") {
        return spec;
      }
      return {
        ...spec,
        col: remapKey(spec.col),
        numerator: remapKey(spec.numerator),
        denominator: spec.denominator === "__count__" ? spec.denominator : remapKey(spec.denominator)
      };
    };
    return {
      ...table,
      columns: Array.isArray(table.columns) ? table.columns.map(remapKey) : table.columns,
      rows: Array.isArray(table.rows) ? table.rows.map(remapRow) : table.rows,
      sumColumns: Array.isArray(table.sumColumns) ? table.sumColumns.map(remapKey) : table.sumColumns,
      avgColumns: Array.isArray(table.avgColumns) ? table.avgColumns.map(remapAvgSpec) : table.avgColumns
    };
  };

  const gbarSum = (list) => {
    if (!Array.isArray(list) || !list.length) {
      return null;
    }
    const total = list.reduce((acc, item) => {
      const mol = Number.isFinite(item?.mol) ? item.mol : Number(item?.mol);
      const gbar = Number.isFinite(item?.gbar_kJ_per_kmol)
        ? item.gbar_kJ_per_kmol
        : Number(item?.gbar_kJ_per_kmol);
      if (!Number.isFinite(mol) || !Number.isFinite(gbar)) {
        return acc;
      }
      return acc + mol * gbar;
    }, 0.0);
    return Number.isFinite(total) ? total : null;
  };

  const hbarSum = (list) => {
    if (!Array.isArray(list) || !list.length) {
      return null;
    }
    const total = list.reduce((acc, item) => {
      const mol = Number.isFinite(item?.mol) ? item.mol : Number(item?.mol);
      const hbar = Number.isFinite(item?.hbar_kJ_per_kmol)
        ? item.hbar_kJ_per_kmol
        : Number(item?.hbar_kJ_per_kmol);
      if (!Number.isFinite(mol) || !Number.isFinite(hbar)) {
        return acc;
      }
      return acc + mol * hbar;
    }, 0.0);
    return Number.isFinite(total) ? total : null;
  };

  const hbarFSum = (list) => {
    if (!Array.isArray(list) || !list.length) {
      return null;
    }
    const total = list.reduce((acc, item) => {
      const mol = Number.isFinite(item?.mol) ? item.mol : Number(item?.mol);
      const hbarF = Number.isFinite(item?.hbar_f_kJ_per_kmol)
        ? item.hbar_f_kJ_per_kmol
        : Number(item?.hbar_f_kJ_per_kmol);
      if (!Number.isFinite(mol) || !Number.isFinite(hbarF)) {
        return acc;
      }
      return acc + mol * hbarF;
    }, 0.0);
    return Number.isFinite(total) ? total : null;
  };

  const hbarSSum = (list) => {
    if (!Array.isArray(list) || !list.length) {
      return null;
    }
    const total = list.reduce((acc, item) => {
      const mol = Number.isFinite(item?.mol) ? item.mol : Number(item?.mol);
      const hbarS = Number.isFinite(item?.hbar_s_kJ_per_kmol)
        ? item.hbar_s_kJ_per_kmol
        : Number(item?.hbar_s_kJ_per_kmol);
      if (!Number.isFinite(mol) || !Number.isFinite(hbarS)) {
        return acc;
      }
      return acc + mol * hbarS;
    }, 0.0);
    return Number.isFinite(total) ? total : null;
  };

  const sbarSum = (list) => {
    if (!Array.isArray(list) || !list.length) {
      return null;
    }
    const total = list.reduce((acc, item) => {
      const mol = Number.isFinite(item?.mol) ? item.mol : Number(item?.mol);
      const sbar = Number.isFinite(item?.sbar_kJ_per_kmol_k)
        ? item.sbar_kJ_per_kmol_k
        : Number(item?.sbar_kJ_per_kmol_k);
      if (!Number.isFinite(mol) || !Number.isFinite(sbar)) {
        return acc;
      }
      return acc + mol * sbar;
    }, 0.0);
    return Number.isFinite(total) ? total : null;
  };

  const sbarISum = (list) => {
    if (!Array.isArray(list) || !list.length) {
      return null;
    }
    const total = list.reduce((acc, item) => {
      const mol = Number.isFinite(item?.mol) ? item.mol : Number(item?.mol);
      const sbarI = Number.isFinite(item?.sbar_i_kJ_per_kmol_k)
        ? item.sbar_i_kJ_per_kmol_k
        : Number(item?.sbar_i_kJ_per_kmol_k);
      if (!Number.isFinite(mol) || !Number.isFinite(sbarI)) {
        return acc;
      }
      return acc + mol * sbarI;
    }, 0.0);
    return Number.isFinite(total) ? total : null;
  };

  const gfoSum = (list) => {
    if (!Array.isArray(list) || !list.length) {
      return null;
    }
    const total = list.reduce((acc, item) => {
      const mol = Number.isFinite(item?.mol) ? item.mol : Number(item?.mol);
      const gfo = Number.isFinite(item?.gfo_kJ_per_kmol)
        ? item.gfo_kJ_per_kmol
        : Number(item?.gfo_kJ_per_kmol);
      if (!Number.isFinite(mol) || !Number.isFinite(gfo)) {
        return acc;
      }
      return acc + mol * gfo;
    }, 0.0);
    return Number.isFinite(total) ? total : null;
  };

  const gElementsSum = (list) => {
    if (!Array.isArray(list) || !list.length) {
      return null;
    }
    const total = list.reduce((acc, item) => {
      const mol = Number.isFinite(item?.mol) ? item.mol : Number(item?.mol);
      const gElements = Number.isFinite(item?.g_elements_kJ_per_kmol)
        ? item.g_elements_kJ_per_kmol
        : Number(item?.g_elements_kJ_per_kmol);
      if (!Number.isFinite(mol) || !Number.isFinite(gElements)) {
        return acc;
      }
      return acc + mol * gElements;
    }, 0.0);
    return Number.isFinite(total) ? total : null;
  };

  const renderTableGroup = (tables, tempK, active, onChange, options = {}) => {
    if (!tables) {
      return null;
    }
    const massTitle = options.massTitle ?? tables.mass.title;
    const compositionTitle = options.compositionTitle ?? tables.composition.title;
    const thermoTitle = options.thermoTitle ?? tables.thermo.title;
    const thermoNotes = options.thermoNotes ?? {};
    const thermoTab = options.thermoTab ?? "h";
    const onThermoTabChange = options.onThermoTabChange ?? (() => {});
    const keyMap = options.keyMap ?? null;
    const gElementsLabel = options.gElementsLabel ?? "g_elements";
    const gElementsKey = `${gElementsLabel} (kJ/kmol)`;
    const gElementsWeightedKey = `n_i ${gElementsLabel} (kJ)`;

    const buildThermoTable = (columns, sumColumns, avgColumns, rowTransform) => {
      const baseTable = {
        title: thermoTitle,
        table: {
          columns,
          rows: rowTransform ? tables.thermo.table.rows.map(rowTransform) : tables.thermo.table.rows,
          sumColumns,
          avgColumns
        }
      };
      return {
        ...baseTable,
        table: remapTableKeys(baseTable.table, keyMap)
      };
    };

    const gColumns = THERMO_G_COLUMNS.map((col) => {
      if (col === "g_elements (kJ/kmol)") {
        return gElementsKey;
      }
      if (col === "n_i g_elements (kJ)") {
        return gElementsWeightedKey;
      }
      return col;
    });
    const gSumColumns = THERMO_G_SUM_COLUMNS.map((col) => {
      if (col === "n_i g_elements (kJ)") {
        return gElementsWeightedKey;
      }
      return col;
    });

    const thermoTables = {
      h: buildThermoTable(THERMO_H_COLUMNS, THERMO_H_SUM_COLUMNS, THERMO_CP_AVG_COLUMNS),
      s: buildThermoTable(THERMO_S_COLUMNS, THERMO_S_SUM_COLUMNS, THERMO_CP_AVG_COLUMNS),
      g: buildThermoTable(gColumns, gSumColumns, THERMO_CP_AVG_COLUMNS, (row) => {
        if (!row || typeof row !== "object") {
          return row;
        }
        const updates = {};
        if ("g_elements (kJ/kmol)" in row) {
          updates[gElementsKey] = row["g_elements (kJ/kmol)"];
        }
        if ("n_i g_elements (kJ)" in row) {
          updates[gElementsWeightedKey] = row["n_i g_elements (kJ)"];
        }
        if (!Object.keys(updates).length) {
          return row;
        }
        const { ["g_elements (kJ/kmol)"]: _, ["n_i g_elements (kJ)"]: __, ...rest } = row;
        return { ...rest, ...updates };
      })
    };
    const massTable = remapTableKeys(tables.mass.table, keyMap);
    const compositionTable = remapTableKeys(tables.composition.table, keyMap);

    return (
      <>
        <Tabs
          tabs={tableTabs}
          activeTab={active}
          onTabChange={onChange}
          className="tabs-sub"
        />
        {active === "mass" ? (
          <TableView
            title={tempK === null ? massTitle : `${massTitle} (T = ${Number(tempK ?? 0).toFixed(2)} K)`}
            table={massTable}
            enableSort
          />
        ) : null}
        {active === "composition" ? (
          <TableView
            title={tempK === null ? compositionTitle : `${compositionTitle} (T = ${Number(tempK ?? 0).toFixed(2)} K)`}
            table={compositionTable}
            enableSort
          />
        ) : null}
        {active === "thermo" ? (
          <>
            <Tabs
              tabs={thermoTabs}
              activeTab={thermoTab}
              onTabChange={onThermoTabChange}
              className="tabs-sub"
            />
            <TableView
              title={tempK === null ? thermoTitle : `${thermoTitle} (T = ${Number(tempK ?? 0).toFixed(2)} K)`}
              table={thermoTables[thermoTab]?.table}
              enableSort
            />
            {thermoNotes[thermoTab] ? (
              <div className="plot-caption">{thermoNotes[thermoTab]}</div>
            ) : null}
          </>
        ) : null}
      </>
    );
  };

  return (
    <section className="analysis-tab">
      <div className="section-header">
        <h3>Fuel-Air Combustion Analysis</h3>
        <p>
          Run the combustion prototype in the browser. Select a fuel, set the mixture input basis,
          and compute products and equivalence ratio. Equilibrium (dissociation) mode requires Cantera on the backend.
          This combustion module is standalone and does not yet drive turbojet performance outputs.
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
          <div className="plot-caption">General derivation (static)</div>
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
                <span className="analysis-input-label">Chemistry model</span>
                <select value={inputs.mode} onChange={handleChange("mode")}>
                  {MODE_OPTIONS.map((mode) => (
                    <option key={mode.value} value={mode.value}>
                      {mode.label}
                    </option>
                  ))}
                </select>
                <div className="analysis-input-hint">
                  {chemistryDescriptionFor(inputs.mode)}
                </div>
              </label>
              <label className="analysis-input-field">
                <span className="analysis-input-label">Temperature mode</span>
                <select value={inputs.temp_mode} onChange={handleChange("temp_mode")}>
                  {TEMP_MODE_OPTIONS.map((mode) => (
                    <option key={mode.value} value={mode.value}>
                      {mode.label}
                    </option>
                  ))}
                </select>
                <div className="analysis-input-hint">
                  {temperatureDescriptionFor(inputs.temp_mode)}
                </div>
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
                <span className="analysis-input-label">Mixture input mode</span>
                <select value={inputs.mixture_input_mode} onChange={handleMixtureModeChange}>
                  <option value="f">Fuel-air ratio (f)</option>
                  <option value="phi">Equivalence ratio (phi)</option>
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
                <div className="analysis-input-hint">Reference temperature for heating value evaluation.</div>
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
                  onChange={handleFChange}
                  disabled={inputs.mixture_input_mode === "phi"}
                />
                <span className="analysis-input-hint">
                  {Number.isFinite(phiFromF) ? (
                    <>
                      <LatexText latex={String.raw`\phi`} />
                      <span>{` = ${Number(phiFromF).toFixed(4)} (from this f input)`}</span>
                    </>
                  ) : (
                    <>
                      <LatexText latex={String.raw`\phi`} />
                      <span> = --</span>
                    </>
                  )}
                </span>
                {Number.isFinite(simF) ? (
                  <span className="analysis-input-hint">
                    <LatexText latex={String.raw`f_{sim} = ${Number(simF).toFixed(4)}`} />
                    <span> (from the turbojet simulation, not the combustion input)</span>
                  </span>
                ) : null}
              </label>
              <label className="analysis-input-field">
                <span className="analysis-input-label">
                  <LatexText latex={String.raw`\phi`} />
                  <span className="analysis-input-unit">(D.L.)</span>
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.0001"
                  value={inputs.phi_input ?? ""}
                  onChange={handlePhiChange}
                  disabled={inputs.mixture_input_mode === "f"}
                />
                <span className="analysis-input-hint">
                  {Number.isFinite(fFromPhi)
                    ? `f = ${Number(fFromPhi).toFixed(5)}`
                    : "f = --"}
                </span>
              </label>
              <label className="analysis-input-field">
                <span className="analysis-input-label">
                  <LatexText
                    latex={analysisMode === "adiabatic" ? String.raw`T_{prod,desired}` : String.raw`T_{prod}`}
                  />
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
                  <LatexText latex={String.raw`T_{fuel}`} />
                  <span className="analysis-input-unit">(K)</span>
                </span>
                <input
                  type="number"
                  min="200"
                  step="10"
                  value={inputs.t_fuel_k}
                  onChange={handleChange("t_fuel_k")}
                />
              </label>
              <label className="analysis-input-field">
                <span className="analysis-input-label">
                  <LatexText latex={String.raw`T_{air}`} />
                  <span className="analysis-input-unit">(K)</span>
                </span>
                <input
                  type="number"
                  min="200"
                  step="10"
                  value={inputs.t_air_k}
                  onChange={handleChange("t_air_k")}
                />
              </label>
              <label className="analysis-input-field">
                <span className="analysis-input-label">
                  <LatexText latex={String.raw`P`} />
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
              { key: "xi-map", label: (<span><LatexText latex={String.raw`X_i`} /> Map</span>) },
              { key: "dissociation", label: "Dissociation Diagnostics" }
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
                    {data.result.mechanism.note || "Equilibrium (dissociation) and heating value results are approximate."}
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
                    <div className="analysis-output-label">Mixture input</div>
                    <div>
                      {data?.inputs?.mixture_input_mode === "phi"
                        ? <LatexText latex={String.raw`\phi`} />
                        : <LatexText latex={String.raw`f`} />}
                    </div>
                  </div>
                  <div>
                    <div className="analysis-output-label"><LatexText latex={String.raw`f_{\ \ used}`} /></div>
                    <div>{Number.isFinite(data?.inputs?.f_used) ? data.inputs.f_used.toFixed(5) : "--"}</div>
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
                    <div className="analysis-output-label"><LatexText latex={String.raw`f_{st}`} /></div>
                    <div>{Number.isFinite(data?.inputs?.f_st) ? data.inputs.f_st.toFixed(5) : "--"}</div>
                  </div>
                  <div>
                    <div className="analysis-output-label">Model</div>
                    <div>{modelSummaryLabel || "--"}</div>
                  </div>
                  <div>
                    <div className="analysis-output-label">
                      <LatexText latex={String.raw`T_{prod,desired}`} />
                    </div>
                    <div>
                      {Number.isFinite(analysis?.desired_t_prod_k)
                        ? `${analysis.desired_t_prod_k.toFixed(2)} K`
                        : "--"}
                    </div>
                  </div>
                  <div>
                    <div className="analysis-output-label">
                      <LatexText latex={String.raw`T_{ad}`} />
                    </div>
                    <div>
                      {Number.isFinite(analysis?.solved_t_ad_k)
                        ? `${analysis.solved_t_ad_k.toFixed(2)} K`
                        : "--"}
                    </div>
                  </div>
                  <div>
                    <div className="analysis-output-label">
                      <LatexText latex={String.raw`\Delta T`} />
                    </div>
                    <div>
                      {Number.isFinite(analysis?.delta_t_k)
                        ? `${analysis.delta_t_k.toFixed(2)} K`
                        : "--"}
                    </div>
                  </div>
                  <div>
                    <div className="analysis-output-label">
                      <LatexText latex={String.raw`H_{react}`} />
                    </div>
                    <div>
                      {Number.isFinite(analysis?.h_react_kj)
                        ? `${analysis.h_react_kj.toFixed(2)} kJ`
                        : "--"}
                    </div>
                  </div>
                  <div>
                    <div className="analysis-output-label">
                      <LatexText latex={String.raw`H_{prod}`} />
                    </div>
                    <div>
                      {Number.isFinite(analysis?.h_prod_kj)
                        ? `${analysis.h_prod_kj.toFixed(2)} kJ`
                        : "--"}
                    </div>
                  </div>
                  <div>
                    <div className="analysis-output-label">
                      <LatexText latex={String.raw`\Delta H`} />
                    </div>
                    <div>
                      {Number.isFinite(analysis?.delta_h_kj)
                        ? `${analysis.delta_h_kj.toFixed(2)} kJ`
                        : "--"}
                    </div>
                  </div>
                  <div>
                    <div className="analysis-output-label">
                      <LatexText latex={String.raw`S_{prod}^{\circ}`} />
                    </div>
                    <div>
                      {Number.isFinite(analysis?.s_prod_std_kj_per_k)
                        ? `${analysis.s_prod_std_kj_per_k.toFixed(2)} kJ/K`
                        : "--"}
                    </div>
                  </div>
                  <div>
                    <div className="analysis-output-label">
                      <LatexText latex={String.raw`S_{prod}`} />
                    </div>
                    <div>
                      {Number.isFinite(analysis?.s_prod_mix_kj_per_k)
                        ? `${analysis.s_prod_mix_kj_per_k.toFixed(2)} kJ/K`
                        : "--"}
                    </div>
                  </div>
                  <div>
                    <div className="analysis-output-label">
                      <LatexText latex={String.raw`G_{prod}^{\circ}`} />
                    </div>
                    <div>
                      {Number.isFinite(analysis?.g_prod_std_kj)
                        ? `${analysis.g_prod_std_kj.toFixed(2)} kJ`
                        : "--"}
                    </div>
                  </div>
                  <div>
                    <div className="analysis-output-label">
                      <LatexText latex={String.raw`\varepsilon_H`} />
                    </div>
                    <div>
                      {Number.isFinite(analysis?.delta_h_normalized)
                        ? analysis.delta_h_normalized.toExponential(3)
                        : "--"}
                    </div>
                  </div>
                  {analysisMode === "adiabatic" ? (
                    <div>
                      <div className="analysis-output-label">Converged</div>
                      <div>{analysis?.converged === true ? "Yes" : analysis?.converged === false ? "No" : "--"}</div>
                    </div>
                  ) : null}
                  {analysisMode === "adiabatic" ? (
                    <div>
                      <div className="analysis-output-label">Iterations</div>
                      <div>{Number.isFinite(analysis?.iterations) ? analysis.iterations : "--"}</div>
                    </div>
                  ) : null}
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
                      <div className="analysis-input-hint">
                        Reaction count = number of elementary reactions in the mechanism (not the overall combustion reaction).
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
              {analysis?.note ? (
                <div className="analysis-output-panel">
                  <h5>Temperature solve note</h5>
                  <p className="plot-caption">{analysis.note}</p>
                </div>
              ) : null}

              {renderTableGroup(
                reactantsTables,
                null,
                reactantsTableTab,
                setReactantsTableTab,
                {
                  thermoTitle: reactantsTables?.thermo?.title,
                  compositionTitle: "Reactants - X/Y/P",
                  thermoNotes: {
                    h: (
                      <>
                        <div className="equation-note-line">
                          <LatexText
                            latex={String.raw`\bar{h}_{s,j}(T_j)=\bar{h}_j(T_j)-\bar{h}_j(T_{ref})=\int_{T_{ref}}^{T_j} \bar{c}_{p,j}(T)\,dT`}
                          />
                        </div>
                        <div className="equation-note-line">
                          <LatexText
                            latex={String.raw`\bar{h}_j(T_j)=\bar{h}_j(T_{ref})+\int_{T_{ref}}^{T_j} \bar{c}_{p,j}(T)\,dT`}
                          />
                        </div>
                        <div className="equation-note-line">
                          <LatexText
                            latex={String.raw`\frac{dE_{cv}}{dt}=\dot Q-\dot W+\sum_{in}\dot m\left(h+\frac{V^2}{2}+gz\right)-\sum_{out}\dot m\left(h+\frac{V^2}{2}+gz\right)`}
                          />
                        </div>
                        <div className="equation-note-line">
                          <LatexText latex={String.raw`\text{steady},\ \dot W\approx0,\ \dot Q\approx0,\ \Delta KE\approx0,\ \Delta PE\approx0\ \Rightarrow\ \sum_{in}\dot m h=\sum_{out}\dot m h`} />
                        </div>
                        <div className="equation-note-line">
                          <LatexText
                            latex={String.raw`H_{\mathrm{react}}=\sum_{j \in R} n_j\,\bar{h}_j(T_j)`}
                          />
                        </div>
                        <div className="equation-note-line">
                          <LatexText
                            latex={analysisMode === "adiabatic"
                              ? String.raw`H_{\mathrm{react}}=H_{\mathrm{prod}}(T_{ad})`
                              : String.raw`H_{\mathrm{prod}}(T_{\mathrm{prod}})=\sum_{i \in P} n_i\,\bar{h}_i(T_{\mathrm{prod}})`}
                          />
                        </div>
                        {Number.isFinite(hbarSum(data?.result?.reactants)) ? (
                          <div className="equation-note-line">
                            <LatexText latex={String.raw`H_{\mathrm{react}}=\sum_{j \in R} n_j\,\bar{h}_j(T_j)`} />
                            <span>{` = ${hbarSum(data?.result?.reactants)?.toFixed(2)} kJ`}</span>
                          </div>
                        ) : null}
                        {Number.isFinite(hbarFSum(data?.result?.reactants)) ? (
                          <div className="equation-note-line">
                            <LatexText latex={String.raw`H_{f,\mathrm{react}}^{\circ}=\sum_{j \in R} n_j\,\Delta \bar{h}_{f,j}^{\circ}(T_j)`} />
                            <span>{` = ${hbarFSum(data?.result?.reactants)?.toFixed(2)} kJ`}</span>
                          </div>
                        ) : null}
                        {Number.isFinite(hbarSSum(data?.result?.reactants)) ? (
                          <div className="equation-note-line">
                            <LatexText latex={String.raw`H_{s,\mathrm{react}}=\sum_{j \in R} n_j\,\bar{h}_{s,j}(T_j)`} />
                            <span>{` = ${hbarSSum(data?.result?.reactants)?.toFixed(2)} kJ`}</span>
                          </div>
                        ) : null}
                        {Number.isFinite(analysis?.delta_h_kj) ? (
                          <div className="equation-note-line">
                            <LatexText
                              latex={analysisMode === "adiabatic"
                                ? String.raw`\Delta H_{ad}=H_{\mathrm{prod}}(T_{ad})-H_{\mathrm{react}}`
                                : String.raw`\Delta H_{\mathrm{desired}}=H_{\mathrm{prod}}(T_{\mathrm{prod}})-H_{\mathrm{react}}`}
                            />
                            <span>{` = ${analysis.delta_h_kj.toFixed(2)} kJ`}</span>
                          </div>
                        ) : null}
                        {Number.isFinite(analysis?.delta_h_normalized) ? (
                          <div className="equation-note-line">
                            <LatexText latex={String.raw`\varepsilon_H=\frac{\Delta H}{\max(|H_{\mathrm{react}}|,1)}` } />
                            <span>{` = ${analysis.delta_h_normalized.toExponential(3)}`}</span>
                          </div>
                        ) : null}
                        <div className="equation-note-line">
                          <LatexText
                            latex={String.raw`(T_{ref}=${Number(data?.inputs?.hv_ref_t_k ?? 0).toFixed(2)}\ \mathrm{K};\ T_j=T_{\mathrm{fuel}}\ \text{for fuel species},\ T_j=T_{\mathrm{air}}\ \text{for air species})`}
                          />
                        </div>
                        <div className="equation-note-line">
                          Totals shown are weighted sums {" "}
                          <LatexText latex={String.raw`\sum n_j\,\bar{h}_j`} /> in kJ.
                        </div>
                      </>
                    ),
                    s: (
                      <>
                        <div className="equation-note-line">
                          <LatexText
                            latex={String.raw`\bar{s}_{s,j}(T_j)=\int_{T_{ref}}^{T_j} \frac{\bar{c}_{p,j}(T)}{T}\,dT`}
                          />
                        </div>
                        <div className="equation-note-line">
                          <LatexText
                            latex={String.raw`\bar{s}_j(T_j)=\bar{s}_j(T_{ref})+\int_{T_{ref}}^{T_j} \frac{\bar{c}_{p,j}(T)}{T}\,dT`}
                          />
                        </div>
                        <div className="equation-note-line">
                          <LatexText
                            latex={String.raw`\bar{s}_j^{\circ}(T_j)=\bar{s}_j^{\circ}(T_{ref})+\int_{T_{ref}}^{T_j} \frac{\bar{c}_{p,j}^{\circ}(T)}{T}\,dT`}
                          />
                        </div>
                        <div className="equation-note-line">
                          <LatexText
                            latex={String.raw`\bar{s}_j(T_j,P_j)=\bar{s}_j(T_{ref})+\int_{T_{ref}}^{T_j} \frac{\bar{c}_{p,j}(T)}{T}\,dT-R_u\ln\left(\frac{P_j}{P^{\circ}}\right),\quad P_j=X_j P`}
                          />
                        </div>
                        <div className="equation-note-line">
                          <LatexText
                            latex={String.raw`\frac{dS_{cv}}{dt}=\sum_k\frac{\dot Q_k}{T_k}+\sum_{in}\dot m s-\sum_{out}\dot m s+\dot S_{\mathrm{gen}}`}
                          />
                        </div>
                        <div className="equation-note-line">
                          <LatexText latex={String.raw`\text{steady},\ \dot Q\approx0\ \Rightarrow\ \sum_{out}\dot m s-\sum_{in}\dot m s=\dot S_{\mathrm{gen}}\ge0`} />
                        </div>
                        <div className="equation-note-line">
                          <LatexText
                            latex={String.raw`S_{\mathrm{react}}^{\circ}=\sum_{j \in R} n_j\,\bar{s}_j^{\circ}(T_j)`}
                          />
                        </div>
                        {Number.isFinite(sbarSum(data?.result?.reactants)) ? (
                          <div className="equation-note-line">
                            <LatexText latex={String.raw`S_{\mathrm{react}}^{\circ}=\sum_{j \in R} n_j\,\bar{s}_j^{\circ}(T_j)`} />
                            <span>{` = ${sbarSum(data?.result?.reactants)?.toFixed(2)} kJ/K`}</span>
                          </div>
                        ) : null}
                        {Number.isFinite(sbarISum(data?.result?.reactants)) ? (
                          <div className="equation-note-line">
                            <LatexText latex={String.raw`S_{\mathrm{react}}=\sum_{j \in R} n_j\,\bar{s}_j(T_j,P_j)`} />
                            <span>{` = ${sbarISum(data?.result?.reactants)?.toFixed(2)} kJ/K`}</span>
                          </div>
                        ) : null}
                        <div className="equation-note-line">
                          <LatexText
                            latex={String.raw`(T_{ref}=${Number(data?.inputs?.hv_ref_t_k ?? 0).toFixed(2)}\ \mathrm{K};\ T_j=T_{\mathrm{fuel}}\ \text{for fuel species},\ T_j=T_{\mathrm{air}}\ \text{for air species})`}
                          />
                        </div>
                        <div className="equation-note-line">Evaluated using temperature-dependent c_p(T) (NASA polynomials via Cantera), not constant c_p.</div>
                        <div className="equation-note-line">
                          <LatexText latex={String.raw`S^\circ`} />
                          <span> uses standard-state values; </span>
                          <LatexText latex={String.raw`S`} />
                          <span> includes the pressure correction.</span>
                        </div>
                      </>
                    ),
                    g: (
                      <>
                        <div className="equation-note-line">
                          <LatexText latex={String.raw`A=U-TS`} />
                        </div>
                        <div className="equation-note-line">
                          <LatexText latex={String.raw`G=A+PV=H-TS`} />
                        </div>
                        <div className="equation-note-line">
                          <LatexText latex={String.raw`dG=-S\,dT+V\,dP+\sum_{j \in R} \mu_j\,dn_j;\ T,P\ \text{const} \Rightarrow \min G`} />
                        </div>
                        <div className="equation-note-line">
                          <LatexText
                            latex={String.raw`\Delta \bar{g}_{f,j}^{\circ}(T_j)=\bar{g}_j^{\circ}(T_j)-\sum_k a_{jk}\,\bar{g}_{k,\mathrm{el}}^{\circ}(T_j)`}
                          />
                        </div>
                        <div className="equation-note-line">
                          <LatexText
                            latex={String.raw`G_{\mathrm{react}}^{\circ}=\sum_{j \in R} n_j\,\bar{g}_j^{\circ}(T_j)=\sum_{j \in R} n_j\,\Delta \bar{g}_{f,j}^{\circ}(T_j)+\sum_{j \in R} n_j\sum_k a_{jk}\,\bar{g}_{k,\mathrm{el}}^{\circ}(T_j)`}
                          />
                        </div>
                        {Number.isFinite(gbarSum(data?.result?.reactants)) ? (
                          <div className="equation-note-line">
                            <LatexText latex={String.raw`G_{\mathrm{react}}^{\circ}=\sum_{j \in R} n_j\,\bar{g}_j^{\circ}(T_j)`} />
                            <span>{` = ${gbarSum(data?.result?.reactants)?.toFixed(2)} kJ`}</span>
                          </div>
                        ) : null}
                        {Number.isFinite(gfoSum(data?.result?.reactants)) ? (
                          <div className="equation-note-line">
                            <LatexText latex={String.raw`G_{f,\mathrm{react}}^{\circ}=\sum_{j \in R} n_j\,\Delta \bar{g}_{f,j}^{\circ}(T_j)`} />
                            <span>{` = ${gfoSum(data?.result?.reactants)?.toFixed(2)} kJ`}</span>
                          </div>
                        ) : null}
                        {Number.isFinite(gElementsSum(data?.result?.reactants)) ? (
                          <div className="equation-note-line">
                            <LatexText latex={String.raw`G_{\mathrm{el,react}}^{\circ}=\sum_{j \in R} n_j\sum_k a_{jk}\,\bar{g}_{k,\mathrm{el}}^{\circ}(T_j)`} />
                            <span>{` = ${gElementsSum(data?.result?.reactants)?.toFixed(2)} kJ`}</span>
                          </div>
                        ) : null}
                        <div className="equation-note-line">
                          <LatexText
                            latex={String.raw`(T_{ref}=${Number(data?.inputs?.hv_ref_t_k ?? 0).toFixed(2)}\ \mathrm{K};\ T_j=T_{\mathrm{fuel}}\ \text{for fuel species},\ T_j=T_{\mathrm{air}}\ \text{for air species})`}
                          />
                        </div>
                        <div className="equation-note-line">Evaluated using temperature-dependent c_p(T) (NASA polynomials via Cantera), not constant c_p.</div>
                        <div className="equation-note-line">
                          <LatexText latex={String.raw`G^\circ`} />
                          <span> is standard-state Gibbs; it is not conserved and is used for equilibrium interpretation.</span>
                        </div>
                      </>
                    )
                  },
                  keyMap: REACTANT_COLUMN_KEY_MAP,
                  thermoTab: reactantsThermoTab,
                  onThermoTabChange: setReactantsThermoTab
                }
              )}
              {data?.mode === "dissociation"
                ? renderTableGroup(
                    idealProductsTables,
                    data?.inputs?.t_prod_k,
                    idealProductsTableTab,
                    setIdealProductsTableTab,
                    {
                      thermoNotes: {
                        h: (
                          <>
                            <div className="equation-note-line">
                              <LatexText
                                latex={String.raw`\bar{h}_{s,i}(T)=\bar{h}_i(T)-\bar{h}_i(T_{ref})=\int_{T_{ref}}^{T} \bar{c}_{p,i}(T)\,dT`}
                              />
                            </div>
                            <div className="equation-note-line">
                              <LatexText
                                latex={String.raw`\bar{h}_i(T)=\bar{h}_i(T_{ref})+\int_{T_{ref}}^{T} \bar{c}_{p,i}(T)\,dT`}
                              />
                            </div>
                            <div className="equation-note-line">
                              <LatexText
                                latex={String.raw`\frac{dE_{cv}}{dt}=\dot Q-\dot W+\sum_{in}\dot m\left(h+\frac{V^2}{2}+gz\right)-\sum_{out}\dot m\left(h+\frac{V^2}{2}+gz\right)`}
                              />
                            </div>
                            <div className="equation-note-line">
                              <LatexText latex={String.raw`\text{steady},\ \dot W\approx0,\ \dot Q\approx0,\ \Delta KE\approx0,\ \Delta PE\approx0\ \Rightarrow\ \sum_{in}\dot m h=\sum_{out}\dot m h`} />
                            </div>
                            <div className="equation-note-line">
                              <LatexText
                                latex={analysisMode === "adiabatic"
                                  ? String.raw`H_{\mathrm{prod}}=\sum_i n_i\,\bar{h}_i(T_{ad})`
                                  : String.raw`H_{\mathrm{prod}}=\sum_i n_i\,\bar{h}_i(T_{\mathrm{prod}})`}
                              />
                            </div>
                            {Number.isFinite(hbarSum(data?.result?.ideal_products_list)) ? (
                              <div className="equation-note-line">
                                <LatexText
                                  latex={analysisMode === "adiabatic"
                                    ? String.raw`H_{\mathrm{prod}}=\sum_i n_i\,\bar{h}_i(T_{ad})`
                                    : String.raw`H_{\mathrm{prod}}=\sum_i n_i\,\bar{h}_i(T_{\mathrm{prod}})`}
                                />
                                <span>{` = ${hbarSum(data?.result?.ideal_products_list)?.toFixed(2)} kJ`}</span>
                              </div>
                            ) : null}
                            {Number.isFinite(hbarFSum(data?.result?.ideal_products_list)) ? (
                              <div className="equation-note-line">
                                <LatexText latex={String.raw`H_{f,\mathrm{prod}}^{\circ}=\sum_i n_i\,\Delta \bar{h}_{f,i}^{\circ}(T_{\mathrm{prod}})`} />
                                <span>{` = ${hbarFSum(data?.result?.ideal_products_list)?.toFixed(2)} kJ`}</span>
                              </div>
                            ) : null}
                            {Number.isFinite(hbarSSum(data?.result?.ideal_products_list)) ? (
                              <div className="equation-note-line">
                                <LatexText latex={String.raw`H_{s,\mathrm{prod}}=\sum_i n_i\,\bar{h}_{s,i}(T_{\mathrm{prod}})`} />
                                <span>{` = ${hbarSSum(data?.result?.ideal_products_list)?.toFixed(2)} kJ`}</span>
                              </div>
                            ) : null}
                            {Number.isFinite(analysis?.delta_h_kj) ? (
                              <div className="equation-note-line">
                                <LatexText
                                  latex={analysisMode === "adiabatic"
                                    ? String.raw`\Delta H_{ad}=H_{\mathrm{prod}}(T_{ad})-H_{\mathrm{react}}`
                                    : String.raw`\Delta H_{\mathrm{desired}}=H_{\mathrm{prod}}(T_{\mathrm{prod}})-H_{\mathrm{react}}`}
                                />
                                <span>{` = ${analysis.delta_h_kj.toFixed(2)} kJ`}</span>
                              </div>
                            ) : null}
                            {Number.isFinite(analysis?.delta_h_normalized) ? (
                              <div className="equation-note-line">
                                <LatexText latex={String.raw`\varepsilon_H=\frac{\Delta H}{\max(|H_{\mathrm{react}}|,1)}` } />
                                <span>{` = ${analysis.delta_h_normalized.toExponential(3)}`}</span>
                              </div>
                            ) : null}
                            <div className="equation-note-line">
                              <LatexText
                                latex={analysisMode === "adiabatic"
                                  ? String.raw`(T_{ref}=${Number(data?.inputs?.hv_ref_t_k ?? 0).toFixed(2)}\ \mathrm{K};\ T=T_{ad})`
                                  : String.raw`(T_{ref}=${Number(data?.inputs?.hv_ref_t_k ?? 0).toFixed(2)}\ \mathrm{K};\ T=T_{\mathrm{prod}})`}
                              />
                            </div>
                            <div className="equation-note-line">Evaluated using temperature-dependent c_p(T) (NASA polynomials via Cantera), not constant c_p.</div>
                            <div className="equation-note-line">
                              <LatexText latex={String.raw`G^\circ`} />
                              <span> is standard-state Gibbs; it is not conserved and is used for equilibrium interpretation.</span>
                            </div>
                            <div className="equation-note-line">
                              Totals shown are weighted sums <LatexText latex={String.raw`\sum n_i\,\bar{h}_i`} /> in kJ.
                            </div>
                          </>
                        ),
                        s: (
                          <>
                            <div className="equation-note-line">
                              <LatexText
                                latex={analysisMode === "adiabatic"
                                  ? String.raw`\bar{s}_{s,i}(T_{ad})=\int_{T_{ref}}^{T_{ad}} \frac{\bar{c}_{p,i}(T)}{T}\,dT`
                                  : String.raw`\bar{s}_{s,i}(T_{\mathrm{prod}})=\int_{T_{ref}}^{T_{\mathrm{prod}}} \frac{\bar{c}_{p,i}(T)}{T}\,dT`}
                              />
                            </div>
                            <div className="equation-note-line">
                              <LatexText
                                latex={analysisMode === "adiabatic"
                                  ? String.raw`\bar{s}_i(T_{ad})=\bar{s}_i(T_{ref})+\int_{T_{ref}}^{T_{ad}} \frac{\bar{c}_{p,i}(T)}{T}\,dT`
                                  : String.raw`\bar{s}_i(T_{\mathrm{prod}})=\bar{s}_i(T_{ref})+\int_{T_{ref}}^{T_{\mathrm{prod}}} \frac{\bar{c}_{p,i}(T)}{T}\,dT`}
                              />
                            </div>
                            <div className="equation-note-line">
                              <LatexText
                                latex={analysisMode === "adiabatic"
                                  ? String.raw`\bar{s}_i^{\circ}(T_{ad})=\bar{s}_i^{\circ}(T_{ref})+\int_{T_{ref}}^{T_{ad}} \frac{\bar{c}_{p,i}(T)}{T}\,dT`
                                  : String.raw`\bar{s}_i^{\circ}(T_{\mathrm{prod}})=\bar{s}_i^{\circ}(T_{ref})+\int_{T_{ref}}^{T_{\mathrm{prod}}} \frac{\bar{c}_{p,i}(T)}{T}\,dT`}
                              />
                            </div>
                            <div className="equation-note-line">
                              <LatexText
                                latex={analysisMode === "adiabatic"
                                  ? String.raw`\bar{s}_i(T_{ad},P_i)=\bar{s}_i(T_{ref})+\int_{T_{ref}}^{T_{ad}} \frac{\bar{c}_{p,i}(T)}{T}\,dT-\bar{R}_u\ln\left(\frac{P_i}{P^{\circ}}\right),\quad P_i=y_i P`
                                  : String.raw`\bar{s}_i(T_{\mathrm{prod}},P_i)=\bar{s}_i(T_{ref})+\int_{T_{ref}}^{T_{\mathrm{prod}}} \frac{\bar{c}_{p,i}(T)}{T}\,dT-\bar{R}_u\ln\left(\frac{P_i}{P^{\circ}}\right),\quad P_i=y_i P`}
                              />
                            </div>
                            <div className="equation-note-line">
                              <LatexText
                                latex={String.raw`\frac{dS_{cv}}{dt}=\sum_k\frac{\dot Q_k}{T_k}+\sum_{in}\dot m s-\sum_{out}\dot m s+\dot S_{\mathrm{gen}}`}
                              />
                            </div>
                            <div className="equation-note-line">
                              <LatexText latex={String.raw`\text{steady},\ \dot Q\approx0\ \Rightarrow\ \sum_{out}\dot m s-\sum_{in}\dot m s=\dot S_{\mathrm{gen}}\ge0`} />
                            </div>
                            <div className="equation-note-line">
                              <LatexText
                                latex={analysisMode === "adiabatic"
                                  ? String.raw`S_{\mathrm{prod}}^{\circ}=\sum_i n_i\,\bar{s}_i^{\circ}(T_{ad})`
                                  : String.raw`S_{\mathrm{prod}}^{\circ}=\sum_i n_i\,\bar{s}_i^{\circ}(T_{\mathrm{prod}})`}
                              />
                            </div>
                            {Number.isFinite(sbarSum(data?.result?.ideal_products_list)) ? (
                              <div className="equation-note-line">
                                <LatexText
                                  latex={analysisMode === "adiabatic"
                                    ? String.raw`S_{\mathrm{prod}}^{\circ}=\sum_i n_i\,\bar{s}_i^{\circ}(T_{ad})`
                                    : String.raw`S_{\mathrm{prod}}^{\circ}=\sum_i n_i\,\bar{s}_i^{\circ}(T_{\mathrm{prod}})`}
                                />
                                <span>{` = ${sbarSum(data?.result?.ideal_products_list)?.toFixed(2)} kJ/K`}</span>
                              </div>
                            ) : null}
                            {Number.isFinite(sbarISum(data?.result?.ideal_products_list)) ? (
                              <div className="equation-note-line">
                                <LatexText
                                  latex={analysisMode === "adiabatic"
                                    ? String.raw`S_{\mathrm{prod}}=\sum_i n_i\,\bar{s}_i(T_{ad},P_i)`
                                    : String.raw`S_{\mathrm{prod}}=\sum_i n_i\,\bar{s}_i(T_{\mathrm{prod}},P_i)`}
                                />
                                <span>{` = ${sbarISum(data?.result?.ideal_products_list)?.toFixed(2)} kJ/K`}</span>
                              </div>
                            ) : null}
                            <div className="equation-note-line">
                              <LatexText
                                latex={analysisMode === "adiabatic"
                                  ? String.raw`(T_{ref}=${Number(data?.inputs?.hv_ref_t_k ?? 0).toFixed(2)}\ \mathrm{K};\ T=T_{ad})`
                                  : String.raw`(T_{ref}=${Number(data?.inputs?.hv_ref_t_k ?? 0).toFixed(2)}\ \mathrm{K};\ T=T_{\mathrm{prod}})`}
                              />
                            </div>
                            <div className="equation-note-line">Evaluated using temperature-dependent c_p(T) (NASA polynomials via Cantera), not constant c_p.</div>
                            <div className="equation-note-line">
                              <LatexText latex={String.raw`S^\circ`} />
                              <span> uses standard-state values; </span>
                              <LatexText latex={String.raw`S`} />
                              <span> includes the pressure correction.</span>
                            </div>
                          </>
                        ),
                        g: (
                          <>
                            <div className="equation-note-line">
                              <LatexText latex={String.raw`A=U-TS`} />
                            </div>
                            <div className="equation-note-line">
                              <LatexText latex={String.raw`G=A+PV=H-TS`} />
                            </div>
                            <div className="equation-note-line">
                              <LatexText latex={String.raw`dG=-S\,dT+V\,dP+\sum_i \mu_i\,dn_i;\ T,P\ \text{const} \Rightarrow \min G`} />
                            </div>
                            <div className="equation-note-line">
                              <LatexText
                                latex={analysisMode === "adiabatic"
                                  ? String.raw`\Delta \bar{g}_{f,i}^{\circ}(T_{ad})=\bar{g}_i^{\circ}(T_{ad})-\sum_j a_{ij}\,\bar{g}_{j,\mathrm{el}}^{\circ}(T_{ad})`
                                  : String.raw`\Delta \bar{g}_{f,i}^{\circ}(T_{\mathrm{prod}})=\bar{g}_i^{\circ}(T_{\mathrm{prod}})-\sum_j a_{ij}\,\bar{g}_{j,\mathrm{el}}^{\circ}(T_{\mathrm{prod}})`}
                              />
                            </div>
                            <div className="equation-note-line">
                              <LatexText
                                latex={analysisMode === "adiabatic"
                                  ? String.raw`G_{\mathrm{prod}}^{\circ}=\sum_i n_i\,\bar{g}_i^{\circ}(T_{ad})=\sum_i n_i\,\Delta \bar{g}_{f,i}^{\circ}(T_{ad})+\sum_i n_i\sum_j a_{ij}\,\bar{g}_{j,\mathrm{el}}^{\circ}(T_{ad})`
                                  : String.raw`G_{\mathrm{prod}}^{\circ}=\sum_i n_i\,\bar{g}_i^{\circ}(T_{\mathrm{prod}})=\sum_i n_i\,\Delta \bar{g}_{f,i}^{\circ}(T_{\mathrm{prod}})+\sum_i n_i\sum_j a_{ij}\,\bar{g}_{j,\mathrm{el}}^{\circ}(T_{\mathrm{prod}})`}
                              />
                            </div>
                            {Number.isFinite(gbarSum(data?.result?.ideal_products_list)) ? (
                              <div className="equation-note-line">
                                <LatexText
                                  latex={analysisMode === "adiabatic"
                                    ? String.raw`G_{\mathrm{prod}}^{\circ}=\sum_i n_i\,\bar{g}_i^{\circ}(T_{ad})`
                                    : String.raw`G_{\mathrm{prod}}^{\circ}=\sum_i n_i\,\bar{g}_i^{\circ}(T_{\mathrm{prod}})`}
                                />
                                <span>{` = ${gbarSum(data?.result?.ideal_products_list)?.toFixed(2)} kJ`}</span>
                              </div>
                            ) : null}
                            {Number.isFinite(gfoSum(data?.result?.ideal_products_list)) ? (
                              <div className="equation-note-line">
                                <LatexText
                                  latex={analysisMode === "adiabatic"
                                    ? String.raw`G_{f,\mathrm{prod}}^{\circ}=\sum_i n_i\,\Delta \bar{g}_{f,i}^{\circ}(T_{ad})`
                                    : String.raw`G_{f,\mathrm{prod}}^{\circ}=\sum_i n_i\,\Delta \bar{g}_{f,i}^{\circ}(T_{\mathrm{prod}})`}
                                />
                                <span>{` = ${gfoSum(data?.result?.ideal_products_list)?.toFixed(2)} kJ`}</span>
                              </div>
                            ) : null}
                            {Number.isFinite(gElementsSum(data?.result?.ideal_products_list)) ? (
                              <div className="equation-note-line">
                                <LatexText
                                  latex={analysisMode === "adiabatic"
                                    ? String.raw`G_{\mathrm{el,prod}}^{\circ}=\sum_i n_i\sum_j a_{ij}\,\bar{g}_{j,\mathrm{el}}^{\circ}(T_{ad})`
                                    : String.raw`G_{\mathrm{el,prod}}^{\circ}=\sum_i n_i\sum_j a_{ij}\,\bar{g}_{j,\mathrm{el}}^{\circ}(T_{\mathrm{prod}})`}
                                />
                                <span>{` = ${gElementsSum(data?.result?.ideal_products_list)?.toFixed(2)} kJ`}</span>
                              </div>
                            ) : null}
                            <div className="equation-note-line">
                              <LatexText
                                latex={analysisMode === "adiabatic"
                                  ? String.raw`(T_{ref}=${Number(data?.inputs?.hv_ref_t_k ?? 0).toFixed(2)}\ \mathrm{K};\ T=T_{ad})`
                                  : String.raw`(T_{ref}=${Number(data?.inputs?.hv_ref_t_k ?? 0).toFixed(2)}\ \mathrm{K};\ T=T_{\mathrm{prod}})`}
                              />
                            </div>
                            <div className="equation-note-line">
                              <LatexText latex={String.raw`G^\circ`} />
                              <span> is standard-state Gibbs; it is not conserved and is used for equilibrium interpretation.</span>
                            </div>
                          </>
                        )
                      },
                      thermoTab: idealProductsThermoTab,
                      onThermoTabChange: setIdealProductsThermoTab
                    }
                  )
                : null}
              {renderTableGroup(
                productsTables,
                data?.inputs?.t_prod_k,
                productsTableTab,
                setProductsTableTab,
                {
                  thermoNotes: {
                    h: (
                      <>
                        <div className="equation-note-line">
                          <LatexText
                            latex={String.raw`\bar{h}_{s,i}(T)=\bar{h}_i(T)-\bar{h}_i(T_{ref})=\int_{T_{ref}}^{T} \bar{c}_{p,i}(T)\,dT`}
                          />
                        </div>
                        <div className="equation-note-line">
                          <LatexText
                            latex={String.raw`\bar{h}_i(T)=\bar{h}_i(T_{ref})+\int_{T_{ref}}^{T} \bar{c}_{p,i}(T)\,dT`}
                          />
                        </div>
                        <div className="equation-note-line">
                          <LatexText
                            latex={String.raw`\frac{dE_{cv}}{dt}=\dot Q-\dot W+\sum_{in}\dot m\left(h+\frac{V^2}{2}+gz\right)-\sum_{out}\dot m\left(h+\frac{V^2}{2}+gz\right)`}
                          />
                        </div>
                        <div className="equation-note-line">
                          <LatexText latex={String.raw`\text{steady},\ \dot W\approx0,\ \dot Q\approx0,\ \Delta KE\approx0,\ \Delta PE\approx0\ \Rightarrow\ \sum_{in}\dot m h=\sum_{out}\dot m h`} />
                        </div>
                        <div className="equation-note-line">
                          <LatexText
                            latex={analysisMode === "adiabatic"
                              ? String.raw`H_{\mathrm{prod}}=\sum_i n_i\,\bar{h}_i(T_{ad})`
                              : String.raw`H_{\mathrm{prod}}=\sum_i n_i\,\bar{h}_i(T_{\mathrm{prod}})`}
                          />
                        </div>
                        {data?.mode === "dissociation" ? (
                          <div className="equation-note-line">
                            <LatexText
                              latex={analysisMode === "adiabatic"
                                ? String.raw`H_{\mathrm{prod}}(T_{ad})=\sum_i n_i(T_{ad})\,\bar{h}_i(T_{ad})`
                                : String.raw`H_{\mathrm{prod}}(T_{\mathrm{prod}})=\sum_i n_i(T_{\mathrm{prod}})\,\bar{h}_i(T_{\mathrm{prod}})`}
                            />
                          </div>
                        ) : null}
                        {Number.isFinite(hbarSum(data?.result?.products_list)) ? (
                          <div className="equation-note-line">
                            <LatexText
                              latex={analysisMode === "adiabatic"
                                ? String.raw`H_{\mathrm{prod}}=\sum_i n_i\,\bar{h}_i(T_{ad})`
                                : String.raw`H_{\mathrm{prod}}=\sum_i n_i\,\bar{h}_i(T_{\mathrm{prod}})`}
                            />
                            <span>{` = ${hbarSum(data?.result?.products_list)?.toFixed(2)} kJ`}</span>
                          </div>
                        ) : null}
                        {Number.isFinite(hbarFSum(data?.result?.products_list)) ? (
                          <div className="equation-note-line">
                            <LatexText latex={String.raw`H_{f,\mathrm{prod}}^{\circ}=\sum_i n_i\,\Delta \bar{h}_{f,i}^{\circ}(T_{\mathrm{prod}})`} />
                            <span>{` = ${hbarFSum(data?.result?.products_list)?.toFixed(2)} kJ`}</span>
                          </div>
                        ) : null}
                        {Number.isFinite(hbarSSum(data?.result?.products_list)) ? (
                          <div className="equation-note-line">
                            <LatexText latex={String.raw`H_{s,\mathrm{prod}}=\sum_i n_i\,\bar{h}_{s,i}(T_{\mathrm{prod}})`} />
                            <span>{` = ${hbarSSum(data?.result?.products_list)?.toFixed(2)} kJ`}</span>
                          </div>
                        ) : null}
                        {Number.isFinite(analysis?.delta_h_kj) ? (
                          <div className="equation-note-line">
                            <LatexText
                              latex={analysisMode === "adiabatic"
                                ? String.raw`\Delta H_{ad}=H_{\mathrm{prod}}(T_{ad})-H_{\mathrm{react}}`
                                : String.raw`\Delta H_{\mathrm{desired}}=H_{\mathrm{prod}}(T_{\mathrm{prod}})-H_{\mathrm{react}}`}
                            />
                            <span>{` = ${analysis.delta_h_kj.toFixed(2)} kJ`}</span>
                          </div>
                        ) : null}
                        {Number.isFinite(analysis?.delta_h_normalized) ? (
                          <div className="equation-note-line">
                            <LatexText latex={String.raw`\varepsilon_H=\frac{\Delta H}{\max(|H_{\mathrm{react}}|,1)}` } />
                            <span>{` = ${analysis.delta_h_normalized.toExponential(3)}`}</span>
                          </div>
                        ) : null}
                        <div className="equation-note-line">
                          <LatexText
                            latex={analysisMode === "adiabatic"
                              ? String.raw`(T_{ref}=${Number(data?.inputs?.hv_ref_t_k ?? 0).toFixed(2)}\ \mathrm{K};\ T=T_{ad})`
                              : String.raw`(T_{ref}=${Number(data?.inputs?.hv_ref_t_k ?? 0).toFixed(2)}\ \mathrm{K};\ T=T_{\mathrm{prod}})`}
                          />
                        </div>
                        <div className="equation-note-line">Evaluated using temperature-dependent c_p(T) (NASA polynomials via Cantera), not constant c_p.</div>
                        <div className="equation-note-line">
                          Totals shown are weighted sums <LatexText latex={String.raw`\sum n_i\,\bar{h}_i`} /> in kJ.
                        </div>
                      </>
                    ),
                    s: (
                      <>
                        <div className="equation-note-line">
                          <LatexText
                            latex={analysisMode === "adiabatic"
                              ? String.raw`\bar{s}_{s,i}(T_{ad})=\int_{T_{ref}}^{T_{ad}} \frac{\bar{c}_{p,i}(T)}{T}\,dT`
                              : String.raw`\bar{s}_{s,i}(T_{\mathrm{prod}})=\int_{T_{ref}}^{T_{\mathrm{prod}}} \frac{\bar{c}_{p,i}(T)}{T}\,dT`}
                          />
                        </div>
                        <div className="equation-note-line">
                          <LatexText
                            latex={analysisMode === "adiabatic"
                              ? String.raw`\bar{s}_i(T_{ad})=\bar{s}_i(T_{ref})+\int_{T_{ref}}^{T_{ad}} \frac{\bar{c}_{p,i}(T)}{T}\,dT`
                              : String.raw`\bar{s}_i(T_{\mathrm{prod}})=\bar{s}_i(T_{ref})+\int_{T_{ref}}^{T_{\mathrm{prod}}} \frac{\bar{c}_{p,i}(T)}{T}\,dT`}
                          />
                        </div>
                        <div className="equation-note-line">
                          <LatexText
                            latex={analysisMode === "adiabatic"
                              ? String.raw`\bar{s}_i^{\circ}(T_{ad})=\bar{s}_i^{\circ}(T_{ref})+\int_{T_{ref}}^{T_{ad}} \frac{\bar{c}_{p,i}(T)}{T}\,dT`
                              : String.raw`\bar{s}_i^{\circ}(T_{\mathrm{prod}})=\bar{s}_i^{\circ}(T_{ref})+\int_{T_{ref}}^{T_{\mathrm{prod}}} \frac{\bar{c}_{p,i}(T)}{T}\,dT`}
                          />
                        </div>
                        <div className="equation-note-line">
                          <LatexText
                            latex={analysisMode === "adiabatic"
                              ? String.raw`\bar{s}_i(T_{ad},P_i)=\bar{s}_i(T_{ref})+\int_{T_{ref}}^{T_{ad}} \frac{\bar{c}_{p,i}(T)}{T}\,dT-\bar{R}_u\ln\left(\frac{P_i}{P^{\circ}}\right),\quad P_i=y_i P`
                              : String.raw`\bar{s}_i(T_{\mathrm{prod}},P_i)=\bar{s}_i(T_{ref})+\int_{T_{ref}}^{T_{\mathrm{prod}}} \frac{\bar{c}_{p,i}(T)}{T}\,dT-\bar{R}_u\ln\left(\frac{P_i}{P^{\circ}}\right),\quad P_i=y_i P`}
                          />
                        </div>
                        <div className="equation-note-line">
                          <LatexText
                            latex={String.raw`\frac{dS_{cv}}{dt}=\sum_k\frac{\dot Q_k}{T_k}+\sum_{in}\dot m s-\sum_{out}\dot m s+\dot S_{\mathrm{gen}}`}
                          />
                        </div>
                        <div className="equation-note-line">
                          <LatexText latex={String.raw`\text{steady},\ \dot Q\approx0\ \Rightarrow\ \sum_{out}\dot m s-\sum_{in}\dot m s=\dot S_{\mathrm{gen}}\ge0`} />
                        </div>
                        <div className="equation-note-line">
                          <LatexText
                            latex={analysisMode === "adiabatic"
                              ? String.raw`S_{\mathrm{prod}}^{\circ}=\sum_i n_i\,\bar{s}_i^{\circ}(T_{ad})`
                              : String.raw`S_{\mathrm{prod}}^{\circ}=\sum_i n_i\,\bar{s}_i^{\circ}(T_{\mathrm{prod}})`}
                          />
                        </div>
                        {Number.isFinite(sbarSum(data?.result?.products_list)) ? (
                          <div className="equation-note-line">
                            <LatexText
                              latex={analysisMode === "adiabatic"
                                ? String.raw`S_{\mathrm{prod}}^{\circ}=\sum_i n_i\,\bar{s}_i^{\circ}(T_{ad})`
                                : String.raw`S_{\mathrm{prod}}^{\circ}=\sum_i n_i\,\bar{s}_i^{\circ}(T_{\mathrm{prod}})`}
                            />
                            <span>{` = ${sbarSum(data?.result?.products_list)?.toFixed(2)} kJ/K`}</span>
                          </div>
                        ) : null}
                        {Number.isFinite(sbarISum(data?.result?.products_list)) ? (
                          <div className="equation-note-line">
                            <LatexText
                              latex={analysisMode === "adiabatic"
                                ? String.raw`S_{\mathrm{prod}}=\sum_i n_i\,\bar{s}_i(T_{ad},P_i)`
                                : String.raw`S_{\mathrm{prod}}=\sum_i n_i\,\bar{s}_i(T_{\mathrm{prod}},P_i)`}
                            />
                            <span>{` = ${sbarISum(data?.result?.products_list)?.toFixed(2)} kJ/K`}</span>
                          </div>
                        ) : null}
                        <div className="equation-note-line">
                          <LatexText
                            latex={analysisMode === "adiabatic"
                              ? String.raw`(T_{ref}=${Number(data?.inputs?.hv_ref_t_k ?? 0).toFixed(2)}\ \mathrm{K};\ T=T_{ad})`
                              : String.raw`(T_{ref}=${Number(data?.inputs?.hv_ref_t_k ?? 0).toFixed(2)}\ \mathrm{K};\ T=T_{\mathrm{prod}})`}
                          />
                        </div>
                        <div className="equation-note-line">Evaluated using temperature-dependent c_p(T) (NASA polynomials via Cantera), not constant c_p.</div>
                        <div className="equation-note-line">
                          <LatexText latex={String.raw`S^\circ`} />
                          <span> uses standard-state values; </span>
                          <LatexText latex={String.raw`S`} />
                          <span> includes the pressure correction.</span>
                        </div>
                      </>
                    ),
                    g: (
                      <>
                            <div className="equation-note-line">
                              <LatexText latex={String.raw`A=U-TS`} />
                            </div>
                            <div className="equation-note-line">
                              <LatexText latex={String.raw`G=A+PV=H-TS`} />
                            </div>
                            <div className="equation-note-line">
                              <LatexText latex={String.raw`dG=-S\,dT+V\,dP+\sum_i \mu_i\,dn_i;\ T,P\ \text{const} \Rightarrow \min G`} />
                            </div>
                        <div className="equation-note-line">
                          <LatexText
                            latex={analysisMode === "adiabatic"
                              ? String.raw`\Delta \bar{g}_{f,i}^{\circ}(T_{ad})=\bar{g}_i^{\circ}(T_{ad})-\sum_j a_{ij}\,\bar{g}_{j,\mathrm{el}}^{\circ}(T_{ad})`
                              : String.raw`\Delta \bar{g}_{f,i}^{\circ}(T_{\mathrm{prod}})=\bar{g}_i^{\circ}(T_{\mathrm{prod}})-\sum_j a_{ij}\,\bar{g}_{j,\mathrm{el}}^{\circ}(T_{\mathrm{prod}})`}
                          />
                        </div>
                        <div className="equation-note-line">
                          <LatexText
                            latex={analysisMode === "adiabatic"
                              ? String.raw`G_{\mathrm{prod}}^{\circ}=\sum_i n_i\,\bar{g}_i^{\circ}(T_{ad})=\sum_i n_i\,\Delta \bar{g}_{f,i}^{\circ}(T_{ad})+\sum_i n_i\sum_j a_{ij}\,\bar{g}_{j,\mathrm{el}}^{\circ}(T_{ad})`
                              : String.raw`G_{\mathrm{prod}}^{\circ}=\sum_i n_i\,\bar{g}_i^{\circ}(T_{\mathrm{prod}})=\sum_i n_i\,\Delta \bar{g}_{f,i}^{\circ}(T_{\mathrm{prod}})+\sum_i n_i\sum_j a_{ij}\,\bar{g}_{j,\mathrm{el}}^{\circ}(T_{\mathrm{prod}})`}
                          />
                        </div>
                        {Number.isFinite(gbarSum(data?.result?.products_list)) ? (
                          <div className="equation-note-line">
                            <LatexText
                              latex={analysisMode === "adiabatic"
                                ? String.raw`G_{\mathrm{prod}}^{\circ}=\sum_i n_i\,\bar{g}_i^{\circ}(T_{ad})`
                                : String.raw`G_{\mathrm{prod}}^{\circ}=\sum_i n_i\,\bar{g}_i^{\circ}(T_{\mathrm{prod}})`}
                            />
                            <span>{` = ${gbarSum(data?.result?.products_list)?.toFixed(2)} kJ`}</span>
                          </div>
                        ) : null}
                        {Number.isFinite(gfoSum(data?.result?.products_list)) ? (
                          <div className="equation-note-line">
                            <LatexText
                              latex={analysisMode === "adiabatic"
                                ? String.raw`G_{f,\mathrm{prod}}^{\circ}=\sum_i n_i\,\Delta \bar{g}_{f,i}^{\circ}(T_{ad})`
                                : String.raw`G_{f,\mathrm{prod}}^{\circ}=\sum_i n_i\,\Delta \bar{g}_{f,i}^{\circ}(T_{\mathrm{prod}})`}
                            />
                            <span>{` = ${gfoSum(data?.result?.products_list)?.toFixed(2)} kJ`}</span>
                          </div>
                        ) : null}
                        {Number.isFinite(gElementsSum(data?.result?.products_list)) ? (
                          <div className="equation-note-line">
                            <LatexText
                              latex={analysisMode === "adiabatic"
                                ? String.raw`G_{\mathrm{el,prod}}^{\circ}=\sum_i n_i\sum_j a_{ij}\,\bar{g}_{j,\mathrm{el}}^{\circ}(T_{ad})`
                                : String.raw`G_{\mathrm{el,prod}}^{\circ}=\sum_i n_i\sum_j a_{ij}\,\bar{g}_{j,\mathrm{el}}^{\circ}(T_{\mathrm{prod}})`}
                            />
                            <span>{` = ${gElementsSum(data?.result?.products_list)?.toFixed(2)} kJ`}</span>
                          </div>
                        ) : null}
                        <div className="equation-note-line">
                          <LatexText
                            latex={analysisMode === "adiabatic"
                              ? String.raw`(T_{ref}=${Number(data?.inputs?.hv_ref_t_k ?? 0).toFixed(2)}\ \mathrm{K};\ T=T_{ad})`
                              : String.raw`(T_{ref}=${Number(data?.inputs?.hv_ref_t_k ?? 0).toFixed(2)}\ \mathrm{K};\ T=T_{\mathrm{prod}})`}
                          />
                        </div>
                        <div className="equation-note-line">
                          <LatexText latex={String.raw`G^\circ`} />
                          <span> is standard-state Gibbs; it is not conserved and is used for equilibrium interpretation.</span>
                        </div>
                      </>
                    )
                  },
                  thermoTab: productsThermoTab,
                  onThermoTabChange: setProductsThermoTab
                }
              )}
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
                  <h5>Current case derivation (solver output)</h5>
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
              {resultsTab === "dissociation" ? (
                <FuelDissociationDiagnostics inputs={inputs} data={data} />
              ) : null}
              {resultsTab === "xi-map" ? (
                <FuelXiMap
                  inputs={inputs}
                  speciesList={xiSpeciesList}
                  mode={inputs?.mode}
                  selectedPhi={data?.result?.phi}
                  selectedTadK={data?.result?.analysis?.solved_t_ad_k}
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
