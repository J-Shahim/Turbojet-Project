import LatexText from "../LatexText";

export default function AnalysisInputs({ title, fields, values, onChange }) {
  if (!fields?.length) {
    return null;
  }

  const handleFieldChange = (key) => (event) => {
    const raw = event.target.value;
    if (raw === "") {
      onChange(key, "");
      return;
    }
    const num = Number(raw);
    onChange(key, Number.isFinite(num) ? num : raw);
  };

  return (
    <div className="analysis-inputs">
      {title ? <h4>{title}</h4> : null}
      <div className="analysis-input-grid">
        {fields.map((field) => {
          const value = values[field.key] ?? "";
          return (
            <label key={field.key} className="analysis-input-field">
              <span className="analysis-input-label">
                {field.latex ? <LatexText latex={field.label} /> : field.label}
                {field.unit ? <span className="analysis-input-unit">({field.unit})</span> : null}
              </span>
              <input
                type="number"
                min={field.min}
                max={field.max}
                step={field.step}
                value={value}
                onChange={handleFieldChange(field.key)}
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}
