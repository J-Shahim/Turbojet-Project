# Fuel-Air Combustion Derivation

## Overview

This document derives the governing relations used in the fuel-air combustion solver. It includes:

- fuel and air definitions, symbols, and mixture bookkeeping
- stoichiometric oxygen/air requirements, fuel-air ratio, and equivalence ratio
- Ideal (no dissociation) lean and rich product models
- first-law energy balance and adiabatic flame temperature formulation
- enthalpy, entropy, and Gibbs relations for reacting mixtures
- equilibrium constants, water-gas shift, and equilibrium (dissociation) interpretation
- solver outputs (tables and xi-maps) and how to read them

The formulation is intended for use in a thermodynamic combustion solver or propulsion-cycle model.

---

## 1. General Fuel Formula

Let the fuel be represented by the general chemical formula

$$
C_c H_h O_o N_n
$$

where:

- $c$ = number of carbon atoms
- $h$ = number of hydrogen atoms
- $o$ = number of oxygen atoms
- $n$ = number of nitrogen atoms

The oxidizer is air, modeled as

$$
O_2 + r_{air} N_2
$$

For standard dry air,

$$
r_{air} = 3.76
$$

so the air model becomes

$$
O_2 + 3.76N_2
$$


---

## 2. Symbol Definitions

**Mixture and stoichiometry**

$$
a \equiv \text{stoichiometric moles of } O_2 \text{ per mole of fuel}
$$

$$
\phi \equiv \text{equivalence ratio}
$$

$$
f \equiv \frac{\dot m_f}{\dot m_a} \quad \text{(fuel-air mass ratio)}
$$

$$
f_{st} \equiv \text{stoichiometric } f, \qquad AFR \equiv \frac{1}{f}, \qquad AFR_{st} \equiv \frac{1}{f_{st}}
$$

$$
r_{air} \equiv N_2/O_2 \text{ (molar ratio in air)}
$$

**Amounts and composition**

$$
MW_i \equiv \text{molecular weight of species } i
$$

$$
MW_f \equiv \text{molecular weight of fuel}
$$

$$
\nu_i \equiv \text{stoichiometric coefficient of species } i
$$

$$
\nu_i > 0\ \text{for products},\quad \nu_i < 0\ \text{for reactants}
$$

$$
a_{ij} \equiv \text{number of atoms of element } j \text{ in species } i
$$

$$
n_i \equiv \text{species moles on the reaction basis (typically per mole of fuel)}
$$

$$
\dot{n}_i \equiv \text{species molar flow rate (rate form)}
$$

$$
n_{ref} \equiv \text{reference total moles}
$$

$$
X_i \equiv \text{mole fraction of species } i
$$

$$
Y_i \equiv \text{mass fraction of species } i
$$

**Thermodynamic properties**

$$
\bar{h}_i \equiv \text{molar enthalpy of species } i
$$

$$
\Delta H \equiv \text{reaction enthalpy change}
$$

$$
\bar{s}_i \equiv \text{molar entropy of species } i
$$

$$
\bar{s}_i(T,P_i) \equiv \text{absolute molar entropy at } (T,P_i)
$$

$$
\Delta S \equiv \text{reaction entropy change}
$$

$$
\dot{S}_{gen} \equiv \text{entropy generation rate (rate form)}
$$

$$
\bar{s}_{mix} \equiv \text{mixture molar entropy}
$$

$$
\bar{g}_i \equiv \text{molar Gibbs free energy of species } i
$$

$$
\bar{g}_i^\circ(T) \equiv \text{standard-state molar Gibbs function of species } i
$$

$$
\bar{g}_{f,i}^\circ(T) \equiv \text{standard-state molar Gibbs free energy of formation of species } i
$$

$$
\Delta G \equiv \text{reaction Gibbs free energy change}
$$

$$
\Delta G^\circ(T) \equiv \text{standard Gibbs free energy change of reaction}
$$

$$
\bar{c}_{p,i}^{\circ}(T) \equiv \text{standard-state molar heat capacity of species } i
$$

$$
\bar{h}_{s,i}(T) \equiv \text{sensible molar enthalpy relative to } T_{ref}
$$

$$
\bar{s}_{s,i}(T) \equiv \text{sensible molar entropy relative to } T_{ref}
$$

$$
R_u \equiv \text{universal gas constant}
$$

Rate-to-basis convention used in this document:

- dotted quantities belong to the general steady-flow control-volume balances
- non-dotted quantities are normalized per reaction basis (typically per mole of fuel)

**Energy rates**

$$
\dot{Q} \equiv \text{heat transfer rate}
$$

$$
\dot{W} \equiv \text{work rate}
$$

**Pressure and equilibrium**

$$
P \equiv \text{mixture pressure}
$$

$$
P_j \equiv \text{partial pressure of reactant species } j
$$

$$
P_i \equiv \text{partial pressure of product species } i
$$

$$
P_j = X_j P,\qquad P_i = X_i P \qquad \text{(ideal gas)}
$$

$$
Q_p \equiv \text{reaction quotient in pressure form}
$$

