## Inputs + Tables: limitations and pipeline roadmap

This tab runs the MK1 solver and shows station tables using ideal or semi-ideal assumptions. The notes below are meant to be explicit about what is and is not modeled so the results are interpreted correctly.

### Modeling scope (what is solved)
- 1-D, steady, quasi-isentropic relations with losses injected through pressure ratios.
- Constant $\gamma$, $R$, and $c_p$; no temperature-dependent properties or real-gas effects.
- No explicit component maps; compressor and turbine are represented by aggregate ratios.
- No bleed, no cooling flows, no secondary air, and no shaft mechanical losses unless added explicitly.

### Inputs: limitations and interpretation
- **Flight condition:** $M_0$, $T_0$, and $P_0$ set the freestream state; no atmosphere model or inlet spillage model is solved.
- **Supersonic inlet behavior:** Shock trains, inlet start/unstart, and shock position are not solved. Use $\pi_d$ to represent inlet loss.
- **Inlet shocks:** A reduced $\pi_d$ implies shock or diffuser loss, but the shock strength and location are not computed.
- **Nozzle shocks:** Choking is checked, but over- or under-expansion shock losses are not modeled.
- **Fuel, $T_{t4}$, and LHV:** $T_{t4}$ is treated as a direct input. Fuel-to-air ratio and LHV are not used to close an energy balance unless a non-ideal model is added.
- **Pressure ratios:** Lowering $\pi_d$, $\pi_b$, or $\pi_n$ moves the model from ideal to semi-ideal and should be interpreted as total-pressure losses.
- **Geometry:** Areas are treated as fixed inputs with no schedule, variable geometry, or actuator constraints.
- **Nozzle mode:** Fully expanded mode forces $P_e=P_0$; otherwise the nozzle exit is found from choking and mass-flow relations, not from a detailed nozzle design model.

### Tables: limitations and meaning
- **Isentropic tables:** Station values come from $\tau(M)$, $\pi(\tau)$, and $f(M)$ with losses only via user-supplied $\pi$ values.
- **No shock resolution:** The table does not solve for shock strength or location, so pressure losses only indicate that a shock is implied.
- **Choking checks only:** When $f(M)>1$ or $A<A^*$, the solver flags choking, but it does not compute shock-train behavior or spill.
- **Status table:** Flags indicate solver completion or invalid inputs, not compressor surge margin, inlet unstart, or nozzle stability.

### Non-ideal behavior notes
- **Polytropic efficiencies:** $\eta_{pc}$ and $\eta_{pe}$ are not applied in the default tables. If used, update the $\pi$-$\tau$ relations and the shaft balance consistently.
- **Semi-ideal losses:** Using $\pi_d<1$, $\pi_b<1$, or $\pi_n<1$ represents losses but does not model their physics.

### Known failure modes and checks
- If $f(M)$ exceeds 1 at any station, the solution is choked and the tables are only a partial indicator.
- If area ratios imply $A<A^*$ at a subsonic station, no valid subsonic solution exists.
- Large drops in $\pi_d$ can imply inlet unstart, but the solver will not catch the unstart condition explicitly.

### Future MK1 pipeline upgrades (short term)
- **Inlet model:** Oblique/normal shock trains, start/unstart logic, external-compression inlets, and $\pi_d(M_0, A_0/A_2)$ prediction.
- **Nozzle model:** Over- and under-expansion losses, shock location/strength, thrust coefficient, and variable-area nozzle scheduling.
- **Combustor energy balance:** Solve fuel-to-air ratio from $T_{t4}$, LHV, and $\eta_b$ with pressure loss and efficiency coupling.
- **Component efficiencies:** Polytropic compressor/turbine efficiencies and shaft mechanical efficiency applied throughout.
- **Loss bookkeeping:** Station-by-station total-pressure loss accounting and entropy tracking across each component.
- **Performance reporting:** Thrust, SFC, and mission-point summaries with uncertainty flags.

### Future MK1 pipeline upgrades (long term)
- **Property variation:** Temperature-dependent $c_p(T)$ and $\gamma(T)$ with real-gas corrections at high $T_{t4}$.
- **Bleeds and cooling:** Stage bleeds, turbine cooling flows, and secondary air impacts on mass and energy balances.
- **Component maps:** Compressor and turbine maps with corrected speed lines and efficiency contours for off-design matching.
- **Off-design solver:** Coupled inlet-compressor-burner-turbine-nozzle matching with iteration and stability checks.
- **Fuel and exhaust chemistry:** Fuel-specific combustion products, dissociation at high $T_{t4}$, and exhaust species balance.
- **Pollutants and emissions:** NOx/CO/HC trends, emission indices, and how equivalence ratio and combustor temperature shape outputs.
- **Fuel-type efficiency:** Thermal efficiency and SFC deltas by fuel chemistry (LHV, stoichiometry, and flame temperature effects).
