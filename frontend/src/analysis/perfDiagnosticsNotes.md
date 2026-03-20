## Performance + Diagnostics: plot scope and roadmap

This tab groups the MK1-driven plot views: thermodynamic schematic, diagnostics, operating line, thrust vs exit Mach, and ideal-cycle sweeps. The notes below focus only on plot interpretation and presentation, not on solver-level limitations already documented in the Inputs + Tables tab.

### Plot interpretation limits (current behavior)
- **Snapshot view:** Plots represent a single steady-state solve; there is no time history or transient sweep per point.
- **No uncertainty bands:** Curves and markers are deterministic; there is no uncertainty propagation or sensitivity banding.
- **No map overlay:** Operating line is shown without compressor/turbine map overlays or surge/stall boundaries.
- **Single-point coupling:** Diagnostics and thrust plots are not cross-linked (e.g., selecting a point on one plot does not update others).
- **Display scaling:** Axes are auto-scaled; outliers or extreme inputs can compress trends visually.

### Plot-specific notes
- **Thermodynamic schematic:** Uses table values for stations; geometry shapes are illustrative and not a CAD representation.
- **Diagnostics:** Plotted metrics are totals-based trends; they do not resolve component-level loss distributions.
- **Operating line:** Shows a geometric/isentropic constraint line; not a full operability envelope.
- **Thrust vs exit Mach:** Uses exit totals from MK1 tables; it is a performance sweep, not a nozzle design map.
- **Ideal sweeps:** Trend charts for $\tau_c$ and $\tau_r$; use for relative comparisons rather than absolute predictions.

### Pipeline roadmap (short term)
- Add plot metadata: units, assumptions, and input snapshot tags on each plot.
- Add optional data overlays for reference points and design targets.
- Add plot export (CSV/PNG) and consistent axis ranges across related plots.
- Add cross-highlighting between operating line, thrust plot, and diagnostics.

### Pipeline roadmap (long term)
- Add scenario/mission batching to compare multiple operating points on the same plot.
- Add uncertainty/sensitivity bands for key inputs.
- Add map overlays and stability boundaries when component maps are available.
- Add interactive performance summary cards linked to selected plot points.