$$
K_p \equiv \text{equilibrium constant in pressure form}
$$

$$
P^\circ \equiv \text{reference pressure}
$$

**Temperatures**

$$
T_{ref} \equiv 298.15\ \mathrm{K}\ \text{(reference temperature)}
$$

$$
T \equiv \text{temperature}
$$

$$
T_{ad} \equiv \text{adiabatic flame temperature}
$$

$$
T_{\mathrm{prod}} \equiv \text{imposed products temperature (Fixed-}T\text{ evaluation)}
$$

$$
T_{\mathrm{prod,desired}} \equiv \text{user input target temperature for Adiabatic solve}
$$

---

## 11. Percent Dissociation Diagnostics

Percent dissociation quantifies how much a key product species is reduced relative to the **ideal (no dissociation)** reference at the same $(\phi, P, T)$ state.

For $CO_2$ and $H_2O$ the metric is defined as

$$
\%\,\text{dissociation of } CO_2 = \left(\frac{n_{CO_2,\,\mathrm{ideal}} - n_{CO_2,\,\mathrm{eq}}}{n_{CO_2,\,\mathrm{ideal}}}\right)\times 100
$$

$$
\%\,\text{dissociation of } H_2O = \left(\frac{n_{H_2O,\,\mathrm{ideal}} - n_{H_2O,\,\mathrm{eq}}}{n_{H_2O,\,\mathrm{ideal}}}\right)\times 100
$$

where

- $n_{\mathrm{ideal}}$ comes from the ideal (complete-combustion) products model.
- $n_{\mathrm{eq}}$ comes from the equilibrium (dissociation) model.

**Fixed-T mode**

- Ideal and equilibrium are evaluated at the same imposed $T_{\mathrm{prod}}$, $P$, and $\phi$.

**Adiabatic mode**

- The comparison basis is explicitly labeled in the UI. The default comparison uses a common adiabatic temperature (either the equilibrium or ideal $T_{ad}$), and the metric is only formed when both models are evaluated at the same temperature.

If $n_{\mathrm{ideal}} = 0$ for a species, percent dissociation is undefined and reported as not applicable.

### Expected trends (qualitative)

- Higher temperature increases dissociation.
- Higher pressure suppresses dissociation for many reactions.
- $\phi$ affects dissociation through both stoichiometry and flame temperature.

**Heating value**

$$
HV \equiv \text{heating value of the fuel}
$$

$$
HV_{mass} \equiv \text{mass-based heating value}\ [\mathrm{kJ/kg}]
$$

$$
HV_{molar} \equiv \text{molar heating value}\ [\mathrm{kJ/kmol}]
$$

**Other symbols**

$$
V_i \equiv \text{velocity of stream } i
$$

$$
g \equiv \text{gravitational acceleration}
$$

$$
z_i \equiv \text{elevation of stream } i
$$


---

## 3. How to Read the Tables

1. Amount column lists species moles: $n_i$ for products, $n_j$ for reactants.
2. Molar property columns report per-kmol values (e.g., $\bar h_i$, $\bar s_i$, $\bar g_i$ for products; $\bar h_j$, $\bar s_j$, $\bar g_j$ for reactants).
3. Total columns are weighted sums: $H_{\mathrm{prod}}=\sum_i n_i\bar h_i$, $H_{\mathrm{react}}=\sum_{j \in R} n_j\bar h_j$ (similarly for $S$ and $G$).
4. Mixture molar entropy uses mole fractions: $\bar s_{mix}=\sum_i X_i\bar s_i$ for products or $\sum_j X_j\bar s_j$ for reactants.
5. Formation terms represent chemical energy; sensible terms represent thermal energy; totals are their sum.
6. $S^\circ$ is standard-state entropy; $S$ includes the ideal-gas pressure correction and mixing contribution.
7. $G^\circ$ is standard-state Gibbs; it is used for equilibrium interpretation, not energy balance.
8. Fixed-T evaluation computes properties at $T_{\mathrm{prod}}$ without enforcing $\Delta H=0$.
9. Adiabatic solve finds $T_{ad}$ so $\Delta H\approx 0$ and reports $\Delta T$ relative to $T_{\mathrm{prod,desired}}$.


---

## 4. Stoichiometric Oxygen Requirement

For complete combustion, carbon forms $CO_2$ and hydrogen forms $H_2O$.

### Carbon contribution

Each carbon atom requires one mole of $O_2$ per mole of carbon:

$$
C \rightarrow CO_2
$$

Thus carbon requires

$$
c \qquad \{\text{mol } O_2\}
$$

### Hydrogen contribution

Hydrogen burns as

$$
H_2 + \frac{1}{2}O_2 \rightarrow H_2O
$$

Thus $h$ hydrogen atoms require

$$
\frac{h}{4} \qquad \{\text{mol } O_2\}
$$

### Fuel-bound oxygen correction

If the fuel already contains oxygen, that reduces the oxygen needed from air by

$$
\frac{o}{2} \qquad \{\text{mol } O_2\}
$$

### Final stoichiometric oxygen requirement

Therefore,

$$
a = c + \frac{h}{4} - \frac{o}{2}
$$

