import { useEffect, useMemo, useRef, useState } from "react";
import Tabs from "./components/Tabs";
import InputsPanel from "./components/InputsPanel";
import TableView from "./components/TableView";
import Mark4Diagnostics from "./components/Mark4Diagnostics";
import Mark4OperatingLine from "./components/Mark4OperatingLine";
import Mark4TbarVsMe from "./components/Mark4TbarVsMe";
import Mark4ThermoSchematic from "./components/Mark4ThermoSchematic";
import IdealAnalysis from "./components/IdealAnalysis";
import StripModel from "./components/StripModel";
import AnalysisView from "./components/analysis/AnalysisView";
import NotebookMarkdown from "./components/analysis/NotebookMarkdown";
import LatexText from "./components/LatexText";
import FuelAnalysis from "./components/FuelAnalysis";
import { postJson } from "./api/client";
import inputsTablesNotes from "./analysis/inputsTablesNotes.md?raw";
import perfDiagnosticsNotes from "./analysis/perfDiagnosticsNotes.md?raw";
import stripModelNotes from "./analysis/stripModelNotes.md?raw";
import purposeNotes from "./analysis/purposeNotes.md?raw";

const DEFAULT_INPUTS = {
  M0: 3.0,
  T0: 216.0725,
  P0: 101325,
  gamma: 1.4,
  R: 287.0,
  cp: 1004.0,
  pi_d: 1.0,
  pi_b: 1.0,
  pi_n: 1.0,
  Tt4: 1944.0,
  eta_b: 1.0,
  lhv: 43000000,
  f_fuel: 0.23,
  A1: 45.0,
  A15: 12.0,
  A2: 14.0,
  A3: 2.5,
  A4: 1.0,
  A5: 14.0,
  A8: 4.0,
  Ae: 0.0,
  M5: 0.0,
  nozzle_fully_expanded: true
};

const MAIN_TABS = [
  { key: "turbojet", label: "Turbojet Analysis" },
  { key: "fuel", label: "Fuel Analysis" }
];

const SIM_TABS = [
  { key: "tables", label: "Inputs + Tables" },
  { key: "mark4", label: "Performance + Diagnostics" },
  { key: "strip", label: "Compressor Strip Model" }
];

