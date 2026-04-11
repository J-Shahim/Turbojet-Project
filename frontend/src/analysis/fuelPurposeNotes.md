## Purpose

This module performs detailed fuel-air combustion analysis, including reactant and product bookkeeping, heating value evaluation, equilibrium consistency checks, and species composition prediction.

It provides a thermodynamically consistent framework for analyzing:

- flame temperature
- dissociation behavior
- mixture properties

across equivalence ratio $\phi$ and temperature.

The analysis is based on equilibrium thermodynamics and species-level property evaluation, forming a rigorous foundation for combustion modeling.

---

## Why It Matters

Combustion chemistry governs both the **energy release** and the **resulting gas mixture**, which directly determine:

- adiabatic flame temperature
- mixture-averaged properties $c_p(T),\ \gamma(T),\ R$
- high-temperature dissociation effects
- reaction-quotient and equilibrium consistency
- agreement with CEA or reference thermochemical data

Even when used independently, this module provides the **physically correct thermochemical backbone** required for propulsion or energy-conversion analysis.

---

## Relationship to the Turbojet Simulation

This module is **not currently coupled** to the turbojet simulator.

- It does **not modify** compressor, combustor, turbine, or nozzle calculations
- It does **not feed directly** into thrust or performance outputs
- It operates as an **independent combustion analysis tool**

Its purpose is to generate validated thermochemical data that can be used by the turbojet model when integration is implemented.

---

## Intended Connection (Future Integration Path)

Although independent, this module is designed so its outputs can be integrated into the turbojet simulation.

### **Burner Energy Addition Inputs**

Using $HV$, $\phi$, and species enthalpies, the module can define consistent heat addition $Q_{in}$ and physically valid combustor exit temperatures $T_{t4}$ (turbine inlet temperature).

---

### **Mixture Gas Properties**

From equilibrium or fixed-product compositions, the module can generate:

- $c_p(T)$
- $\gamma(T)$
- $R$

These can replace constant-property assumptions in the turbojet solver.

---

### **Dissociation-Aware Composition**

At high $T_{t4}$, the module predicts:

- reduced $CO_2$, $H_2O$
- increased $CO$, $H_2$
- lower effective $\gamma$

These effects are important for realistic turbine and nozzle modeling.

---

### **Reference and Validation Data**

Outputs can be compared against:

- NASA CEA
- textbook thermochemical tables

to validate:

- flame temperatures
- species trends
- equilibrium behavior

---

## What This Enables

With this module, you can:

- evaluate ideal vs. dissociated combustion behavior
- analyze species evolution across equivalence ratio $\phi$
- compute physically consistent combustor exit states $T_{t4}$
- generate thermodynamic property tables for future cycle integration
- validate combustion results against reference data

---

## Summary

This module provides a **standalone, physically rigorous combustion model**.

It does not currently drive the turbojet simulation, but it produces the thermochemical data required for a fully coupled, high-fidelity propulsion model when integration is implemented.