This is the stoichiometric oxygen requirement per mole of fuel.

---

## 5. Stoichiometric Air Requirement

Using the air model

$$
O_2 + r_{air}N_2
$$

the stoichiometric air supplied per mole of fuel is

$$
a(O_2 + r_{air}N_2)
$$

For dry air:

$$
a(O_2 + 3.76N_2)
$$

The stoichiometric air mass is

$$
m_{air,st} = a\left(MW_{O_2} + r_{air}MW_{N_2}\right)
$$

For dry air,

$$
m_{air,st} = a\left(MW_{O_2} + 3.76MW_{N_2}\right)
$$

---

## 6. Stoichiometric Fuel-Air Ratio and AFR

The stoichiometric fuel-air ratio is

$$
\left(\frac{F}{A}\right)_{st} = \frac{MW_f}{m_{air,st}}
$$

The corresponding air-fuel ratio is

$$
AFR_{st} = \frac{1}{(F/A)_{st}}
$$

These define the reference mixture condition for the combustion model.

---

## 7. Equivalence Ratio

The equivalence ratio is defined as

$$
\phi = \frac{(F/A)}{(F/A)_{st}}
$$

Interpretation:

- $\phi = 1$: stoichiometric
- $\phi < 1$: lean
- $\phi > 1$: rich

Since equivalence ratio compares actual fuel loading to stoichiometric fuel loading, the model uses

$$
\frac{a}{\phi} \qquad \{\text{mol } O_2 / \text{mol fuel}\}
$$

The reactants therefore become

$$
C_cH_hO_oN_n + \frac{a}{\phi}(O_2 + r_{air}N_2)
$$

For dry air:

$$
C_cH_hO_oN_n + \frac{a}{\phi}(O_2 + 3.76N_2)
$$

---

## 8. Mixture Input Basis

The user may specify mixture strength by either $f$ or $\phi$. The solver converts between them using the stoichiometric basis:

$$
\phi = \frac{f}{f_{st}}, \qquad f = \phi f_{st}
$$

$$
AFR = \frac{1}{f}, \qquad AFR_{st} = \frac{1}{f_{st}}
$$

---

## 9. Stoichiometric Combustion Equation

At stoichiometric conditions, $\phi = 1$, so the complete ideal combustion equation is

$$
C_cH_hO_oN_n + a(O_2 + r_{air}N_2)
\rightarrow cCO_2 + \frac{h}{2}H_2O + \left(\frac{n}{2} + r_{air}a\right)N_2
$$

For dry air:

$$
C_cH_hO_oN_n + a(O_2 + 3.76N_2)
\rightarrow cCO_2 + \frac{h}{2}H_2O + \left(\frac{n}{2} + 3.76a\right)N_2
$$

This is the no-dissociation complete-combustion reaction.

---

## 10. Lean Product Model ($\phi \le 1$)

For lean combustion, excess oxygen remains after complete oxidation of the fuel.

Since

$$
\frac{a}{\phi} \ge a
$$

the excess oxygen is

$$
\frac{a}{\phi} - a
$$

The lean ideal-products reaction is

$$
C_cH_hO_oN_n + \frac{a}{\phi}(O_2 + r_{air}N_2)
\rightarrow cCO_2 + \frac{h}{2}H_2O + \left(\frac{a}{\phi} - a\right)O_2 + \left(r_{air}\frac{a}{\phi} + \frac{n}{2}\right)N_2
$$

For dry air:

$$
C_cH_hO_oN_n + \frac{a}{\phi}(O_2 + 3.76N_2)
\rightarrow cCO_2 + \frac{h}{2}H_2O + \left(\frac{a}{\phi} - a\right)O_2 + \left(3.76\frac{a}{\phi} + \frac{n}{2}\right)N_2
$$

Thus, in the lean ideal model:

- all carbon becomes $CO_2$
- all hydrogen becomes $H_2O$
- remaining oxygen exits as unused $O_2$

---

## 11. Rich Product Model ($\phi > 1$)

For rich combustion, oxygen is insufficient for complete oxidation. In the simplified rich model, products are taken as:

$$
CO,\; H_2O,\; H_2,\; C(s),\; N_2
$$

The reaction is written schematically as

$$
C_cH_hO_oN_n + \frac{a}{\phi}(O_2 + r_{air}N_2)
\rightarrow CO + H_2O + H_2 + C(s) + N_2
$$

The exact product coefficients are determined by atom conservation.

Let the product coefficients be

$$
\nu_{CO},\; \nu_{H_2O},\; \nu_{H_2},\; \nu_{C(s)},\; \nu_{N_2}
$$

Then the balances are:

### Carbon balance

$$
c = \nu_{CO} + \nu_{C(s)}
$$

### Hydrogen balance

$$
h = 2\nu_{H_2O} + 2\nu_{H_2}
$$

### Oxygen balance

Total oxygen atoms available:

$$
o + 2\frac{a}{\phi}
$$

These go into $CO$ and $H_2O$:

$$
o + 2\frac{a}{\phi} = \nu_{CO} + \nu_{H_2O}
$$

