# Fuel-Air Combustion Derivation

## Overview

This document derives the governing relations used in the fuel-air combustion solver. It includes:

- stoichiometric combustion chemistry
- lean and rich product models
- fuel-air ratio and equivalence ratio definitions
- first-law derivation for adiabatic flame temperature
- second-law and entropy relations
- Gibbs free energy and equilibrium constant formulation
- heating value derivation
- water-gas shift equilibrium relation
- equilibrium/dissociation interpretation

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

$$
a \equiv \text{stoichiometric moles of } O_2 \text{ per mole of fuel}
$$
$$
\phi \equiv \text{equivalence ratio}
$$

$$
r_{air} \equiv N_2/O_2 \text{ (molar ratio in air)}
$$

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
\nu_{ij} \equiv \text{element matrix coefficient of element } j \text{ in species } i
$$

$$
n_i \equiv \text{moles of species } i
$$

$$
\dot{n}_i \equiv \text{molar flow rate of species } i
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
\dot{S}_{gen} \equiv \text{entropy generation rate}
$$

$$
\bar{s}_{mix} \equiv \text{mixture molar entropy}
$$

$$
\bar{g}_i \equiv \text{molar Gibbs free energy of species } i
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
\bar{R}_u \equiv \text{universal gas constant}
$$

$$
\dot{Q} \equiv \text{heat transfer rate}
$$

$$
\dot{W} \equiv \text{work rate}
$$

$$
P \equiv \text{mixture pressure}
$$

$$
P_i \equiv \text{partial pressure of species } i
$$

$$
P_i = X_i P \qquad \text{(ideal gas)}
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

$$
T_{ref} \equiv \text{reference temperature}
$$

$$
T \equiv \text{temperature}
$$

$$
T_{ad} \equiv \text{adiabatic flame temperature}
$$

$$
HV \equiv \text{heating value of the fuel}
$$

$$
HV_{mass} \equiv \text{mass-based heating value}\ [\mathrm{kJ/kg}]
$$

$$
HV_{molar} \equiv \text{molar heating value}\ [\mathrm{kJ/kmol}]
$$

$$
V_i \equiv \text{velocity of stream } i
$$

$$
g \equiv \text{gravitational acceleration}
$$

$$
z_i \equiv \text{elevation of stream } i
$$

$$
\bar{g}_i^\circ(T) \equiv \text{standard-state molar Gibbs function of species } i
$$

$$
\bar{g}_{f,i}^\circ(T) \equiv \text{standard-state molar Gibbs free energy of formation of species } i
$$

---

## 3. Stoichiometric Oxygen Requirement

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

## 4. Stoichiometric Air Requirement

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

## 5. Stoichiometric Fuel-Air Ratio and AFR

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

## 6. Equivalence Ratio

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

## 7. Stoichiometric Combustion Equation

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

## 8. Lean Product Model ($\phi \le 1$)

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

## 9. Rich Product Model ($\phi > 1$)

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

## 10. Reference Total Moles

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

## 11. Mole Fractions and Mass Fractions

The mole fraction of species $i$ is

$$
X_i = \frac{n_i}{\sum_k n_k}
$$

The mass fraction of species $i$ is

$$
Y_i = \frac{n_iMW_i}{\sum_k n_kMW_k}
$$

The partial pressure is related to mole fraction by

$$
P_i = X_i P
$$

These are required for thermodynamic property evaluation and equilibrium calculations.

---

## 12. First Law of Thermodynamics for Steady Combustion

For a steady-flow reacting control volume, the first law is

$$
\dot{Q} - \dot{W}
+ \sum_{in}\dot{n}_j\left(\bar{h}_j + \frac{V_j^2}{2} + gz_j\right)
=
\sum_{out}\dot{n}_i\left(\bar{h}_i + \frac{V_i^2}{2} + gz_i\right)
$$

For an ideal combustor derivation, assume:

- steady operation
- negligible shaft work: $\dot{W} \approx 0$
- negligible kinetic and potential energy changes
- adiabatic flame calculation: $\dot{Q}=0$

Then the first law reduces to

$$
\sum_{reactants} n_j \bar{h}_j(T_0)
=
\sum_{products} n_i \bar{h}_i(T_{ad})
$$

