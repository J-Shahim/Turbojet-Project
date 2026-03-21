import { useMemo } from "react";
import Plot from "react-plotly.js";
import LatexText from "./LatexText";
import TableView from "./TableView";

export default function Mark4TbarVsMe({ data }) {
  if (!data) {
    return <div className="plot-placeholder">Run the solver to render plots.</div>;
  }

  if (data.error) {
    return <div className="plot-placeholder">{data.error}</div>;
  }

  const { series, labels } = data;
  const pick = series.pick || {};
  const plotConfig = {
    responsive: true,
    mathjax: "cdn"
  };

  const traces = [
    {
      x: series.me,
      y: series.tbar,
      type: "scatter",
      mode: "lines",
      name: "Thrust curve",
      line: { color: "#ff9f1c" }
    }
  ];

  if (pick.me && pick.tbar) {
    traces.push({
      x: [pick.me],
      y: [pick.tbar],
      type: "scatter",
      mode: "markers",
      name: "Pick",
      marker: { color: "#ff9f1c", size: 9 }
    });
  }

  const captionLatex = pick.me && pick.tbar
    ? String.raw`\mathrm{Pick:}\ M_e=${pick.me.toFixed(3)},\ \mathbb{T}/(P_0A_0)=${pick.tbar.toFixed(3)}`
    : "";

  const pickTable = useMemo(() => {
    if (!Number.isFinite(pick?.me) || !Number.isFinite(pick?.tbar)) {
      return null;
    }
    const format = (value, digits = 4) => (Number.isFinite(value) ? value.toFixed(digits) : "--");
    const aeOverA0 = (Number.isFinite(pick.ae_over_a8) && Number.isFinite(series?.params?.a8_over_a0))
      ? pick.ae_over_a8 * series.params.a8_over_a0
      : null;
    return {
      columns: ["Me (D.L.)", "Tbar (D.L.)", "Pe/P0 (D.L.)", "Ae/A8 (D.L.)", "Ae/A0 (D.L.)"],
      rows: [
        {
          "Me (D.L.)": format(pick.me, 4),
          "Tbar (D.L.)": format(pick.tbar, 4),
          "Pe/P0 (D.L.)": format(pick.pe_over_p0, 4),
          "Ae/A8 (D.L.)": format(pick.ae_over_a8, 4),
          "Ae/A0 (D.L.)": format(aeOverA0, 4)
        }
      ]
    };
  }, [pick, series]);

  return (
    <div>
      <div className="plot-card">
        <div className="plot-frame plot-frame--performance">
          <Plot
            data={traces}
            layout={{
              autosize: true,
              title: { text: labels.title, font: { color: "#f3eaff", size: 18 } },
              xaxis: { title: { text: labels.x, standoff: 14, font: { color: "#f3eaff", size: 15 } }, tickfont: { color: "#f3eaff", size: 12 }, color: "#f3eaff", automargin: true, gridcolor: "rgba(255, 214, 153, 0.45)", griddash: "dot", showgrid: true },
              yaxis: { title: { text: labels.y, standoff: 14, font: { color: "#f3eaff", size: 15 } }, tickfont: { color: "#f3eaff", size: 12 }, color: "#f3eaff", automargin: true, gridcolor: "rgba(255, 214, 153, 0.45)", griddash: "dot", showgrid: true },
              margin: { t: 90, r: 30, l: 80, b: 80 },
              paper_bgcolor: "rgba(0,0,0,0)",
              plot_bgcolor: "rgba(255,255,255,0.08)",
              font: { color: "#f3eaff", size: 13 },
              showlegend: true,
              legend: {
                x: 0.98,
                y: 0.98,
                xanchor: "right",
                yanchor: "top",
                bgcolor: "rgba(0,0,0,0.35)",
                bordercolor: "rgba(255,255,255,0.15)",
                borderwidth: 1,
                font: { color: "#f3eaff", size: 12 }
              }
            }}
            config={plotConfig}
            style={{ width: "100%", height: "100%" }}
            useResizeHandler
          />
        </div>
        {pick.me && pick.tbar && (
          <p className="plot-caption">
            <LatexText latex={captionLatex} />
          </p>
        )}
      </div>
      {pickTable ? <TableView title="Selected Point" table={pickTable} /> : null}
    </div>
  );
}