### Nitrogen balance

$$
n + 2r_{air}\frac{a}{\phi} = 2\nu_{N_2}
$$

Thus,

$$
\nu_{N_2} = \frac{n}{2} + r_{air}\frac{a}{\phi}
$$

The remaining coefficients are obtained from these coupled atom-balance equations.

### Physical interpretation of soot

If oxygen is insufficient to fully oxidize all carbon after water formation and carbon monoxide formation, the remaining carbon is represented as solid carbon $C(s)$ to conserve atoms.

---

## 12. Reference Total Moles

The reference total moles are defined as

$$
n_{ref} = \sum_j \nu_j
$$

For one mole of fuel plus air reactants,

$$
n_{ref} = 1 + \frac{a}{\phi} + r_{air}\frac{a}{\phi}
$$

For dry air:

$$
n_{ref} = 1 + \frac{a}{\phi} + 3.76\frac{a}{\phi}
$$

This is used to compute mole fractions and to scale product coefficients.

---

## 13. Mole Fractions and Mass Fractions

The mole fraction of species $j$ is

$$
X_j = \frac{n_j}{\sum_k n_k}
$$

The mass fraction of species $j$ is

$$
Y_j = \frac{n_jMW_j}{\sum_k n_kMW_k}
$$

The partial pressure is related to mole fraction by

$$
P_j = X_j P
$$

These are required for thermodynamic property evaluation and equilibrium calculations.

With mixture bookkeeping established, we can now apply conservation of energy to connect composition and temperature in the solver.

---

## 14. First Law of Thermodynamics for Steady Combustion

Start from the general control-volume energy balance:

$$
\frac{dE_{cv}}{dt}
=
\dot{Q}-\dot{W}
+
\sum_{in}\dot{m}\left(h+\frac{V^2}{2}+gz\right)
-
\sum_{out}\dot{m}\left(h+\frac{V^2}{2}+gz\right)
$$

Assumptions used in this app:

1. steady state: $\frac{dE_{cv}}{dt}=0$
2. negligible shaft work: $\dot{W}\approx 0$
3. adiabatic combustion: $\dot{Q}\approx 0$
4. negligible kinetic-energy change: $\Delta(V^2/2)\approx 0$
5. negligible potential-energy change: $\Delta(gz)\approx 0$

Definitions used by the solver:

$$
\dot{Q} = 0 \qquad \text{(adiabatic)}
$$

$$
\Delta H = H_{\mathrm{prod}}(T_{\mathrm{prod}}) - H_{\mathrm{react}} \qquad \text{(Fixed-}T\text{ evaluation)}
$$

$$
H_{\mathrm{react}} = H_{\mathrm{prod}}(T_{ad}) \qquad \text{(Adiabatic solve)}
$$

Reduced form:

$$
\sum_{in}\dot{m}h=\sum_{out}\dot{m}h
$$

Molar rate form:

$$
\sum_{j \in R}\dot{n}_j\,\bar{h}_j(T_j)=\sum_{i \in P}\dot{n}_i\,\bar{h}_i(T)
$$

### Conversion from rate form to reaction-basis form

The solver and tables use a per-mole-of-fuel (reaction-basis) formulation. Dividing all rate quantities by a reference fuel molar flow rate $\dot{n}_{f,\mathrm{ref}}$ gives

$$
H=\sum_i n_i\bar{h}_i\quad\text{with}\quad n_i\equiv \frac{\dot{n}_i}{\dot{n}_{f,\mathrm{ref}}}
$$

Species-summed form used by the solver:

$$
H_{\mathrm{react}}=\sum_{j \in R} n_j\,\bar{h}_j(T_j),\qquad H_{\mathrm{prod}}=\sum_{i \in P} n_i\,\bar{h}_i(T)
$$

In Adiabatic solve, the solver enforces

$$
H_{\mathrm{react}}=H_{\mathrm{prod}}(T_{ad})
$$

$$
\boxed{H_{\mathrm{react}} = H_{\mathrm{prod}} \quad \text{(adiabatic combustion)}}
$$

This is the governing energy conservation equation used by the solver.

In Fixed-T evaluation, the equality is not enforced; instead

$$
\Delta H_{\mathrm{desired}}=H_{\mathrm{prod}}(T_{\mathrm{prod}})-H_{\mathrm{react}}
$$

To evaluate $H_{\mathrm{react}}$ and $H_{\mathrm{prod}}$ consistently, we next define species enthalpy in terms of formation and sensible components.

---

## 15. Species Enthalpy Formulation

The molar enthalpy of species $i$ is written as

$$
\bar{h}_i(T)
=
\bar{h}_i(T_{ref})
+
\int_{T_{ref}}^{T}\bar{c}_{p,i}(T)\,dT
$$

Using formation and sensible components,

$$
\bar{h}_i(T)
=
\Delta \bar{h}_{f,i}^\circ(T_{ref})
+
\bar{h}_{s,i}(T)
$$

where the sensible enthalpy is

$$
\bar{h}_{s,i}(T)
=
\bar{h}_i(T)-\bar{h}_i(T_{ref})
\;=\;
\int_{T_{ref}}^{T}\bar{c}_{p,i}(T)\,dT
$$

