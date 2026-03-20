## Compressor Strip Model: limitations and pipeline roadmap

This tab visualizes a 2-D cascade strip-model map. It is intended for qualitative trend studies and matching intuition, not detailed compressor design.

### Limitations (current behavior)
- **2-D cascade assumption:** Blade rows are modeled as an infinite 2-D cascade with constant flow angles.
- **Constant axial velocity:** The model assumes constant $c_z$ through the compressor.
- **No radial variation:** Radial equilibrium, tip-clearance, and endwall effects are neglected.
- **No stage-by-stage geometry:** All stages are assumed identical; stage loading and efficiency are not varied by stage.
- **Losses simplified:** Losses are embedded in the linear strip-model relation and do not account for detailed blade aerodynamics.
- **No surge/stall model:** The viability indicator only checks geometric/operating-line feasibility, not actual stability margin.
- **No Reynolds/Mach corrections:** Map shifts due to Reynolds number, Mach number, or corrected speed variations are not modeled.
- **Fuel and burner coupling simplified:** The $F_1$ matching line uses ideal relations and does not include combustor chemistry or temperature-dependent properties.

### Plot-specific notes
- **Speed lines:** Derived from the strip-model $\psi$-$\phi$ relation; not calibrated to a real compressor map.
- **Operating line:** Uses nozzle/geometry relations; does not enforce surge margin or choke boundaries explicitly.
- **Intersection marker:** Indicates mathematical consistency with the model, not certified operability.

### Future pipeline (short term)
- Add simple loss models for incidence, deviation, and diffusion factor.
- Include corrected speed scaling and Reynolds corrections for map shifts.
- Add a basic surge-margin indicator using user-defined stall line constraints.
- Introduce stage-count and stage-loading distribution options.

### Future pipeline (long term)
- Replace strip-model with calibrated map data and fitted efficiency contours.
- Add 3-D correction factors (tip-clearance, endwall, and secondary-flow losses).
- Couple with detailed combustor model for temperature-dependent matching.
- Include blade metal limits and thermal constraints to bound feasible operating points.
