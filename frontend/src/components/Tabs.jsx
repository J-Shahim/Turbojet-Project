export default function Tabs({ tabs, activeTab, onTabChange, className }) {
  const classes = ["tabs", className].filter(Boolean).join(" ");
  return (
    <div className={classes}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={`tab-button${activeTab === tab.key ? " active" : ""}`}
          onClick={() => onTabChange(tab.key)}
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
