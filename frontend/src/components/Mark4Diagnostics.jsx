import Plot from "react-plotly.js";
import LatexText from "./LatexText";

export default function Mark4Diagnostics({ data }) {
  if (!data) {
    return <div className="plot-placeholder">Run the solver to render plots.</div>;
  }

  const { series, labels, title } = data;
  const stationTicks = series.station_labels
    ? {
        tickmode: "array",
        tickvals: series.x,
        ticktext: series.station_labels
      }
    : {};

  const layoutBase = {
    autosize: true,
    margin: { t: 90, r: 30, l: 80, b: 80 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(255,255,255,0.08)",
    font: { color: "#f3eaff", size: 13 },
    showlegend: true,
    legend: {
      x: 0.02,
      y: 0.98,
      bgcolor: "rgba(0,0,0,0.35)",
      bordercolor: "rgba(255,255,255,0.15)",
      borderwidth: 1,
      font: { color: "#f3eaff", size: 12 }
    }
  };

  const plotConfig = {
    responsive: true,
    mathjax: "cdn"
  };

  const ensureUnits = (label, unitsLatex) => {
    if (!label) {
      return unitsLatex;
    }
    const lower = String(label).toLowerCase();
    if (lower.includes("kg") || lower.includes("k)")) {
      return label;
    }
    return `${label}\\ (\\mathrm{${unitsLatex}})`;
  };

  const paddedRange = (values, padRatio = 0.1) => {
    if (!Array.isArray(values)) {
      return undefined;
    }
    const clean = values.filter((value) => Number.isFinite(value));
    if (!clean.length) {
      return undefined;
    }
    const min = Math.min(...clean);
    const max = Math.max(...clean);
    const span = max - min;
    const pad = (span || Math.abs(max) || 1) * padRatio;
    return [min - pad, max + pad];
  };

  const ptRange = paddedRange(series.pt_ratio);
  const ttRange = paddedRange(series.tt_ratio);
  const machRange = paddedRange(series.mach);
  const tsRange = paddedRange(series.ts?.t);
  const hsRange = paddedRange(series.hs?.h);

  const tsXLabel = ensureUnits(labels?.ts?.x, "kJ/(kg\\cdot K)");
  const tsYLabel = ensureUnits(labels?.ts?.y, "K");
  const hsXLabel = ensureUnits(labels?.hs?.x, "kJ/(kg\\cdot K)");
  const hsYLabel = ensureUnits(labels?.hs?.y, "MJ/kg");

  return (
    <div>
      <div className="plots-grid">
        <div className="plot-card">
          <h3><LatexText latex={title} /></h3>
          <div className="plot-frame plot-frame--diagnostics">
            <Plot
              data={[{
                x: series.x,
                y: series.pt_ratio,
                type: "scatter",
                mode: "lines+markers",
                name: labels.pt_ratio,
                line: { color: "#ff9f1c" },
                marker: { color: "#ff9f1c" },
                showlegend: true
              }]}
              layout={{
                ...layoutBase,
                title: { text: labels.pt_ratio, font: { color: "#f3eaff", size: 18 } },
                xaxis: { title: { text: labels.x, standoff: 14, font: { color: "#f3eaff", size: 15 } }, tickfont: { color: "#f3eaff", size: 12 }, color: "#f3eaff", automargin: true, gridcolor: "rgba(255, 214, 153, 0.45)", griddash: "dot", showgrid: true, ...stationTicks },
                yaxis: { title: { text: labels.pt_ratio, standoff: 14, font: { color: "#f3eaff", size: 15 } }, tickfont: { color: "#f3eaff", size: 12 }, color: "#f3eaff", automargin: true, gridcolor: "rgba(255, 214, 153, 0.45)", griddash: "dot", showgrid: true, range: ptRange }
              }}
              config={plotConfig}
              style={{ width: "100%", height: "100%" }}
              useResizeHandler
            />
          </div>
        </div>
        <div className="plot-card">
          <div className="plot-frame plot-frame--diagnostics">
            <Plot
              data={[{
                x: series.x,
                y: series.tt_ratio,
                type: "scatter",
                mode: "lines+markers",
                name: labels.tt_ratio,
                line: { color: "#ff9f1c" },
                marker: { color: "#ff9f1c" },
                showlegend: true
              }]}
              layout={{
                ...layoutBase,
                title: { text: labels.tt_ratio, font: { color: "#f3eaff", size: 18 } },
                xaxis: { title: { text: labels.x, standoff: 14, font: { color: "#f3eaff", size: 15 } }, tickfont: { color: "#f3eaff", size: 12 }, color: "#f3eaff", automargin: true, gridcolor: "rgba(255, 214, 153, 0.45)", griddash: "dot", showgrid: true, ...stationTicks },
                yaxis: { title: { text: labels.tt_ratio, standoff: 14, font: { color: "#f3eaff", size: 15 } }, tickfont: { color: "#f3eaff", size: 12 }, color: "#f3eaff", automargin: true, gridcolor: "rgba(255, 214, 153, 0.45)", griddash: "dot", showgrid: true, range: ttRange }
              }}
              config={plotConfig}
              style={{ width: "100%", height: "100%" }}
              useResizeHandler
            />
          </div>
        </div>
        <div className="plot-card">
          <div className="plot-frame plot-frame--diagnostics">
            <Plot
              data={[{
                x: series.x,
                y: series.mach,
                type: "scatter",
                mode: "lines+markers",
                name: labels.mach,
                line: { color: "#ff9f1c" },
                marker: { color: "#ff9f1c" },
                showlegend: true
              }]}
              layout={{
                ...layoutBase,
                title: { text: labels.mach, font: { color: "#f3eaff", size: 18 } },
                xaxis: { title: { text: labels.x, standoff: 14, font: { color: "#f3eaff", size: 15 } }, tickfont: { color: "#f3eaff", size: 12 }, color: "#f3eaff", automargin: true, gridcolor: "rgba(255, 214, 153, 0.45)", griddash: "dot", showgrid: true, ...stationTicks },
                yaxis: { title: { text: labels.mach, standoff: 14, font: { color: "#f3eaff", size: 15 } }, tickfont: { color: "#f3eaff", size: 12 }, color: "#f3eaff", automargin: true, gridcolor: "rgba(255, 214, 153, 0.45)", griddash: "dot", showgrid: true, range: machRange }
              }}
              config={plotConfig}
              style={{ width: "100%", height: "100%" }}
              useResizeHandler
            />
          </div>
        </div>
        <div className="plot-card">
          <div className="plot-frame plot-frame--diagnostics">
            <Plot
              data={[{
                x: series.ts.s,
                y: series.ts.t,
                type: "scatter",
                mode: "lines+markers",
                name: "T-s",
                line: { color: "#ff9f1c" },
                marker: { color: "#ff9f1c" },
                showlegend: true
              }]}
              layout={{
                ...layoutBase,
                title: { text: "T-s", font: { color: "#f3eaff", size: 18 } },
                xaxis: { title: { text: tsXLabel, standoff: 14, font: { color: "#f3eaff", size: 15 } }, tickfont: { color: "#f3eaff", size: 12 }, color: "#f3eaff", automargin: true, gridcolor: "rgba(255, 214, 153, 0.45)", griddash: "dot", showgrid: true },
                yaxis: { title: { text: tsYLabel, standoff: 14, font: { color: "#f3eaff", size: 15 } }, tickfont: { color: "#f3eaff", size: 12 }, color: "#f3eaff", automargin: true, gridcolor: "rgba(255, 214, 153, 0.45)", griddash: "dot", showgrid: true, range: tsRange }
              }}
              config={plotConfig}
              style={{ width: "100%", height: "100%" }}
              useResizeHandler
            />
          </div>
        </div>
        <div className="plot-card">
          <div className="plot-frame plot-frame--diagnostics">
            <Plot
              data={[{
                x: series.hs.s,
                y: series.hs.h,
                type: "scatter",
                mode: "lines+markers",
                name: "h-s",
                line: { color: "#ff9f1c" },
                marker: { color: "#ff9f1c" },
                showlegend: true
              }]}
              layout={{
                ...layoutBase,
                title: { text: "h-s", font: { color: "#f3eaff", size: 18 } },
                xaxis: { title: { text: hsXLabel, standoff: 14, font: { color: "#f3eaff", size: 15 } }, tickfont: { color: "#f3eaff", size: 12 }, color: "#f3eaff", automargin: true, gridcolor: "rgba(255, 214, 153, 0.45)", griddash: "dot", showgrid: true },
                yaxis: { title: { text: hsYLabel, standoff: 14, font: { color: "#f3eaff", size: 15 } }, tickfont: { color: "#f3eaff", size: 12 }, color: "#f3eaff", automargin: true, gridcolor: "rgba(255, 214, 153, 0.45)", griddash: "dot", showgrid: true, range: hsRange }
              }}
              config={plotConfig}
              style={{ width: "100%", height: "100%" }}
              useResizeHandler
            />
          </div>
        </div>
      </div>
    </div>
  );
}
