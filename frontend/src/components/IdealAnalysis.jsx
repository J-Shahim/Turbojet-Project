import Plot from "react-plotly.js";
import LatexText from "./LatexText";

export default function IdealAnalysis({ data }) {
  if (!data) {
    return <div className="plot-placeholder">Run the solver to render plots.</div>;
  }

  if (data.error) {
    return <div className="plot-placeholder">{data.error}</div>;
  }

  const { series, labels, params, warnings } = data;
  const plotConfig = {
    responsive: true,
    mathjax: "cdn"
  };

  const layoutBase = {
    autosize: true,
    margin: { t: 90, r: 30, l: 80, b: 80 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(255,255,255,0.08)",
    font: { color: "#f3eaff", size: 13 },
    showlegend: false
  };

  const tauCMax = 7;
  const tauCMin = Array.isArray(series?.tau_c?.x) && series.tau_c.x.length
    ? Math.min(...series.tau_c.x.filter((value) => Number.isFinite(value)))
    : 0;
  const tauCRange = [tauCMin, tauCMax];

  const summaryLatex = params
    ? String.raw`\tau_r=${params.tau_r_ref.toFixed(2)},\ \tau_c=${params.tau_c_ref.toFixed(2)},\ \tau_\lambda=${params.tau_lambda.toFixed(2)},\ \tau_f=${params.tau_f.toFixed(1)}`
    : "";

  return (
    <div>
      {summaryLatex && (
        <p className="plot-caption">
          <LatexText latex={summaryLatex} />
        </p>
      )}
      {warnings?.tau_c && (
        <p className="plot-caption">{warnings.tau_c}</p>
      )}
      {warnings?.tau_r && (
        <p className="plot-caption">{warnings.tau_r}</p>
      )}
      <div className="tau-sweeps-grid">
        <div className="tau-sweeps-column">
          <div className="plot-card">
            <div className="plot-frame plot-frame--performance">
              <Plot
                data={[{
                  x: series.tau_c.x,
                  y: series.tau_c.tbar,
                  type: "scatter",
                  mode: "lines",
                  name: labels.tbar,
                  line: { color: "#ff9f1c" }
                }]}
                layout={{
                  ...layoutBase,
                  title: { text: labels.titles.tbar_tau_c, font: { color: "#f3eaff", size: 18 } },
                  xaxis: { title: { text: labels.tau_c, standoff: 14, font: { color: "#f3eaff", size: 15 } }, tickfont: { color: "#f3eaff", size: 12 }, color: "#f3eaff", automargin: true, gridcolor: "rgba(255, 214, 153, 0.45)", griddash: "dot", showgrid: true, range: tauCRange },
                  yaxis: { title: { text: labels.tbar, standoff: 14, font: { color: "#f3eaff", size: 15 } }, tickfont: { color: "#f3eaff", size: 12 }, color: "#f3eaff", automargin: true, gridcolor: "rgba(255, 214, 153, 0.45)", griddash: "dot", showgrid: true }
                }}
                config={plotConfig}
                style={{ width: "100%", height: "100%" }}
                useResizeHandler
              />
            </div>
          </div>
          <div className="plot-card">
            <div className="plot-frame plot-frame--performance">
              <Plot
                data={[{
                  x: series.tau_r.x,
                  y: series.tau_r.tbar,
                  type: "scatter",
                  mode: "lines",
                  name: labels.tbar,
                  line: { color: "#ff9f1c" }
                }]}
                layout={{
                  ...layoutBase,
                  title: { text: labels.titles.tbar_tau_r, font: { color: "#f3eaff", size: 18 } },
                  xaxis: { title: { text: labels.tau_r, standoff: 14, font: { color: "#f3eaff", size: 15 } }, tickfont: { color: "#f3eaff", size: 12 }, color: "#f3eaff", automargin: true, gridcolor: "rgba(255, 214, 153, 0.45)", griddash: "dot", showgrid: true },
                  yaxis: { title: { text: labels.tbar, standoff: 14, font: { color: "#f3eaff", size: 15 } }, tickfont: { color: "#f3eaff", size: 12 }, color: "#f3eaff", automargin: true, gridcolor: "rgba(255, 214, 153, 0.45)", griddash: "dot", showgrid: true }
                }}
                config={plotConfig}
                style={{ width: "100%", height: "100%" }}
                useResizeHandler
              />
            </div>
          </div>
        </div>
        <div className="tau-sweeps-column">
          <div className="plot-card">
            <div className="plot-frame plot-frame--performance">
              <Plot
                data={[{
                  x: series.tau_c.x,
                  y: series.tau_c.isp,
                  type: "scatter",
                  mode: "lines",
                  name: labels.isp,
                  line: { color: "#5fb3ff" }
                }]}
                layout={{
                  ...layoutBase,
                  title: { text: labels.titles.isp_tau_c, font: { color: "#f3eaff", size: 18 } },
                  xaxis: { title: { text: labels.tau_c, standoff: 14, font: { color: "#f3eaff", size: 15 } }, tickfont: { color: "#f3eaff", size: 12 }, color: "#f3eaff", automargin: true, gridcolor: "rgba(255, 214, 153, 0.45)", griddash: "dot", showgrid: true, range: tauCRange },
                  yaxis: { title: { text: labels.isp, standoff: 14, font: { color: "#f3eaff", size: 15 } }, tickfont: { color: "#f3eaff", size: 12 }, color: "#f3eaff", automargin: true, gridcolor: "rgba(255, 214, 153, 0.45)", griddash: "dot", showgrid: true }
                }}
                config={plotConfig}
                style={{ width: "100%", height: "100%" }}
                useResizeHandler
              />
            </div>
          </div>
          <div className="plot-card">
            <div className="plot-frame plot-frame--performance">
              <Plot
                data={[{
                  x: series.tau_r.x,
                  y: series.tau_r.isp,
                  type: "scatter",
                  mode: "lines",
                  name: labels.isp,
                  line: { color: "#5fb3ff" }
                }]}
                layout={{
                  ...layoutBase,
                  title: { text: labels.titles.isp_tau_r, font: { color: "#f3eaff", size: 18 } },
                  xaxis: { title: { text: labels.tau_r, standoff: 14, font: { color: "#f3eaff", size: 15 } }, tickfont: { color: "#f3eaff", size: 12 }, color: "#f3eaff", automargin: true, gridcolor: "rgba(255, 214, 153, 0.45)", griddash: "dot", showgrid: true },
                  yaxis: { title: { text: labels.isp, standoff: 14, font: { color: "#f3eaff", size: 15 } }, tickfont: { color: "#f3eaff", size: 12 }, color: "#f3eaff", automargin: true, gridcolor: "rgba(255, 214, 153, 0.45)", griddash: "dot", showgrid: true }
                }}
                config={plotConfig}
                style={{ width: "100%", height: "100%" }}
                useResizeHandler
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