where:

- $T_0$ is the reactant inlet temperature
- $T_{ad}$ is the adiabatic flame temperature

For the standard derivation, take

$$
T_0 = 298\,K
$$

so

$$
\sum_{j \in R} n_j \bar{h}_j(298)
=
\sum_{i \in P} n_i \bar{h}_i(T_{ad})
$$

This is the governing first-law equation for adiabatic combustion.

---

## 13. Species Enthalpy Formulation

The molar enthalpy of species $i$ is written as

$$
\bar{h}_i(T)
=
\bar{h}_i^\circ(298)
+
\int_{298}^{T}\bar{c}_{p,i}^\circ(T)\,dT
$$

Using formation and sensible components,

$$
\bar{h}_i(T)
=
\bar{h}_{f,i}^\circ
+
\bar{h}_{s,i}(T)
$$

where the sensible enthalpy is

$$
\bar{h}_{s,i}(T)
=
\int_{T_{ref}}^{T}\bar{c}_{p,i}^\circ(T)\,dT
$$

Thus each species enthalpy is made of:

- chemical formation enthalpy
- temperature-dependent sensible enthalpy

In practical implementations, NASA polynomial fits or a thermodynamic library such as Cantera provide $\bar{c}_{p,i}^\circ(T)$, $\bar{h}_i^\circ(T)$, and $\bar{s}_i^\circ(T)$.

---

## 14. Adiabatic Flame Temperature Derivation

Substitute the enthalpy relation into the first-law equation:

$$
\sum_{j \in R} n_j
\left[
\bar{h}_j^\circ(298)
+
\int_{298}^{T_0}\bar{c}_{p,j}^\circ(T)\,dT
\right]
=
\sum_{i \in P} n_i
\left[
\bar{h}_i^\circ(298)
+
\int_{298}^{T_{ad}}\bar{c}_{p,i}^\circ(T)\,dT
\right]
$$

If the reactants enter at $298\,K$, then the reactant sensible term vanishes:

$$
\sum_{j \in R} n_j \bar{h}_j^\circ(298)
=
\sum_{i \in P} n_i
\left[
\bar{h}_i^\circ(298)
+
\int_{298}^{T_{ad}}\bar{c}_{p,i}^\circ(T)\,dT
\right]
$$

Rearranging,

$$
\sum_{j \in R} n_j \bar{h}_j^\circ(298)
-
\sum_{i \in P} n_i \bar{h}_i^\circ(298)
=
\sum_{i \in P} n_i
\int_{298}^{T_{ad}}\bar{c}_{p,i}^\circ(T)\,dT
$$

This equation states that the net chemical enthalpy released by reaction becomes sensible heating of the products.

### No-dissociation case

If product moles $n_i$ are fixed by stoichiometry, then $T_{ad}$ is found by solving a scalar nonlinear equation.

### Dissociation/equilibrium case

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

## 15. Second Law of Thermodynamics for Steady Combustion

For a steady-flow control volume, the entropy rate balance is

$$
\frac{dS_{cv}}{dt}
=
\sum_{in}\dot{n}_j\bar{s}_j
-
\sum_{out}\dot{n}_i\bar{s}_i
+
\sum_k \frac{\dot{Q}_k}{T_k}
+
\dot{S}_{gen}
$$

At steady state,

$$
0
=
\sum_{in}\dot{n}_j\bar{s}_j
-
\sum_{out}\dot{n}_i\bar{s}_i
+
\sum_k \frac{\dot{Q}_k}{T_k}
+
\dot{S}_{gen}
$$

Therefore,

$$
\dot{S}_{gen}
=
\sum_{out}\dot{n}_i\bar{s}_i
-
\sum_{in}\dot{n}_j\bar{s}_j
-
\sum_k \frac{\dot{Q}_k}{T_k}
$$

For an adiabatic combustor, $\dot{Q}=0$, so

$$
\dot{S}_{gen}
=
\sum_{out}\dot{n}_i\bar{s}_i
-
\sum_{in}\dot{n}_j\bar{s}_j
\ge 0
$$

This is the second-law requirement for irreversible combustion.

