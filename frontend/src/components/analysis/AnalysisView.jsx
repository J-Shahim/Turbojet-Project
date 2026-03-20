import { useMemo, useState } from "react";
import Tabs from "../Tabs";
import analysisMarkdown from "../../analysis/idealTurbojetAnalysis.md?raw";
import mk1FullStageMarkdown from "../../analysis/turbojetFullStageCalculationMk1.md?raw";
import NotebookMarkdown from "./NotebookMarkdown";
import AnalysisTauSweeps from "./AnalysisTauSweeps";
import AnalysisVelocityRatio from "./AnalysisVelocityRatio";
import AnalysisTbarVsMe from "./AnalysisTbarVsMe";
import AnalysisOperatingLine from "./AnalysisOperatingLine";
import AnalysisStripModel from "./AnalysisStripModel";
import AnalysisStripModelEquations from "./AnalysisStripModelEquations";

const PLOT_COMPONENTS = {
  "tau-sweeps": AnalysisTauSweeps,
  "velocity-ratio": AnalysisVelocityRatio,
  "tbar-vs-me": AnalysisTbarVsMe,
  "operating-line": AnalysisOperatingLine,
  "strip-model-map": AnalysisStripModel,
  "strip-model-equations": AnalysisStripModelEquations
};

const markerRegex = /<!--\s*PLOT:([\w-]+)\s*-->/g;

const ANALYSIS_DOCS = [
  { key: "ideal", label: "Ideal Turbojet Analysis", content: analysisMarkdown },
  { key: "mk1-full-stage", label: "Full Stage Calc MK1", content: mk1FullStageMarkdown }
];

export default function AnalysisView() {
  const [activeDoc, setActiveDoc] = useState(ANALYSIS_DOCS[0]?.key || "ideal");
  const activeContent = useMemo(() => {
    const match = ANALYSIS_DOCS.find((doc) => doc.key === activeDoc);
    return match?.content || analysisMarkdown;
  }, [activeDoc]);
  const parts = useMemo(() => activeContent.split(markerRegex), [activeContent]);

  return (
    <section className="analysis-tab">
      <Tabs
        tabs={ANALYSIS_DOCS}
        activeTab={activeDoc}
        onTabChange={setActiveDoc}
        className="tabs-sub"
      />
      <div className="analysis-content">
        {parts.map((part, idx) => {
          if (idx % 2 === 0) {
            return part.trim() ? (
              <NotebookMarkdown key={`md-${idx}`} content={part} />
            ) : null;
          }
          const PlotComponent = PLOT_COMPONENTS[part.trim()];
          if (!PlotComponent) {
            return null;
          }
          return (
            <div key={`plot-${part}-${idx}`} className="analysis-plot">
              <PlotComponent />
            </div>
          );
        })}
      </div>
    </section>
  );
}