with

$$
\bar{h}_{s,i}(T_{ref})=0
$$

Thus each species enthalpy is made of:

- chemical formation enthalpy
- temperature-dependent sensible enthalpy

Formation terms represent chemical energy, while sensible terms represent thermal energy added through temperature change.

In this implementation, $\bar{c}_{p,i}(T)$ is obtained from temperature-dependent NASA polynomial fits (via Cantera), and the integral is evaluated through the thermodynamic property functions

$$
\bar{h}_i(T)-\bar{h}_i(T_{ref})
$$

which internally represent the full integration of $c_p(T)$ over the temperature range. This is not a constant-$c_p$ approximation.

NOTE: No constant-$c_p$ approximation is used in the combustion solver. All enthalpy and entropy values are computed using temperature-dependent thermodynamic data across the full $T_{ref} \rightarrow T$ range.

With enthalpy defined, we can express the adiabatic flame temperature as the temperature that satisfies the first-law balance.

---

## 16. Adiabatic Flame Temperature Derivation

Substitute the enthalpy relation into the first-law equation:

$$
\sum_{j \in R} n_j
\left[
\bar{h}_j^\circ(T_{ref})
+
\int_{T_{ref}}^{T_0}\bar{c}_{p,j}^\circ(T)\,dT
\right]
=
\sum_{i \in P} n_i
\left[
\bar{h}_i^\circ(T_{ref})
+
\int_{T_{ref}}^{T_{ad}}\bar{c}_{p,i}^\circ(T)\,dT
\right]
$$

If the reactants enter at $T_{ref}=298.15\,\mathrm{K}$, then the reactant sensible term vanishes:

$$
\sum_{j \in R} n_j \bar{h}_j^\circ(T_{ref})
=
\sum_{i \in P} n_i
\left[
\bar{h}_i^\circ(T_{ref})
+
\int_{T_{ref}}^{T_{ad}}\bar{c}_{p,i}^\circ(T)\,dT
\right]
$$

Rearranging,

$$
\sum_{j \in R} n_j \bar{h}_j^\circ(T_{ref})
-
\sum_{i \in P} n_i \bar{h}_i^\circ(T_{ref})
=
\sum_{i \in P} n_i
\int_{T_{ref}}^{T_{ad}}\bar{c}_{p,i}^\circ(T)\,dT
$$

This equation states that the net chemical enthalpy released by reaction becomes sensible heating of the products.

The adiabatic flame temperature is the temperature at which all released chemical energy is converted into sensible heating of the products.

### Fixed-T evaluation

In Fixed-T evaluation, product properties are evaluated at the imposed temperature $T_{\mathrm{prod}}$ without enforcing energy balance:

$$
H_{\mathrm{prod}}(T_{\mathrm{prod}})=\sum_i n_i\,\bar{h}_i(T_{\mathrm{prod}})
$$

$$
\Delta H_{\mathrm{desired}}=H_{\mathrm{prod}}(T_{\mathrm{prod}})-H_{\mathrm{react}}
$$

### Adiabatic solve

In Adiabatic solve, the solver finds $T_{ad}$ such that

$$
H_{\mathrm{react}}=H_{\mathrm{prod}}(T_{ad})
$$

and reports

$$
\Delta H_{ad}=H_{\mathrm{prod}}(T_{ad})-H_{\mathrm{react}}\approx 0
$$

$$
\Delta T = T_{ad}-T_{\mathrm{prod,desired}}
$$

### Ideal (no dissociation) case

If product moles $n_i$ are fixed by stoichiometry, then $T_{ad}$ is found by solving a scalar nonlinear equation.

### Equilibrium (dissociation) case

If product composition changes with temperature, then

$$
n_i = n_i(T,P,\phi)
$$

and the flame-temperature equation becomes

$$
\sum_{j \in R} n_j \bar{h}_j(T_0)
=
\sum_{i \in P} n_i(T_{ad},P,\phi)\bar{h}_i(T_{ad})
$$

Now both composition and temperature must be solved together.

---

## 17. Second Law of Thermodynamics for Steady Combustion

Start from the general control-volume entropy balance:

$$
\frac{dS_{cv}}{dt}
=
\sum_k\frac{\dot{Q}_k}{T_k}
+
\sum_{in}\dot{m}s
-
\sum_{out}\dot{m}s
+
\dot{S}_{\mathrm{gen}},\qquad \dot{S}_{\mathrm{gen}}\ge 0
$$

Assumptions used in this app:

1. steady state: $\frac{dS_{cv}}{dt}=0$
2. adiabatic combustion: $\sum_k \frac{\dot{Q}_k}{T_k}=0$

Reduced form:

$$
\sum_{out}\dot{m}s-\sum_{in}\dot{m}s=\dot{S}_{\mathrm{gen}}\ge 0
$$

Molar rate form:

$$
\sum_{j \in R}\dot{n}_j\,\bar{s}_j(T_j,P_j)=\sum_{i \in P}\dot{n}_i\,\bar{s}_i(T_i,P_i)+\dot{S}_{gen}
$$