---

## 16. Standard-State and Mixture Entropy

The standard-state molar entropy of species $i$ is

$$
\bar{s}_i^\circ(T)
=
\bar{s}_i^\circ(T_{ref})
+
\int_{T_{ref}}^{T}\frac{\bar{c}_{p,i}^\circ(T)}{T}\,dT
$$

The actual entropy of an ideal-gas species at partial pressure $P_i$ is

$$
\bar{s}_i(T,P_i)
=
\bar{s}_i^\circ(T)
-
\bar{R}_u \ln\left(\frac{P_i}{P^\circ}\right)
$$

Since

$$
P_i = X_iP
$$

the species entropy becomes

$$
\bar{s}_i(T,P_i)
=
\bar{s}_i^\circ(T)
-
\bar{R}_u \ln\left(\frac{X_iP}{P^\circ}\right)
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
\sum_i X_i\bar{s}_i^\circ(T)
-
\bar{R}_u
\sum_i X_i\ln\left(\frac{X_iP}{P^\circ}\right)
$$

This includes both thermal entropy and entropy of mixing.

---

## 17. Gibbs Free Energy

The molar Gibbs free energy is defined as

$$
\bar{g}_i = \bar{h}_i - T\bar{s}_i
$$

At standard state,

$$
\bar{g}_i^\circ(T) = \bar{h}_i^\circ(T) - T\bar{s}_i^\circ(T)
$$

For a reacting mixture, the total Gibbs free energy is

$$
G = \sum_i n_i \bar{g}_i
$$

At constant temperature and pressure, chemical equilibrium corresponds to minimum total Gibbs free energy.

---

## 18. Gibbs Free Energy of Formation

The standard Gibbs free energy of formation of species $i$ is

$$
\bar{g}_{f,i}^\circ(T)
=
\bar{g}_i^\circ(T)
-
\sum_{j \in elements}\nu_{ij}\bar{g}_j^\circ(T)
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

## 19. Enthalpy, Entropy, and Gibbs Change of Reaction

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

## 20. Heating Value from the First Law

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

## 21. Enthalpy, Entropy, and Gibbs Consistency

Each species enthalpy may be decomposed as

$$
\bar{h}_i
=
\bar{h}_{f,i}^\circ + \bar{h}_{s,i}
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
\bar{s}_i^\circ(T) - \bar{R}_u\ln\left(\frac{P_i}{P^\circ}\right)
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

## 22. General Equilibrium Constant Formulation

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
-\frac{\Delta G^\circ(T)}{\bar{R}_uT}
\right)
$$

This is the fundamental relation linking second-law thermodynamics to equilibrium composition.

---

## 23. Water-Gas Shift Reaction

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
\bar{R}_uT\ln Q_p
$$

At equilibrium, $\Delta G=0$, so

$$
Q_p
=
\exp\left(-\frac{\Delta G^\circ}{\bar{R}_uT}\right)
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
-\frac{\Delta G^\circ(T)}{\bar{R}_uT}
\right)
$$

This reaction is especially important for rich and dissociated combustion products.

---

## 24. Equilibrium and Dissociation

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
\sum_i \nu_{ij} n_i = b_j
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

## 25. Why Equilibrium Flame Temperature Is Lower

In the fixed-product ideal model, the released chemical enthalpy primarily heats the products.

In the equilibrium model, part of the released energy is consumed by endothermic dissociation reactions such as

$$
CO_2 \rightleftharpoons CO + \frac{1}{2}O_2
$$

$$
H_2O \rightleftharpoons H_2 + \frac{1}{2}O_2
$$

This reduces the sensible energy available to raise temperature. As a result, the equilibrium adiabatic flame temperature is typically lower than the ideal no-dissociation flame temperature.

In addition, the equilibrium product set changes the effective mixture heat capacity, which further shifts the temperature required to satisfy the first-law balance.

---

## 26. Summary

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
K_p = \exp\left(-\frac{\Delta G^\circ}{\bar{R}_uT}\right)
$$

The fixed-composition model provides an idealized combustion solution, while the equilibrium model provides a more realistic solution by accounting for dissociation and secondary reactions.

