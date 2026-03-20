import Plot from "react-plotly.js";

const areaToDiameter = (area) => {
  if (!Number.isFinite(area) || area <= 0) {
    return 0;
  }
  return Math.sqrt((4 * area) / Math.PI);
};

const getField = (row, keys) => {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null) {
      return row[key];
    }
  }
  const lower = Object.keys(row).reduce((acc, key) => {
    acc[key.toLowerCase()] = row[key];
    return acc;
  }, {});
  for (const key of keys) {
    const value = lower[key.toLowerCase()];
    if (value !== undefined && value !== null) {
      return value;
    }
  }
  return undefined;
};

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const stationToX = (stationId, fallback) => {
  if (stationId === "e") {
    return 9;
  }
  const num = Number(stationId);
  if (Number.isFinite(num)) {
    return num;
  }
  return fallback;
};

const formatNumber = (value, digits = 2) => {
  if (!Number.isFinite(value)) {
    return "--";
  }
  return value.toFixed(digits);
};

export default function Mark4ThermoSchematic({ tables }) {
  const stationRows = tables?.station_table_raw?.rows || tables?.station_table?.rows || [];

  if (!stationRows.length) {
    return <div className="plot-placeholder">Run the solver to render plots.</div>;
  }

  const stations = stationRows.map((row, index) => {
    const stationIdRaw = getField(row, ["station", "Station"]);
    const stationId = stationIdRaw !== undefined && stationIdRaw !== null
      ? String(stationIdRaw)
      : `S${index + 1}`;
    const area = toNumber(getField(row, ["A", "area"]));
    const mach = toNumber(getField(row, ["M", "mach"]));
    const temp = toNumber(getField(row, ["T", "temp"]));
    const tempTotal = toNumber(getField(row, ["Tt"]));
    const pres = toNumber(getField(row, ["P", "pressure"]));
    const presTotal = toNumber(getField(row, ["Pt"]));
    const x = toNumber(getField(row, ["x", "X"])) ?? stationToX(stationId, index);
    const diameter = areaToDiameter(area);
    return {
      id: stationId,
      x,
      area,
      mach,
      temp,
      tempTotal,
      pres,
      presTotal,
      radius: diameter * 0.5,
    };
  }).filter((station) => Number.isFinite(station.x));

  const stationsSorted = [...stations].sort((a, b) => a.x - b.x);
  const xs = stationsSorted.map((station) => station.x);
  const yTop = stationsSorted.map((station) => station.radius || 0);
  const yBottom = stationsSorted.map((station) => -(station.radius || 0));
  const blueLineColor = "#4f9cff";
  const orangeLineColor = "#ff9f1c";
  const orangeFillColor = "rgba(255, 159, 28, 0.18)";
  const blueFillColor = "rgba(79,156,255,0.22)";

  const outlineTrace = {
    x: [...xs, ...xs.slice().reverse()],
    y: [...yTop, ...yBottom.slice().reverse()],
    type: "scatter",
    mode: "lines",
    fill: "toself",
    fillcolor: "rgba(0,0,0,0)",
    line: { color: "rgba(0,0,0,0)", width: 0 },
    hoverinfo: "skip",
    showlegend: false,
    name: "Geometry"
  };

  const inletStart = stationsSorted.find((station) => String(station.id) === "0")?.x ?? xs[0];
  const inletEnd = stationsSorted.find((station) => String(station.id) === "1")?.x ?? xs[1];
  const inletMin = Math.min(inletStart, inletEnd);
  const inletMax = Math.max(inletStart, inletEnd);
  const inletXs = [];
  const inletYTop = [];
  const inletYBottom = [];
  const restXs = [];
  const restYTop = [];
  const restYBottom = [];
  stationsSorted.forEach((station, idx) => {
    if (station.x >= inletMin && station.x <= inletMax) {
      inletXs.push(station.x);
      inletYTop.push(yTop[idx]);
      inletYBottom.push(yBottom[idx]);
    }
    if (station.x >= inletMax) {
      restXs.push(station.x);
      restYTop.push(yTop[idx]);
      restYBottom.push(yBottom[idx]);
    }
  });

  const inletFillTrace = inletXs.length >= 2
    ? {
        x: [...inletXs, ...inletXs.slice().reverse()],
        y: [...inletYTop, ...inletYBottom.slice().reverse()],
        type: "scatter",
        mode: "lines",
        fill: "toself",
        fillcolor: blueFillColor,
        line: { color: "rgba(0,0,0,0)", width: 0 },
        hoverinfo: "skip",
        showlegend: false,
        name: "Inlet Shade"
      }
    : null;

  const restFillTrace = restXs.length >= 2
    ? {
        x: [...restXs, ...restXs.slice().reverse()],
        y: [...restYTop, ...restYBottom.slice().reverse()],
        type: "scatter",
        mode: "lines",
        fill: "toself",
        fillcolor: orangeFillColor,
        line: { color: "rgba(0,0,0,0)", width: 0 },
        hoverinfo: "skip",
        showlegend: false,
        name: "Engine Shade"
      }
    : null;

  const inletTopLineTrace = inletXs.length >= 2
    ? {
        x: inletXs,
        y: inletYTop,
        type: "scatter",
        mode: "lines",
        line: { color: blueLineColor, width: 2.5 },
        hoverinfo: "skip",
        showlegend: false,
        name: "Inlet Top"
      }
    : null;

  const inletBottomLineTrace = inletXs.length >= 2
    ? {
        x: inletXs,
        y: inletYBottom,
        type: "scatter",
        mode: "lines",
        line: { color: blueLineColor, width: 2.5 },
        hoverinfo: "skip",
        showlegend: false,
        name: "Inlet Bottom"
      }
    : null;

  const topLineTrace = {
    x: restXs.length ? restXs : xs,
    y: restYTop.length ? restYTop : yTop,
    type: "scatter",
    mode: "lines",
    line: { color: orangeLineColor, width: 2.5 },
    hoverinfo: "skip",
    showlegend: false,
    name: "Geometry Top"
  };

  const bottomLineTrace = {
    x: restXs.length ? restXs : xs,
    y: restYBottom.length ? restYBottom : yBottom,
    type: "scatter",
    mode: "lines",
    line: { color: orangeLineColor, width: 2.5 },
    hoverinfo: "skip",
    showlegend: false,
    name: "Geometry Bottom"
  };

  const xEnd = xs[xs.length - 1];
  const yTopEnd = yTop[yTop.length - 1];
  const yBottomEnd = yBottom[yBottom.length - 1];
  const exitLineTrace = {
    x: [xEnd, xEnd],
    y: [yBottomEnd, yTopEnd],
    type: "scatter",
    mode: "lines",
    line: { color: "rgba(255,159,28,0.5)", width: 2, dash: "dot" },
    hoverinfo: "skip",
    showlegend: false,
    name: "Geometry Exit"
  };

  const markerColors = stationsSorted.map((station) => (
    station.mach !== null && station.mach > 1 ? "#ff6b6b" : "#5fb3ff"
  ));

  const stationTrace = {
    x: xs,
    y: xs.map(() => 0),
    type: "scatter",
    mode: "markers+text",
    text: stationsSorted.map((station) => station.id),
    textposition: "top center",
    textfont: {
      color: "#ffffff",
      size: 14,
      family: "Times New Roman Bold, Times New Roman, serif"
    },
    marker: {
      size: 10,
      color: "#ffffff",
      line: { color: markerColors, width: 2 }
    },
    customdata: stationsSorted.map((station) => [
      station.mach,
      station.temp,
      station.tempTotal,
      station.pres,
      station.presTotal,
      station.area
    ]),
    hovertemplate:
      "Station %{text}<br>" +
      "M: %{customdata[0]:.2f}<br>" +
      "T: %{customdata[1]:.1f} K<br>" +
      "Tt: %{customdata[2]:.1f} K<br>" +
      "P: %{customdata[3]:.0f} Pa<br>" +
      "Pt: %{customdata[4]:.0f} Pa<br>" +
      "A: %{customdata[5]:.3f} m^2" +
      "<extra></extra>",
    showlegend: false,
    name: "Stations"
  };

  const layout = {
    autosize: true,
    margin: { t: 60, r: 20, l: 20, b: 40 },
    title: { text: "Turbojet Engine - Real-time Thermodynamic Analysis", font: { color: "#f3eaff", size: 16 } },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    xaxis: {
      title: { text: "Axial Position", font: { color: "#f3eaff", size: 14 } },
      tickfont: { color: "#f3eaff", size: 11 },
      color: "#f3eaff",
      showgrid: false,
      zeroline: false
    },
    yaxis: {
      showgrid: false,
      zeroline: false,
      showticklabels: false
    }
  };

  const plotConfig = {
    responsive: true
  };

  return (
    <div className="schematic-grid">
      <div className="plot-card">
        <div className="plot-frame plot-frame--schematic">
          <Plot
            data={[
              outlineTrace,
              ...(inletFillTrace ? [inletFillTrace] : []),
              ...(restFillTrace ? [restFillTrace] : []),
              ...(inletTopLineTrace ? [inletTopLineTrace] : []),
              ...(inletBottomLineTrace ? [inletBottomLineTrace] : []),
              topLineTrace,
              bottomLineTrace,
              exitLineTrace,
              stationTrace
            ]}
            layout={layout}
            config={plotConfig}
            style={{ width: "100%", height: "100%" }}
            useResizeHandler
          />
        </div>
      </div>
      <div className="meta-panel">
        <h4>Turbojet Metadata (MK1)</h4>
        <table className="meta-table">
          <thead>
            <tr>
              <th>St</th>
              <th>M</th>
              <th>T</th>
              <th>Tt</th>
              <th>P</th>
              <th>Pt</th>
            </tr>
          </thead>
          <tbody>
            {stationsSorted.map((station) => (
              <tr key={station.id}>
                <td>{station.id}</td>
                <td>{formatNumber(station.mach, 2)}</td>
                <td>{formatNumber(station.temp, 0)}</td>
                <td>{formatNumber(station.tempTotal, 0)}</td>
                <td>{formatNumber(station.pres ? station.pres / 1000 : null, 1)}</td>
                <td>{formatNumber(station.presTotal ? station.presTotal / 1000 : null, 1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="meta-legend">
          <span className="meta-swatch subsonic" />
          <span>Subsonic (M &lt; 1)</span>
        </div>
        <div className="meta-legend">
          <span className="meta-swatch supersonic" />
          <span>Supersonic (M &gt; 1)</span>
        </div>
      </div>
    </div>
  );
}