### Conversion from rate form to reaction-basis form

Divide by the reference fuel molar flow rate $\dot{n}_{f,\mathrm{ref}}$ to obtain per-mole-of-fuel quantities:

$$
S_{\mathrm{react}}=\sum_{j \in R} n_j\,\bar{s}_j(T_j,P_j),\qquad S_{\mathrm{prod}}=\sum_{i \in P} n_i\,\bar{s}_i(T_i,P_i)
$$

If needed, the normalized entropy generation is

$$
S_{gen}=\frac{\dot{S}_{gen}}{\dot{n}_{f,\mathrm{ref}}}
$$

Connection to tables:

$$
S_{\mathrm{react}}^{\circ}=\sum_{j \in R} n_j\bar{s}_j^{\circ}(T_j),\qquad S_{\mathrm{react}}=\sum_{j \in R} n_j\bar{s}_j(T_j,P_j)
$$

and similarly for products. $S^\circ$ captures the temperature-only contribution; $S$ includes mixing and pressure effects through $P_j=X_jP$.

To evaluate $S$ explicitly, we now introduce the standard-state and mixture entropy formulas used in the tables.

---

## 18. Standard-State and Mixture Entropy

The molar entropy (thermal contribution) of species $i$ is

$$
\bar{s}_i(T)
=
\bar{s}_i(T_{ref})
+
\int_{T_{ref}}^{T}\frac{\bar{c}_{p,i}(T)}{T}\,dT
$$

The actual entropy of an ideal-gas species at partial pressure $P_i$ is

$$
\bar{s}_i(T,P_i)
=
\bar{s}_i(T_{ref})
+
\int_{T_{ref}}^{T}\frac{\bar{c}_{p,i}(T)}{T}\,dT
-
R_u \ln\left(\frac{P_i}{P^\circ}\right)
$$

Since

$$
P_i = X_iP
$$

the species entropy becomes

$$
\bar{s}_i(T,P_i)
=
\bar{s}_i(T_{ref})
+
\int_{T_{ref}}^{T}\frac{\bar{c}_{p,i}(T)}{T}\,dT
-
R_u \ln\left(\frac{X_iP}{P^\circ}\right)
$$

The mixture entropy is then

$$
\bar{s}_{mix}
=
\sum_i X_i \bar{s}_i(T,P_i)
$$

or

$$
\bar{s}_{mix}
=
\sum_i X_i\bar{s}_i(T)
-
R_u
\sum_i X_i\ln\left(\frac{X_iP}{P^\circ}\right)
$$

The entropy integral is evaluated using temperature-dependent $c_p(T)$ from NASA polynomials, through

$$
\bar{s}_i(T)-\bar{s}_i(T_{ref})
$$

ensuring that the full temperature dependence of heat capacity is included.

This includes both thermal entropy and entropy of mixing.

### Constant-$c_p$ approximation (not used)

$$
\bar{h}_{s,i}(T) \approx \bar{c}_{p,i,\mathrm{avg}}(T-T_{ref})
$$

$$
\bar{s}_i(T) \approx \bar{c}_{p,i,\mathrm{avg}}\ln\left(\frac{T}{T_{ref}}\right)
$$

### Actual solver approach (used)

$$
\bar{h}_i(T)-\bar{h}_i(T_{ref})=\int_{T_{ref}}^{T}\bar{c}_{p,i}(T)\,dT
$$

$$
\bar{s}_i(T)-\bar{s}_i(T_{ref})=\int_{T_{ref}}^{T}\frac{\bar{c}_{p,i}(T)}{T}\,dT
$$

Implementation note: In the backend, these integrals are evaluated using thermodynamic property functions (for example, $h(T)$ and $s(T)$ from Cantera), which internally integrate NASA polynomial representations of $c_p(T)$.

With entropy defined, we can introduce Gibbs free energy as the thermodynamic potential that governs equilibrium at fixed $T$ and $P$.

---

## 19. Gibbs Free Energy

Start from the combined First + Second Law identity:

$$
dU = T\,dS - P\,dV + \sum_i \mu_i\,dn_i
$$

The internal energy has natural variables $U=U(S,V,n_i)$, but combustion analysis is typically carried out at fixed $T$ and $P$. We therefore introduce thermodynamic potentials via Legendre transforms.

### Helmholtz free energy (required intermediate)

Define

$$
A = U - TS
$$

so

$$
dA = dU - T\,dS - S\,dT = -S\,dT - P\,dV + \sum_i \mu_i\,dn_i
$$

Thus $A=A(T,V,n_i)$ and represents the maximum useful work at fixed $T$ and $V$. The solver does not use $A$ directly; it is the intermediate potential needed to replace $S$ with $T$.

### Gibbs free energy

Perform a second Legendre transform to replace $V$ with $P$:

$$
G = A + PV = U - TS + PV
$$

so

$$
dG = -S\,dT + V\,dP + \sum_i \mu_i\,dn_i
$$

Therefore $G=G(T,P,n_i)$. At fixed $T$ and $P$, equilibrium corresponds to minimizing total Gibbs free energy.

