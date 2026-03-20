import Plot from "react-plotly.js";
import LatexText from "./LatexText";

export default function Mark4OperatingLine({ data }) {
  if (!data) {
    return <div className="plot-placeholder">Run the solver to render plots.</div>;
  }

  if (data.error) {
    return <div className="plot-placeholder">{data.error}</div>;
  }

  const { series, labels } = data;
  const plotConfig = {
    responsive: true,
    mathjax: "cdn"
  };
  const traces = [
    {
      x: series.f_m2,
      y: series.pi_c,
      type: "scatter",
      mode: "lines",
      name: "Operating line",
      line: { color: "#ff9f1c" }
    }
  ];

  if (series.min_point?.f_m2 && series.min_point?.pi_c) {
    traces.push({
      x: [series.min_point.f_m2],
      y: [series.min_point.pi_c],
      type: "scatter",
      mode: "markers",
      name: "Min point",
      marker: { color: "#ff8d8d", size: 8 }
    });
  }

  if (series.pick) {
    const pickIndex = series.f_m2.reduce((best, val, idx) => {
      const bestVal = series.f_m2[best];
      return Math.abs(val - series.pick) < Math.abs(bestVal - series.pick) ? idx : best;
    }, 0);
    traces.push({
      x: [series.f_m2[pickIndex]],
      y: [series.pi_c[pickIndex]],
      type: "scatter",
      mode: "markers",
      name: "Pick",
      marker: { color: "#ffffff", size: 10, line: { color: "#000", width: 1 } }
    });
  }

  return (
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
              x: 0.02,
              y: 0.98,
              xanchor: "left",
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
    </div>
  );
}
