import Plot from "react-plotly.js";
import LatexText from "./LatexText";

const colorRamp = (index, total, startHue, endHue, saturation = 70, lightness = 55) => {
  if (total <= 1) {
    return `hsl(${startHue}, ${saturation}%, ${lightness}%)`;
  }
  const t = index / (total - 1);
  const hue = startHue + t * (endHue - startHue);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

export default function StripModel({ data, inputs, revision, onChange, onReset, showMk1 = true }) {
  if (!data) {
    return <div className="plot-placeholder">Run the solver to render plots.</div>;
  }

  if (data.error) {
    return <div className="plot-placeholder">{data.error}</div>;
  }

  const { series, labels, params } = data;
  const safeInputs = inputs || params || {};
  const plotConfig = {
    responsive: true,
    mathjax: "cdn"
  };

  const hoverTemplate = (label) => (
    `${label}<br>` +
    "<span style=\"color:#000000\">x: %{x:.3f}<br>y: %{y:.3f}</span>" +
    "<extra></extra>"
  );

  const traces = [];

  const hasOverrides = Boolean(params?.has_overrides);

  if (showMk1 && series.mk1_operating?.x?.length) {
    traces.push({
      x: series.mk1_operating.x,
      y: series.mk1_operating.y,
      type: "scatter",
      mode: "lines",
      name: "Oper (MK1)",
      line: { color: "#000000", width: 2.6, dash: "dash" },
      hovertemplate: hoverTemplate("Oper (MK1)")
    });
  }

  if (series.operating?.x?.length) {
    const operLabel = hasOverrides ? "Oper (User)" : "Oper (Base)";
    traces.push({
      x: series.operating.x,
      y: series.operating.y,
      type: "scatter",
      mode: "lines",
      name: operLabel,
      line: { color: "#ff0000", width: 2.2, dash: "dot" },
      showlegend: true,
      hovertemplate: hoverTemplate(operLabel)
    });
  }

  const mk1OperPoint = showMk1 ? series.mk1_oper_point : null;
  const hasMk1OperPoint = showMk1 && Number.isFinite(mk1OperPoint?.f_m2) && Number.isFinite(mk1OperPoint?.pi_c);
  if (showMk1 && hasMk1OperPoint) {
    traces.push({
      x: [mk1OperPoint.f_m2],
      y: [mk1OperPoint.pi_c],
      type: "scatter",
      mode: "markers",
      name: "f(M2) MK1 on oper",
      marker: { color: "#00d4ff", size: 10, symbol: "circle", line: { color: "#001f3f", width: 2 } },
      hovertemplate: hoverTemplate("f(M2) MK1 on oper")
    });
  }

  const f1Lines = Array.isArray(series.f1_lines) ? series.f1_lines : [];
  f1Lines.forEach((line, idx) => {
    if (!line.x?.length) {
      return;
    }
    traces.push({
      x: line.x,
      y: line.y,
      type: "scatter",
      mode: "lines",
      name: `F1 tau=${line.tau_ratio.toFixed(2)}`,
      line: { color: colorRamp(idx, f1Lines.length, 280, 40), width: 1.4 },
      showlegend: false,
      hovertemplate: hoverTemplate(`F1 tau=${line.tau_ratio.toFixed(2)}`)
    });
  });

  if (showMk1 && series.mk1_f1?.x?.length) {
    traces.push({
      x: series.mk1_f1.x,
      y: series.mk1_f1.y,
      type: "scatter",
      mode: "lines",
      name: `F1 (MK1 tau)=${series.mk1_f1.tau_ratio.toFixed(2)}`,
      line: { color: "#000000", width: 2.6, dash: "dash" },
      hovertemplate: hoverTemplate(`F1 (MK1 tau)=${series.mk1_f1.tau_ratio.toFixed(2)}`)
    });
  }

  if (series.f1_user?.x?.length) {
    traces.push({
      x: series.f1_user.x,
      y: series.f1_user.y,
      type: "scatter",
      mode: "lines",
      name: hasOverrides
        ? `F1 (user)=${series.f1_user.tau_ratio.toFixed(2)}`
        : `F1 (base)=${series.f1_user.tau_ratio.toFixed(2)}`,
      line: { color: "#ff0000", width: 2.2 },
      showlegend: true,
      hovertemplate: hoverTemplate(
        hasOverrides
          ? `F1 (user)=${series.f1_user.tau_ratio.toFixed(2)}`
          : `F1 (base)=${series.f1_user.tau_ratio.toFixed(2)}`
      )
    });
  }

  const speedLines = Array.isArray(series.speed_lines) ? series.speed_lines : [];
  speedLines.forEach((line, idx) => {
    if (!line.x?.length) {
      return;
    }
    traces.push({
      x: line.x,
      y: line.y,
      type: "scatter",
      mode: "lines",
      name: `Mb=${line.mb_corr.toFixed(2)}`,
      line: { color: colorRamp(idx, speedLines.length, 210, 120, 72, 38), width: 1.6 },
      showlegend: false,
      hovertemplate: hoverTemplate(`Mb=${line.mb_corr.toFixed(2)}`)
    });
  });

  if (series.speed_user?.x?.length) {
    traces.push({
      x: series.speed_user.x,
      y: series.speed_user.y,
      type: "scatter",
      mode: "lines",
      name: `Mb (user)=${series.speed_user.mb_corr.toFixed(2)}`,
      line: { color: "#c1121f", width: 2.8 },
      hovertemplate: hoverTemplate(`Mb (user)=${series.speed_user.mb_corr.toFixed(2)}`)
    });
  }

  if (showMk1 && series.mk1_oper_mb_line?.x?.length) {
    traces.push({
      x: series.mk1_oper_mb_line.x,
      y: series.mk1_oper_mb_line.y,
      type: "scatter",
      mode: "lines",
      name: `Mb (MK1 oper)=${series.mk1_oper_mb_line.mb_corr.toFixed(2)}`,
      line: { color: "#0b5fff", width: 2.4, dash: "dot" },
      showlegend: true,
      hovertemplate: hoverTemplate(`Mb (MK1 oper)=${series.mk1_oper_mb_line.mb_corr.toFixed(2)}`)
    });
  }

  if (showMk1 && series.mk1_tau_mb_oper_mb_line?.x?.length) {
    traces.push({
      x: series.mk1_tau_mb_oper_mb_line.x,
      y: series.mk1_tau_mb_oper_mb_line.y,
      type: "scatter",
      mode: "lines",
      name: `Mb (MK1 tau∩Mb on oper)=${series.mk1_tau_mb_oper_mb_line.mb_corr.toFixed(2)}`,
      line: { color: "#007a6f", width: 2.2, dash: "dash" },
      showlegend: true,
      hovertemplate: hoverTemplate(`Mb (MK1 tau∩Mb on oper)=${series.mk1_tau_mb_oper_mb_line.mb_corr.toFixed(2)}`)
    });
  }

  if (showMk1 && series.mk1_mb_line?.x?.length) {
    traces.push({
      x: series.mk1_mb_line.x,
      y: series.mk1_mb_line.y,
      type: "scatter",
      mode: "lines",
      name: `Mb (MK1 tau)=${series.mk1_mb_line.mb_corr.toFixed(2)}`,
      line: { color: "#111111", width: 2.6 },
      showlegend: true,
      hovertemplate: hoverTemplate(`Mb (MK1 tau)=${series.mk1_mb_line.mb_corr.toFixed(2)}`)
    });
  }

  const mk1Point = showMk1 ? series.mk1_point : null;
  if (showMk1 && mk1Point?.f_m2 && mk1Point?.pi_c) {
    traces.push({
      x: [mk1Point.f_m2],
      y: [mk1Point.pi_c],
      type: "scatter",
      mode: "markers",
      name: `MK1 point (${mk1Point.status})`,
      marker: { color: "#ffffff", size: 10, symbol: "diamond", line: { color: "#000000", width: 2 } },
      hovertemplate: hoverTemplate(`MK1 point (${mk1Point.status})`)
    });
  }

  const mk1TauPoint = showMk1 ? series.mk1_tau_point : null;
  const hasMk1TauPoint = Number.isFinite(mk1TauPoint?.f_m2) && Number.isFinite(mk1TauPoint?.pi_c);
  if (showMk1 && hasMk1TauPoint) {
    const mk1TauStatus = mk1TauPoint?.status;
    const mk1TauLabel = mk1TauStatus ? `MK1 tau point (${mk1TauStatus})` : "MK1 tau point";
    traces.push({
      x: [mk1TauPoint.f_m2],
      y: [mk1TauPoint.pi_c],
      type: "scatter",
      mode: "markers",
      name: mk1TauLabel,
      marker: { color: "#00d4ff", size: 10, symbol: "circle", line: { color: "#001f3f", width: 2 } },
      hovertemplate: hoverTemplate(mk1TauLabel)
    });
  }

  const mk1Intersection = showMk1 ? series.mk1_intersection : null;
  if (showMk1 && !mk1TauPoint && mk1Intersection?.f_m2 && mk1Intersection?.pi_c) {
    const mk1TauStatus = mk1Intersection?.status;
    const mk1TauLabel = mk1TauStatus ? `MK1 tau point (${mk1TauStatus})` : "MK1 tau point";
    traces.push({
      x: [mk1Intersection.f_m2],
      y: [mk1Intersection.pi_c],
      type: "scatter",
      mode: "markers",
      name: mk1TauLabel,
      marker: { color: "#00d4ff", size: 10, symbol: "circle", line: { color: "#001f3f", width: 2 } },
      hovertemplate: hoverTemplate(mk1TauLabel)
    });
  }

  const mk1MbIntersection = showMk1 ? series.mk1_mb_intersection : null;
  if (showMk1 && mk1MbIntersection?.f_m2 && mk1MbIntersection?.pi_c) {
    traces.push({
      x: [mk1MbIntersection.f_m2],
      y: [mk1MbIntersection.pi_c],
      type: "scatter",
      mode: "markers",
      name: "MK1 tau \u2229 Mb (user)",
      marker: { color: "#ffe66d", size: 11, symbol: "x", line: { color: "#000000", width: 2 } },
      hovertemplate: hoverTemplate("MK1 tau \u2229 Mb (user)")
    });
  }


  const mk1MbOperIntersection = showMk1 ? series.mk1_mb_oper_intersection : null;
  if (showMk1 && mk1MbOperIntersection?.f_m2 && mk1MbOperIntersection?.pi_c) {
    traces.push({
      x: [mk1MbOperIntersection.f_m2],
      y: [mk1MbOperIntersection.pi_c],
      type: "scatter",
      mode: "markers",
      name: "MK1 Mb \u2229 oper",
      marker: { color: "#000000", size: 11, symbol: "circle", line: { color: "#ffffff", width: 2 } },
      hovertemplate: hoverTemplate("MK1 Mb \u2229 oper")
    });
  }

  const mk1TauMbOperPoint = showMk1 ? series.mk1_tau_mb_oper_point : null;
  if (showMk1 && mk1TauMbOperPoint?.f_m2 && mk1TauMbOperPoint?.pi_c) {
    traces.push({
      x: [mk1TauMbOperPoint.f_m2],
      y: [mk1TauMbOperPoint.pi_c],
      type: "scatter",
      mode: "markers",
      name: "MK1 tau \u2229 Mb on oper",
      marker: { color: "#ffe66d", size: 11, symbol: "x", line: { color: "#000000", width: 2 } },
      hovertemplate: hoverTemplate("MK1 tau \u2229 Mb on oper")
    });
  }

  const userMbOperIntersection = series.user_mb_oper_intersection;
  if (userMbOperIntersection?.f_m2 && userMbOperIntersection?.pi_c) {
    traces.push({
      x: [userMbOperIntersection.f_m2],
      y: [userMbOperIntersection.pi_c],
      type: "scatter",
      mode: "markers",
      name: "Mb (user) \u2229 oper",
      marker: { color: "#ff0000", size: 10, symbol: "circle", line: { color: "#ffffff", width: 2 } },
      hovertemplate: hoverTemplate("Mb (user) \u2229 oper")
    });
  }

  const intersection = series.intersection;
  if (intersection?.f_m2 && intersection?.pi_c) {
    traces.push({
      x: [intersection.f_m2],
      y: [intersection.pi_c],
      type: "scatter",
      mode: "markers",
      name: `F1 \u2229 Mb (user) (${intersection.status})`,
      marker: { color: "#2ec4b6", size: 10, symbol: "star" },
      hovertemplate: hoverTemplate(`F1 \u2229 Mb (user) (${intersection.status})`)
    });
  }

  const summaryLatex = params
    ? String.raw`\tau_\lambda/\tau_r\ (user)=${params.tau_user.toFixed(2)},\ M_{b0}/\sqrt{\tau_r}=${params.mb_user.toFixed(2)}`
    : "";

  const fieldMap = {
    gamma: { label: "\\gamma", step: 0.01, min: 1.05, max: 1.67, unit: "D.L." },
    t0: { label: "T_0", step: 1, min: 200, max: 350, unit: "K" },
    tau_r: { label: "\\tau_r", step: 0.01, min: 0.6, max: 2.0, unit: "D.L." },
    tau_user: { label: "\\tau_{\\lambda}/\\tau_r\\ (user)", step: 0.01, min: 1.2, max: 16.0, unit: "D.L." },
    fuel_to_air: { label: "f", step: 0.001, min: 0.0, max: 0.08, unit: "D.L." },
    pi_b: { label: "\\pi_b", step: 0.001, min: 0.8, max: 1.0, unit: "D.L." },
    n_stages: { label: "N_{stages}", step: 0.1, min: 2.0, max: 20.0, unit: "#" },
    alpha2a_deg: { label: "\\alpha_{2a}\\ (deg)", step: 0.5, min: -5.0, max: 30.0, unit: "deg" },
    beta2b_deg: { label: "\\beta_{2b}\\ (deg)", step: 0.5, min: 20.0, max: 80.0, unit: "deg" },
    mb_corr_min: { label: "M_{b0}/\\sqrt{\\tau_r}\\ (min)", step: 0.01, min: 0.2, max: 1.5, unit: "D.L." },
    mb_corr_max: { label: "M_{b0}/\\sqrt{\\tau_r}\\ (max)", step: 0.01, min: 0.3, max: 2.0, unit: "D.L." },
    n_speed_lines: { label: "M_{b0}/\\sqrt{\\tau_r}\\ (lines)", step: 1, min: 3, max: 14, unit: "#" },
    mb_user: { label: "M_{b0}/\\sqrt{\\tau_r}\\ (user)", step: 0.01, min: 0.2, max: 2.0, unit: "D.L." },
    a2_over_a4s: { label: "A_2/A_{4*}", step: 0.01, min: 2.0, max: 30.0, unit: "D.L." },
    a4s_over_a8: { label: "A_{4*}/A_8", step: 0.01, min: 0.01, max: 0.99, unit: "D.L." },
    f_m2_min: { label: "f(M_2)\\ (min)", step: 0.01, min: 0.05, max: 0.9, unit: "D.L." },
    f_m2_max: { label: "f(M_2)\\ (max)", step: 0.01, min: 0.2, max: 1.0, unit: "D.L." },
    n_f_m2: { label: "n\\ f(M_2)", step: 1, min: 50, max: 600, unit: "#" },
    pi_c_operating_min: { label: "\\pi_c\\ (min)", step: 0.01, min: 1.01, max: 5.0, unit: "D.L." },
    pi_c_operating_max: { label: "\\pi_c\\ (max)", step: 0.1, min: 2.0, max: 120.0, unit: "D.L." },
    n_pi_operating: { label: "n\\ \\pi_c", step: 1, min: 50, max: 600, unit: "#" },
    tau_min: { label: "\\tau_{\\lambda}/\\tau_r\\ (min)", step: 0.01, min: 1.2, max: 12.0, unit: "D.L." },
    tau_max: { label: "\\tau_{\\lambda}/\\tau_r\\ (max)", step: 0.01, min: 1.3, max: 16.0, unit: "D.L." },
    n_tau_lines: { label: "n\\ \\tau_{\\lambda}/\\tau_r", step: 1, min: 2, max: 14, unit: "#" }
  };

  const inputSections = [
    {
      title: "Cycle + Reference",
      column: "left",
      keys: ["gamma", "t0", "tau_r", "tau_user", "fuel_to_air", "pi_b"]
    },
    {
      title: "Strip Model",
      column: "right",
      keys: ["n_stages", "alpha2a_deg", "beta2b_deg", "mb_corr_min", "mb_corr_max", "n_speed_lines", "mb_user"]
    },
    {
      title: "Geometry + Flow",
      column: "left",
      keys: ["a2_over_a4s", "a4s_over_a8", "f_m2_min", "f_m2_max", "n_f_m2"]
    },
    {
      title: "Operating Line",
      column: "right",
      keys: ["pi_c_operating_min", "pi_c_operating_max", "n_pi_operating"]
    },
    {
      title: "F1 Family",
      column: "left",
      keys: ["tau_min", "tau_max", "n_tau_lines"]
    }
  ];

  const leftSections = inputSections.filter((section) => section.column === "left");
  const rightSections = inputSections.filter((section) => section.column === "right");

  const handleFieldChange = (key) => (event) => {
    if (!onChange) {
      return;
    }
    const raw = event.target.value;
    if (raw === "") {
      onChange(key, null);
      return;
    }
    const num = Number(raw);
    onChange(key, Number.isFinite(num) ? num : null);
  };

  const outputRows = [];
  const pushHeading = (label) => outputRows.push({ type: "heading", label });
  const pushRow = (label, value) => outputRows.push({ type: "row", label, value });

  pushHeading("Operating line");
  if (series.operating_meta?.pi_min_at_fmin) {
    pushRow("\\pi_c\\ \\mathrm{at}\\ f(M_2)_{min}", series.operating_meta.pi_min_at_fmin.toFixed(3));
  }
  if (userMbOperIntersection?.f_m2 && userMbOperIntersection?.pi_c) {
    pushRow("f(M_2)_{\\mathrm{Mb\\ user}\\cap\\mathrm{oper}}", userMbOperIntersection.f_m2.toFixed(4));
    pushRow("\\pi_{c,\\mathrm{Mb\\ user}\\cap\\mathrm{oper}}", userMbOperIntersection.pi_c.toFixed(3));
  }

  if (showMk1) {
    pushHeading("MK1");
    if (mk1Point?.f_m2 && mk1Point?.pi_c) {
      pushRow("f(M_2)_{\\mathrm{MK1}}", mk1Point.f_m2.toFixed(4));
      pushRow("\\pi_{c,\\mathrm{MK1}}", mk1Point.pi_c.toFixed(3));
      if (mk1Point.pi_oper) {
        pushRow("\\pi_c\\ \\mathrm{at}\\ f(M_2)_{\\mathrm{MK1}}", mk1Point.pi_oper.toFixed(3));
      }
      if (mk1Point.status) {
        pushRow("\\mathrm{MK1\\ status}", mk1Point.status);
      }
    }
    if (hasMk1TauPoint) {
      const mk1TauRaw = Number.isFinite(mk1TauPoint?.f_m2_raw)
        ? mk1TauPoint.f_m2_raw
        : mk1TauPoint.f_m2;
      pushRow("f(M_2)_{\\mathrm{MK1\\ tau}}", mk1TauRaw.toFixed(4));
      pushRow("\\pi_{c,\\mathrm{MK1\\ tau}}", mk1TauPoint.pi_c.toFixed(3));
      if (mk1TauPoint.status) {
        pushRow("\\mathrm{MK1\\ tau\\ status}", mk1TauPoint.status);
      }
    }
    if (hasMk1OperPoint) {
      const mk1OperRaw = Number.isFinite(mk1OperPoint?.f_m2_raw)
        ? mk1OperPoint.f_m2_raw
        : mk1OperPoint.f_m2;
      pushRow("f(M_2)_{\\mathrm{MK1\\ oper}}", mk1OperRaw.toFixed(4));
      pushRow("\\pi_{c,\\mathrm{MK1\\ oper}}", mk1OperPoint.pi_c.toFixed(3));
    }
    if ((mk1Intersection?.f_m2 && mk1Intersection?.pi_c) && !mk1TauPoint) {
      pushRow("f(M_2)_{\\mathrm{MK1\\ tau}}", mk1Intersection.f_m2.toFixed(4));
      pushRow("\\pi_{c,\\mathrm{MK1\\ tau}}", mk1Intersection.pi_c.toFixed(3));
      if (mk1Intersection.status) {
        pushRow("\\mathrm{MK1\\ tau\\ status}", mk1Intersection.status);
      }
    }
    if (mk1Intersection?.f_m2 && mk1Intersection?.pi_c) {
      if (mk1Intersection.mb_corr) {
        pushRow("M_{b0}/\\sqrt{\\tau_r}(\\mathrm{MK1})", mk1Intersection.mb_corr.toFixed(3));
      }
    }
  }

  pushHeading("Intersections");
  if (showMk1 && mk1MbIntersection?.f_m2 && mk1MbIntersection?.pi_c) {
    pushRow("f(M_2)_{\\mathrm{MK1\\ tau}\\cap\\mathrm{Mb}}", mk1MbIntersection.f_m2.toFixed(4));
    pushRow("\\pi_{c,\\mathrm{MK1\\ tau}\\cap\\mathrm{Mb}}", mk1MbIntersection.pi_c.toFixed(3));
  }
  if (showMk1 && mk1MbOperIntersection?.f_m2 && mk1MbOperIntersection?.pi_c) {
    pushRow("f(M_2)_{\\mathrm{MK1\\ Mb}\\cap\\mathrm{oper}}", mk1MbOperIntersection.f_m2.toFixed(4));
    pushRow("\\pi_{c,\\mathrm{MK1\\ Mb}\\cap\\mathrm{oper}}", mk1MbOperIntersection.pi_c.toFixed(3));
    if (mk1MbOperIntersection.pi_oper) {
      pushRow("\\pi_{c,\\mathrm{oper}}\\ (f)", mk1MbOperIntersection.pi_oper.toFixed(3));
    }
  }
  if (intersection?.f_m2 && intersection?.pi_c) {
    pushRow("f(M_2)_{\\mathrm{F1}\\cap\\mathrm{Mb}}", intersection.f_m2.toFixed(4));
    pushRow("\\pi_{c,\\mathrm{F1}\\cap\\mathrm{Mb}}", intersection.pi_c.toFixed(3));
    pushRow("\\mathrm{Intersection\\ status}", intersection.status);
  }

  const piMinInput = Number.isFinite(safeInputs?.pi_c_operating_min)
    ? Number(safeInputs.pi_c_operating_min)
    : null;
  const piMaxInput = Number.isFinite(safeInputs?.pi_c_operating_max)
    ? Number(safeInputs.pi_c_operating_max)
    : null;

  let yRange;
  if (piMinInput !== null && piMaxInput !== null && piMaxInput > piMinInput) {
    yRange = [piMinInput, piMaxInput];
  } else {
    const allYValues = traces.flatMap((trace) => (Array.isArray(trace.y) ? trace.y : []));
    const cleanY = allYValues.filter((value) => Number.isFinite(value));
    if (cleanY.length) {
      const yMin = Math.min(...cleanY);
      const yMax = Math.max(...cleanY);
      const span = yMax - yMin;
      const pad = (span || Math.abs(yMax) || 1) * 0.12;
      yRange = [yMin - pad, yMax + pad];
    }
  }

  const mk1YPoints = showMk1
    ? [mk1OperPoint?.pi_c, mk1TauPoint?.pi_c, mk1TauMbOperPoint?.pi_c]
      .filter((val) => Number.isFinite(val))
    : [];
  if (yRange && mk1YPoints.length) {
    const yMin = Math.min(yRange[0], ...mk1YPoints);
    const yMax = Math.max(yRange[1], ...mk1YPoints);
    if (yMin !== yRange[0] || yMax !== yRange[1]) {
      const span = yMax - yMin;
      const pad = (span || Math.abs(yMax) || 1) * 0.06;
      yRange = [yMin - pad, yMax + pad];
    }
  }

  const xMinRaw = Number.isFinite(safeInputs?.f_m2_min)
    ? Number(safeInputs.f_m2_min)
    : Number.isFinite(params?.f_m2_min)
      ? Number(params.f_m2_min)
      : 0.0;
  const xMaxRaw = Number.isFinite(safeInputs?.f_m2_max)
    ? Number(safeInputs.f_m2_max)
    : Number.isFinite(params?.f_m2_max)
      ? Number(params.f_m2_max)
      : 1.0;
  let xMax = Math.min(Math.max(xMaxRaw, 0.0), 1.0);
  let xMin = xMinRaw >= xMax ? 0.0 : Math.min(Math.max(xMinRaw, 0.0), xMax);
  const mk1XPoints = showMk1
    ? [mk1TauPoint?.f_m2, mk1OperPoint?.f_m2, mk1Intersection?.f_m2, mk1TauMbOperPoint?.f_m2]
      .filter((val) => Number.isFinite(val))
    : [];
  if (mk1XPoints.length) {
    xMin = Math.min(xMin, ...mk1XPoints);
    xMax = Math.max(xMax, ...mk1XPoints);
    xMin = Math.max(0.0, xMin);
    xMax = Math.min(1.0, xMax);
  }
  const xRange = [xMin, xMax];

  return (
    <div>
      {summaryLatex && (
        <p className="plot-caption">
          <LatexText latex={summaryLatex} />
        </p>
      )}
      <div className="strip-grid">
        <div className="strip-sidebar">
          <div className="strip-panel strip-panel--inputs">
            <div className="strip-panel-header">
              <h4>Strip Inputs</h4>
              {showMk1 && onReset ? (
                <button type="button" onClick={onReset} className="strip-reset">
                  Reset to MK1
                </button>
              ) : null}
            </div>
            <div className="strip-sections">
              <div className="strip-sections-column">
                {leftSections.map((section) => (
                  <div key={section.title} className="strip-section">
                    <h5 className="strip-section-title">{section.title}</h5>
                    <div className="strip-fields">
                      {section.keys.map((key) => {
                        const field = fieldMap[key];
                        if (!field) {
                          return null;
                        }
                        const value = safeInputs[key] ?? "";
                        const sliderValue = Number.isFinite(value) ? value : field.min;
                        const inputValue = Number.isFinite(value) ? value : "";
                        return (
                          <label key={key} className="strip-field">
                            <span className="strip-field-label">
                              <LatexText latex={field.label} />
                              {field.unit ? <span className="strip-unit">({field.unit})</span> : null}
                            </span>
                            <div className="strip-slider">
                              <input
                                type="range"
                                min={field.min}
                                max={field.max}
                                step={field.step}
                                value={sliderValue}
                                onChange={handleFieldChange(key)}
                              />
                              <input
                                className="strip-number"
                                type="number"
                                min={field.min}
                                max={field.max}
                                step={field.step}
                                value={inputValue}
                                onChange={handleFieldChange(key)}
                              />
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="strip-sections-column">
                {rightSections.map((section) => (
                  <div key={section.title} className="strip-section">
                    <h5 className="strip-section-title">{section.title}</h5>
                    <div className="strip-fields">
                      {section.keys.map((key) => {
                        const field = fieldMap[key];
                        if (!field) {
                          return null;
                        }
                        const value = safeInputs[key] ?? "";
                        const sliderValue = Number.isFinite(value) ? value : field.min;
                        const inputValue = Number.isFinite(value) ? value : "";
                        return (
                          <label key={key} className="strip-field">
                            <span className="strip-field-label">
                              <LatexText latex={field.label} />
                              {field.unit ? <span className="strip-unit">({field.unit})</span> : null}
                            </span>
                            <div className="strip-slider">
                              <input
                                type="range"
                                min={field.min}
                                max={field.max}
                                step={field.step}
                                value={sliderValue}
                                onChange={handleFieldChange(key)}
                              />
                              <input
                                className="strip-number"
                                type="number"
                                min={field.min}
                                max={field.max}
                                step={field.step}
                                value={inputValue}
                                onChange={handleFieldChange(key)}
                              />
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="strip-panel strip-panel--outputs">
            <h4>Operating Line Outputs</h4>
            {outputRows.length === 0 ? (
              <p className="plot-placeholder">Run Compute to populate outputs.</p>
            ) : (
              <table className="strip-output-table">
                <tbody>
                  {outputRows.map((row, idx) => (
                    row.type === "heading"
                      ? (
                        <tr key={`heading-${idx}`} className="strip-output-heading">
                          <td colSpan={2}><LatexText latex={row.label} /></td>
                        </tr>
                      )
                      : (
                        <tr key={`row-${idx}`}>
                          <td><LatexText latex={row.label} /></td>
                          <td>{row.value}</td>
                        </tr>
                      )
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <div className="plot-card strip-plot-card">
          <div className="plot-frame plot-frame--strip">
            <Plot
              data={traces}
              layout={{
                autosize: true,
                title: { text: labels.title, font: { color: "#f3eaff", size: 18 } },
                xaxis: { title: { text: labels.x, standoff: 14, font: { color: "#f3eaff", size: 15 } }, tickfont: { color: "#f3eaff", size: 12 }, color: "#f3eaff", automargin: true, gridcolor: "rgba(255, 214, 153, 0.45)", griddash: "dot", showgrid: true, range: xRange },
                yaxis: { title: { text: labels.y, standoff: 14, font: { color: "#f3eaff", size: 15 } }, tickfont: { color: "#f3eaff", size: 12 }, color: "#f3eaff", automargin: true, gridcolor: "rgba(255, 214, 153, 0.45)", griddash: "dot", showgrid: true, range: yRange },
                margin: { t: 90, r: 90, l: 80, b: 80 },
                paper_bgcolor: "rgba(0,0,0,0)",
                plot_bgcolor: "rgba(255,255,255,0.3)",
                font: { color: "#f3eaff", size: 13 },
                hoverlabel: {
                  bgcolor: "#ffffff",
                  bordercolor: "#000000",
                  font: { color: "#000000", size: 12 }
                },
                showlegend: true,
                legend: {
                  x: 0.98,
                  y: 0.98,
                  xanchor: "right",
                  yanchor: "top",
                  bgcolor: "rgba(240,240,240,0.8)",
                  bordercolor: "rgba(0,0,0,0.2)",
                  borderwidth: 1,
                  font: { color: "#000000", size: 11, family: "Times New Roman Bold, Times New Roman, serif" }
                }
              }}
              config={plotConfig}
              revision={revision}
              style={{ width: "100%", height: "100%" }}
              useResizeHandler
            />
          </div>
        </div>
      </div>
      {intersection?.f_m2 && intersection?.pi_c && (
        <p className="plot-caption">
          {`Intersection: f(M2)=${intersection.f_m2.toFixed(3)}, pi_c=${intersection.pi_c.toFixed(2)}, status=${intersection.status}`}
        </p>
      )}
    </div>
  );
}