For a mixture,

$$
H = \sum_i n_i\,\bar{h}_i, \qquad S = \sum_i n_i\,\bar{s}_i
$$

so

$$
G = \sum_i n_i\,\bar{g}_i
$$

and the molar Gibbs free energy is

$$
\bar{g}_i = \bar{h}_i - T\bar{s}_i
$$

At standard state,

$$
\bar{g}_i^\circ(T) = \bar{h}_i^\circ(T) - T\bar{s}_i^\circ(T)
$$

The chemical potential follows from

$$
\mu_i = \left(\frac{\partial G}{\partial n_i}\right)_{T,P,n_{j\ne i}}
$$

At constant temperature and pressure, chemical equilibrium corresponds to minimum total Gibbs free energy. Gibbs free energy is not conserved; it is minimized at equilibrium and determines the final chemical composition.

With Gibbs established, the remaining sections connect formation properties and reaction Gibbs changes to equilibrium constants and dissociation behavior.

---

## 20. Gibbs Free Energy of Formation

The standard Gibbs free energy of formation of species $i$ is

$$
\bar{g}_{f,i}^\circ(T)
=
\bar{g}_i^\circ(T)
-
\sum_{j \in elements}a_{ij}\bar{g}_j^\circ(T)
$$

where the elemental reference states are

- $C(s)$
- $H_2$
- $O_2$
- $N_2$

at

$$
P^\circ = 1\,atm
$$

This allows thermodynamic formation properties to be computed from standard-state species properties.

---

## 21. Enthalpy, Entropy, and Gibbs Change of Reaction

For a reaction written in stoichiometric form, the molar changes are

$$
\Delta H = \sum_i \nu_i \bar{h}_i
$$

$$
\Delta S = \sum_i \nu_i \bar{s}_i
$$

$$
\Delta G = \sum_i \nu_i \bar{g}_i
$$

Using the Gibbs relation,

$$
G = H - TS
$$

we obtain

$$
\Delta G = \Delta H - T\Delta S
$$

and therefore

$$
\Delta H = \Delta G + T\Delta S
$$

This relation connects the first and second laws:

- $\Delta H$ is total enthalpy change
- $\Delta G$ is the free-energy change
- $T\Delta S$ is the entropy-related energy term

---

## 22. Heating Value from the First Law

For steady, constant-pressure combustion at the reference temperature,

$$
Q
=
\sum_{i \in P} n_i \bar{h}_i(T_{ref})
-
\sum_{j \in R} n_j \bar{h}_j(T_{ref})
$$

Under this sign convention, exothermic combustion gives $Q < 0$.

The heating value is defined as the positive released energy per unit fuel mass:

$$
HV = -\frac{Q}{MW_f}
$$

Substituting the enthalpy expression gives a formation-enthalpy-based combustion energy calculation.

---

## 23. Enthalpy, Entropy, and Gibbs Consistency

Each species enthalpy may be decomposed as

$$
\bar{h}_i(T)
=
\Delta \bar{h}_{f,i}^\circ(T_{ref}) + \bar{h}_{s,i}(T)
$$

with

$$
\bar{h}_{s,i}(T_{ref})=0
$$

Entropy is handled using the standard-state formulation and pressure correction:

$$
\bar{s}_i^\circ(T)
=
\bar{s}_i^\circ(T_{ref}) + \int_{T_{ref}}^{T}\frac{\bar{c}_{p,i}^\circ(T)}{T}\,dT
$$

$$
\bar{s}_i(T,P_i)
=
\bar{s}_i^\circ(T) - R_u\ln\left(\frac{P_i}{P^\circ}\right)
$$

The Gibbs free energy is then

$$
\bar{g}_i
=
\bar{h}_i - T\bar{s}_i
$$

and the reaction changes follow from the signed stoichiometric sums

$$
\Delta H = \sum_i \nu_i \bar{h}_i,
\qquad
\Delta S = \sum_i \nu_i \bar{s}_i,
\qquad
\Delta G = \sum_i \nu_i \bar{g}_i
$$

---

## 24. General Equilibrium Constant Formulation

For a general reaction

$$
\sum_i \nu_i A_i = 0
$$

the equilibrium constant in pressure form is

$$
K_p
=
\prod_i
\left(
\frac{P_i}{P^\circ}
\right)^{\nu_i}
$$

The standard Gibbs change of reaction is

$$
\Delta G^\circ(T)
=
\sum_i \nu_i \bar{g}_i^\circ(T)
$$

and the equilibrium constant is related to Gibbs free energy by

$$
K_p
=
\exp\left(
-\frac{\Delta G^\circ(T)}{R_uT}
\right)
$$

This is the fundamental relation linking second-law thermodynamics to equilibrium composition.

---

## 25. Water-Gas Shift Reaction

A key secondary combustion reaction is the water-gas shift reaction:

$$
CO + H_2O \rightleftharpoons CO_2 + H_2
$$

Its equilibrium constant in pressure-normalized form is