export default function App() {
  const [activeMainTab, setActiveMainTab] = useState("turbojet");
  const [turbojetTab, setTurbojetTab] = useState("purpose");
  const [activeSimTab, setActiveSimTab] = useState("tables");
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  const [tables, setTables] = useState(null);
  const [diagnostics, setDiagnostics] = useState(null);
  const [operatingLine, setOperatingLine] = useState(null);
  const [tbarVsMe, setTbarVsMe] = useState(null);
  const [idealAnalysis, setIdealAnalysis] = useState(null);
  const [stripModel, setStripModel] = useState(null);
  const [stripInputs, setStripInputs] = useState(null);
  const [stripRevision, setStripRevision] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const autoComputeRef = useRef(false);

  const handleInputChange = (key, value) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const handleCompute = async () => {
    setLoading(true);
    setError("");
    try {
      const [
        mk1Response,
        diagResponse,
        operatingResponse,
        tbarResponse,
        idealResponse,
        stripResponse
      ] = await Promise.all([
        postJson("/api/mk1/solve", inputs),
        postJson("/api/plots/mark4/diagnostics", inputs),
        postJson("/api/plots/mark4/operating-line", inputs),
        postJson("/api/plots/mark4/tbar-vs-me", inputs),
        postJson("/api/plots/ideal/tau-sweeps", inputs),
        postJson("/api/plots/strip-model/map", { ...inputs, strip: stripInputs })
      ]);
      setTables(mk1Response);
      setDiagnostics(diagResponse);
      setOperatingLine(operatingResponse);
      setTbarVsMe(tbarResponse);
      setIdealAnalysis(idealResponse);
      setStripModel(stripResponse);
      setStripRevision((prev) => prev + 1);
      if (stripResponse?.params) {
        setStripInputs(stripResponse.params);
      }
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

  const handleStripInputChange = (key, value) => {
    setStripInputs((prev) => ({ ...(prev || {}), [key]: value }));
  };

  const handleStripReset = () => {
    if (stripModel?.mk1_params) {
      setStripInputs(stripModel.mk1_params);
    } else if (stripModel?.params) {
      setStripInputs(stripModel.params);
    }
  };

  const warnings = useMemo(() => tables?.warnings || [], [tables]);
  const computedAe = useMemo(() => {
    const rows = tables?.station_table_raw?.rows;
    if (!Array.isArray(rows)) {
      return null;
    }
    const exitRow = rows.find((row) => String(row.station) === "e")
      || rows.find((row) => String(row.station) === "9");
    if (!exitRow) {
      return null;
    }
    const value = Number(exitRow.A);
    return Number.isFinite(value) ? value : null;
  }, [tables]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Turbojet Web Design Tool</h1>
      </header>

      <Tabs tabs={MAIN_TABS} activeTab={activeMainTab} onTabChange={setActiveMainTab} />

      {activeMainTab === "turbojet" && (
        <section className="analysis-tab">
          <Tabs
            tabs={[
              { key: "purpose", label: "Purpose" },
              { key: "analysis", label: "Analysis" },
              { key: "simulations", label: "Simulations" }
            ]}
            activeTab={turbojetTab}
            onTabChange={setTurbojetTab}
            className="tabs-sub"
          />

          {turbojetTab === "purpose" && (
            <div className="analysis-content">
              <NotebookMarkdown content={purposeNotes} />
            </div>
          )}

          {turbojetTab === "analysis" && <AnalysisView />}

          {turbojetTab === "simulations" && (
            <section className="simulations-tab">
              <Tabs
                tabs={SIM_TABS}
                activeTab={activeSimTab}
                onTabChange={setActiveSimTab}
                className="tabs-sub"
              />

              <div className="action-bar">
                <button onClick={handleCompute} disabled={loading} type="button">
                  {loading ? "Running..." : "Compute"}
                </button>
                {error ? <span className="error">{error}</span> : null}
              </div>

              {activeSimTab === "tables" && (
                <section className="tab-panel">
                  <div className="section-header">
                    <h3>Inputs + Tables</h3>
                    <p>
                      This panel runs the MK1 solver and summarizes the station-by-station results.
                      Set ambient conditions, gas properties, losses, and geometry on the left, then
                      click Compute to refresh the tables on the right. Use the warnings list to catch
                      non-physical inputs and check the Status table for solver flags.
                    </p>
                  </div>
                  <div className="content-grid">
                    <InputsPanel inputs={inputs} onChange={handleInputChange} computedAe={computedAe} />
                    <div className="tables-panel">
                      {warnings.length > 0 && (
                        <div className="warnings-panel">
                          <h3>Warnings</h3>
                          <ul>
                            {warnings.map((warning, idx) => (
                              <li key={idx}>{warning}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <TableView title="Stations" table={tables?.station_table} />
                      <TableView title="Ratios" table={tables?.ratio_table} />
                      <details className="collapsible">
                        <summary>Status (click to expand)</summary>
                        <TableView title="Status" table={tables?.status_table} />
                      </details>
                    </div>
                  </div>
                  <NotebookMarkdown content={inputsTablesNotes} />
                </section>
              )}

              {activeSimTab === "mark4" && (
                <section className="tab-panel">
                  <div className="section-header">
                    <h3>Performance and Diagnostics Plots</h3>
                    <p>
                      These plots visualize MK1 station results. Review the
                      thermodynamic schematic to confirm geometry and station metadata. Inspect
                      diagnostics for efficiency and pressure trends, the operating line for map
                      placement, and thrust vs exit Mach to interpret nozzle response.
                    </p>
                  </div>
                  <div className="section-header">
                    <h3>Realtime Thermodynamic Schematic</h3>
                    <p>Geometry outline with station metadata sourced from MK1 tables.</p>
                  </div>
                  <Mark4ThermoSchematic tables={tables} />
                  <div className="section-header">
                    <h3>Diagnostics</h3>
                  </div>
                  <Mark4Diagnostics data={diagnostics} />
                  <div className="section-header">
                    <h3>Operating Line</h3>
                  </div>
                  <Mark4OperatingLine data={operatingLine} />
                  <div className="section-header">
                    <h3>Thrust and Exit Mach</h3>
                  </div>
                  <Mark4TbarVsMe data={tbarVsMe} />
                  <NotebookMarkdown content={perfDiagnosticsNotes} />
                </section>
              )}

              {activeSimTab === "strip" && (
                <section className="tab-panel">
                  <div className="section-header">
                    <h3>Compressor Strip Model</h3>
                    <p>
                      This plot uses an idealized strip model to visualize compressor map behavior.
                      Adjust inlet conditions to explore the shift in operating lines and stage loading.
                    </p>
                  </div>
                  <StripModel
                    data={stripModel}
                    revision={stripRevision}
                    onInputChange={handleStripInputChange}
                    onReset={handleStripReset}
                  />
                  <NotebookMarkdown content={stripModelNotes} />
                </section>
              )}
            </section>
          )}
        </section>
      )}

      {activeMainTab === "fuel" && <FuelAnalysis simF={inputs.f_fuel} />}
    </div>
  );
}
