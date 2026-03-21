import LatexText from "./LatexText";

const INPUT_GROUPS = [
  {
    id: "atmosphere",
    title: "Atmosphere",
    fields: [
      { key: "M0", label: "M_0", step: 0.05, unit: "D.L." },
      { key: "T0", label: "T_0", step: 1, unit: "K" },
      { key: "P0", label: "P_0", step: 1000, unit: "Pa" }
    ]
  },
  {
    id: "losses",
    title: "Losses",
    fields: [
      { key: "pi_d", label: "\\pi_d", step: 0.01, unit: "D.L." },
      { key: "pi_b", label: "\\pi_b", step: 0.01, unit: "D.L." },
      { key: "pi_n", label: "\\pi_n", step: 0.01, unit: "D.L." }
    ]
  },
  {
    id: "burner",
    title: "Burner",
    fields: [
      { key: "Tt4", label: "T_{t4}", step: 10, unit: "K" },
      { key: "eta_b", label: "\\eta_b", step: 0.01, unit: "D.L." },
      { key: "f_fuel", label: "f", step: 0.005, unit: "D.L." },
      { key: "lhv", label: "LHV", step: 1e6, unit: "J/kg" }
    ]
  },
  {
    id: "geometry",
    title: "Geometry",
    fields: [
      { key: "A1", label: "A_1", step: 0.5, unit: "m^2" },
      { key: "A15", label: "A_{1.5}", step: 0.1, unit: "m^2" },
      { key: "A2", label: "A_2", step: 0.1, unit: "m^2" },
      { key: "A3", label: "A_3", step: 0.1, unit: "m^2" },
      { key: "A4", label: "A_4", step: 0.1, unit: "m^2" },
      { key: "A5", label: "A_5", step: 0.1, unit: "m^2" },
      { key: "A8", label: "A_8", step: 0.1, unit: "m^2" },
      { key: "Ae", label: "A_e", step: 0.1, unit: "m^2" },
      { key: "M5", label: "M_5", step: 0.01, unit: "D.L." }
    ]
  },
  {
    id: "gas",
    title: "Gas",
    fields: [
      { key: "gamma", label: "\\gamma", step: 0.01, unit: "D.L." },
      { key: "R", label: "R", step: 1, unit: "J/(kg*K)" },
      { key: "cp", label: "c_p", step: 1, unit: "J/(kg*K)" }
    ]
  }
];

export default function InputsPanel({ inputs, onChange, computedAe }) {
  return (
    <div className="inputs-panel">
      {INPUT_GROUPS.map((group) => (
        <section key={group.title} className={`inputs-group inputs-group--${group.id}`}>
          <h3>{group.title}</h3>
          <div className="inputs-grid">
            {group.fields.map((field) => (
              <label key={field.key} className="input-field">
                <span className="input-label">
                  <LatexText latex={field.label} />
                  {field.unit ? <span className="input-unit">({field.unit})</span> : null}
                </span>
                <input
                  type="number"
                  value={inputs[field.key]}
                  step={field.step}
                  onChange={(event) =>
                    onChange(field.key, Number(event.target.value))
                  }
                />
                {field.key === "Ae" && inputs.nozzle_fully_expanded && computedAe !== null && (
                  <span className="input-hint">
                    Computed Ae: {computedAe.toFixed(4)} m^2
                  </span>
                )}
              </label>
            ))}
          </div>
        </section>
      ))}
      <label className="input-checkbox">
        <input
          type="checkbox"
          checked={inputs.nozzle_fully_expanded}
          onChange={(event) =>
            onChange("nozzle_fully_expanded", event.target.checked)
          }
        />
        <span className="input-label">Nozzle Fully Expanded</span>
      </label>
    </div>
  );
}