$$
K_p(T)
=
\frac{\left(P_{CO_2}/P^\circ\right)\left(P_{H_2}/P^\circ\right)}{\left(P_{CO}/P^\circ\right)\left(P_{H_2O}/P^\circ\right)}
$$

Since $\Delta \nu = 0$ for this reaction, the reference pressure cancels and

$$
K_p(T)
=
\frac{P_{CO_2}P_{H_2}}{P_{CO}P_{H_2O}}
$$

Define the reaction quotient (composition-based)

$$
Q_p
=
\prod_i\left(\frac{P_i}{P^\circ}\right)^{\nu_i}
$$

and the Gibbs relation for a reacting mixture

$$
\Delta G
=
\Delta G^\circ
+
R_uT\ln Q_p
$$

At equilibrium, $\Delta G=0$, so

$$
Q_p
=
\exp\left(-\frac{\Delta G^\circ}{R_uT}\right)
=
K_p(T)
$$

$$
P_i = X_iP
$$

so for this reaction, because the total mole change is zero, pressure cancels and

$$
K_p
=
\frac{X_{CO_2}X_{H_2}}{X_{CO}X_{H_2O}}
$$

The standard Gibbs change is

$$
\Delta G^\circ(T)
=
\bar{g}_{CO_2}^\circ(T)
+
\bar{g}_{H_2}^\circ(T)
-
\bar{g}_{CO}^\circ(T)
-
\bar{g}_{H_2O}^\circ(T)
$$

Therefore,

$$
K_p(T)
=
\exp\left(
-\frac{\Delta G^\circ(T)}{R_uT}
\right)
$$

This reaction is especially important for rich and dissociated combustion products.

---

## 26. Equilibrium and Dissociation

When an equilibrium chemistry solver is available, product composition is not fixed by the ideal lean/rich product assumptions. Instead, the mixture is equilibrated at given

$$
(\phi, T, P)
$$

by minimizing the total Gibbs free energy

$$
G(T,P,\{n_i\})
=
\sum_i n_i \bar{g}_i(T,P_i)
$$

subject to elemental conservation constraints

$$
\sum_i a_{ij} n_i = b_j
$$

for each conserved element $j$, where $b_j$ is the total amount of that element introduced by the reactants.

The adiabatic flame temperature is then found from the coupled first-law equation

$$
\sum_{j \in R} n_j \bar{h}_j(T_0)
=
\sum_{i \in P} n_i(T_{ad},P,\phi)\bar{h}_i(T_{ad})
$$

Thus equilibrium combustion is governed simultaneously by:

1. atom conservation
2. first-law enthalpy balance
3. second-law Gibbs minimization

---

## 27. Why Equilibrium Flame Temperature Is Lower

In the fixed-product ideal model, the released chemical enthalpy primarily heats the products.

In the equilibrium model, part of the released energy is consumed by endothermic dissociation reactions such as

$$
CO_2 \rightleftharpoons CO + \frac{1}{2}O_2
$$

$$
H_2O \rightleftharpoons H_2 + \frac{1}{2}O_2
$$

This reduces the sensible energy available to raise temperature. As a result, the equilibrium adiabatic flame temperature is typically lower than the ideal no-dissociation flame temperature.

---

## 28. Xi-Map Interpretation

The species curves are computed at fixed $T_{\mathrm{prod}}$, while the dashed $T_{ad}(\phi)$ curve is computed from an independent energy balance. These do not represent the same thermodynamic states and must not be directly compared unless the composition is solved at $T_{ad}$.

$$
n_i = n_i(T_{\mathrm{prod}}) \quad \text{(fixed-}T\text{ curves)}
$$

$$
n_i = n_i(T_{ad}) \quad \text{(adiabatic state)}
$$

The species curves and the dashed temperature line represent different thermodynamic states and should not be directly compared.

In addition, the equilibrium product set changes the effective mixture heat capacity, which further shifts the temperature required to satisfy the first-law balance.

---

## 29. Summary

The combustion solver is built on three coupled foundations:

### 1. Stoichiometry and atom conservation

These determine the allowable product compositions for lean, rich, and equilibrium combustion.

### 2. First law of thermodynamics

This determines the final temperature from enthalpy balance:

$$
\sum_R n_j\bar{h}_j(T_0)
=
\sum_P n_i\bar{h}_i(T_{ad})
$$

### 3. Second law of thermodynamics

This governs entropy generation and equilibrium through Gibbs free energy:

$$
\Delta G^\circ = \sum_i \nu_i \bar{g}_i^\circ
$$

$$
K_p = \exp\left(-\frac{\Delta G^\circ}{R_uT}\right)
$$

The fixed-composition model provides an idealized combustion solution, while the equilibrium model provides a more realistic solution by accounting for dissociation and secondary reactions.

---

### Combustion Solver Summary

$$
	\text{Stoichiometry} \rightarrow \text{possible species}
$$

$$
	\text{First Law} \rightarrow T_{ad}
$$

$$
	\text{Gibbs minimization} \rightarrow \text{equilibrium composition}
$$

Energy conservation sets the temperature, while Gibbs minimization sets the equilibrium composition. Together they connect the derivation to the solver outputs.

