# Symbolic Derivation from Current Solver State

This tab shows the governing equations solved by the combustion model and their reduction for the current case.

## Current solver inputs

$$
\text{Fuel} = CH_{4}
$$

$$
\text{Air model} = O_2 + 3.76\,N_2
$$

$$
T_{ref} = 298.15\ \mathrm{K}, \qquad T_{prod} = 2000.00\ \mathrm{K}
$$

$$
P = 101325\ \mathrm{Pa}
$$

$$
\frac{\dot m_f}{\dot m_a} = 0.02
$$

$$
AFR = \frac{\dot m_a}{\dot m_f} = 50
$$

---

## 1. Stoichiometric oxygen requirement

For a general fuel $C_cH_hO_oN_n$, the stoichiometric oxygen requirement is

$$
a = c + \frac{h}{4} - \frac{o}{2}
$$

For this fuel,

$$
c=1,\quad h=4,\quad o=0
$$

$$
a = 1 + \frac{4}{4} - \frac{0}{2} = 2.0000
$$

Thus the stoichiometric combustion reaction is

$$
CH_{4} + 2\,O_{2} + 7.52\,N_{2} \rightarrow CO_{2} + 2\,H_{2}O + 7.52\,N_{2}
$$

---

## 2. Stoichiometric air-fuel ratio

Using the dry-air model,

$$
m_{air,st} = a\left(MW_{O_2} + 3.76MW_{N_2}\right)
$$

$$
AFR_{st} = \frac{m_{air,st}}{MW_f}
$$

$$
AFR_{st} = 17.1200
$$

---

## 3. Equivalence ratio

$$
\phi = \frac{(F/A)}{(F/A)_{st}}
$$

$$
\phi = \frac{AFR_{st}}{AFR}
$$

$$
\phi = \frac{17.1200}{50.0000} = 0.3424
$$

Since $\phi < 1$, the mixture is **lean**.

---

## 4. Reactant mixture used by the solver

The solver uses

$$
\frac{a}{\phi}
$$

$$
\frac{a}{\phi} = \frac{2.0000}{0.3424} = 5.8411
$$

Thus the reactant mixture is

$$
CH_{4} + 5.8411\,O_2 + 21.9626\,N_2
$$

$$
21.9626 = 3.76(5.8411)
$$

The reactant reference total moles are

$$
n_{ref} = 1 + \frac{a}{\phi} + 3.76\frac{a}{\phi}
$$

$$
n_{ref} = 1 + 5.8411 + 21.9626 = 28.8037
$$

So the reactant mole fractions are

$$
X_f = \frac{1}{n_{ref}}, \qquad X_{O_2} = \frac{a/\phi}{n_{ref}}, \qquad X_{N_2} = \frac{3.76(a/\phi)}{n_{ref}}
$$

$$
X_{CH_{4}} \approx 0.0347,\qquad X_{O_2} \approx 0.2028,\qquad X_{N_2} \approx 0.7625
$$

The corresponding mass fractions are

$$
Y_f = \frac{MW_f}{MW_f + (a/\phi)(MW_{O_2}+3.76MW_{N_2})}
$$

$$
Y_{O_2} = \frac{(a/\phi)MW_{O_2}}{MW_f + (a/\phi)(MW_{O_2}+3.76MW_{N_2})}
$$

$$
Y_{N_2} = \frac{3.76(a/\phi)MW_{N_2}}{MW_f + (a/\phi)(MW_{O_2}+3.76MW_{N_2})}
$$

$$
Y_{CH_{4}} \approx 0.0196,\qquad Y_{O_2} \approx 0.2284,\qquad Y_{N_2} \approx 0.7520
$$

---

## 5. Ideal lean products

For $\phi \le 1$, the ideal no-dissociation product model is

$$
C_cH_hO_oN_n + \frac{a}{\phi}(O_2+3.76N_2) \rightarrow cCO_2 + \frac{h}{2}H_2O + \left(\frac{a}{\phi}-a\right)O_2 + 3.76\frac{a}{\phi}N_2
$$

$$
CH_{4} + 5.8411O_2 + 21.9626N_2 \rightarrow 1.0000CO_2 + 2.0000H_2O + 3.8411O_2 + 21.9626N_2
$$

Thus the ideal product coefficients are

$$
\nu_{CO_2}=1,\qquad \nu_{H_2O}=2,\qquad \nu_{O_2}=3.841,\qquad \nu_{N_2}=21.96
$$

Product mole fractions are computed from

$$
X_i = \frac{\nu_i}{\sum_j \nu_j}
$$

and product mass fractions from

$$
Y_i = \frac{\nu_i MW_i}{\sum_j \nu_j MW_j}
$$

---

## 6. First-law heating value

At constant pressure, the heat release per kmol of fuel is

$$
Q = \sum_{i \in P} n_i \bar h_i(T_{ref}) - \sum_{j \in R} n_j \bar h_j(T_{ref})
$$

The heating value is then

$$
HV = -\frac{Q}{MW_f}
$$

$$
HV = 5.00\times 10^{4}\ \mathrm{kJ/kg}
$$

For the equilibrium product model, the solver instead evaluates

$$
HV_{eq} = -\frac{\sum_i \nu_i \bar h_i - \bar h_{reactants}}{MW_f}
$$

$$
HV_{eq} = 4.84\times 10^{4}\ \mathrm{kJ/kg}
$$

The equilibrium value is lower because dissociation redistributes energy into minor species and bond breaking.

---

## 7. Sensible thermodynamic properties

The solver reports sensible enthalpy and entropy relative to $T_{ref}$:

$$
\bar h_{s,i}(T) = \int_{T_{ref}}^{T} \bar c_{p,i}^{\circ}(T)\,dT
$$

$$
\bar s_{s,i}(T) = \int_{T_{ref}}^{T} \frac{\bar c_{p,i}^{\circ}(T)}{T}\,dT
$$

with standard-state entropy

$$
\bar s_i^{\circ}(T) = \bar s_i^{\circ}(T_{ref}) + \int_{T_{ref}}^{T}\frac{\bar c_{p,i}^{\circ}(T)}{T}\,dT
$$

and ideal-gas pressure correction

$$
\bar s_i(T,P_i) = \bar s_i^{\circ}(T) - \bar R_u \ln\left(\frac{P_i}{P^\circ}\right)
$$

where

$$
P_i = X_iP
$$

---

## 8. Gibbs free energy and equilibrium

$$
\bar g_i^{\circ}(T) = \bar h_i^{\circ}(T) - T\bar s_i^{\circ}(T)
$$

and Gibbs free energy of formation

$$
\bar g_{f,i}^{\circ}(T) = \bar g_i^{\circ}(T) - \sum_{j \in elements}\nu_{ij}\bar g_j^{\circ}(T)
$$

$$
C(s),\ H_2,\ O_2,\ N_2 \quad \text{at} \quad P^{\circ} = 1\ \mathrm{atm}
$$

At constant temperature and pressure,

$$
\Delta G = \Delta H - T\Delta S
$$

$$
Q = \Delta H = \Delta G + T\Delta S
$$

For a general reaction,

$$
K_p = \prod_i \left(\frac{P_i}{P^\circ}\right)^{\nu_i}
$$

$$
\Delta G^\circ(T)=\sum_i \nu_i \bar g_i^\circ(T)
$$

$$
K_p = \exp\left(-\frac{\Delta G^{\circ}(T)}{\bar R_u T}\right)
$$

---

## 9. Water-gas shift relation

$$
CO + H_2O \rightleftharpoons CO_2 + H_2
$$

$$
K_{p,\mathrm{WGS}} = \frac{\left(P_{CO_2}/P^\circ\right)\left(P_{H_2}/P^\circ\right)}{\left(P_{CO}/P^\circ\right)\left(P_{H_2O}/P^\circ\right)}
$$

$$
K_{p,\mathrm{WGS}} = \exp\left(-\frac{\Delta G^\circ(T)}{\bar R_u T}\right)
$$

$$
K_{p,\mathrm{WGS}} = \frac{P_{CO_2}P_{H_2}}{P_{CO}P_{H_2O}}
$$

$$
P_i = X_i P
$$

$$
\Delta G = \Delta G^\circ + \bar R_u T \ln Q_{p,\mathrm{WGS}}
$$

$$
0 = \Delta G^\circ + \bar R_u T \ln Q_{p,\mathrm{WGS}}\ \Rightarrow\ Q_{p,\mathrm{WGS}} = \exp\left(-\frac{\Delta G^\circ}{\bar R_u T}\right)
$$

$$
Q_{p,\mathrm{WGS}} = \prod_i \left(\frac{P_i}{P^\circ}\right)^{\nu_i}
$$

$$
Q_{p,\mathrm{WGS}} = \frac{X_{CO_2}X_{H_2}}{X_{CO}X_{H_2O}}
$$

$Q_{p,\mathrm{WGS}}$ (reaction quotient for water-gas shift)

Q_{p,\mathrm{WGS}} (ideal products) unavailable (zero CO or H2)

$$
Q_{p,\mathrm{WGS}}\,\left(\text{dissociated products}\right) = 0.2184
$$

If the reported mixture is at water-gas-shift equilibrium, then $Q_{p,\mathrm{WGS}} = K_{p,\mathrm{WGS}}$.

---

## 10. Dissociation products reported by the solver

$$
N_{2},\ O_{2},\ H_{2}O,\ CO_{2},\ NO,\ OH,\ O,\ CO,\ H_{2},\ H,\ NO_{2},\ HO_{2},\ N_{2}O,\ H_{2}O_{2}
$$

The equilibrium reactant-to-product transformation reported by the solver is

$$
\left[\begin{array}{l}CH_{4} \\  + 5.841\,O_2 \\  + 21.96\,N_2\end{array}\right]\rightarrow\left[\begin{array}{l}21.88\,N_{2} + 3.744\,O_{2} + 1.977\,H_{2}O \\  + 0.9963\,CO_{2} + 0.1711\,NO + 0.04329\,OH \\  + 0.006945\,O + 0.003652\,CO + 0.001582\,H_{2} \\  + 3.48\times 10^{-4}\,H + 2.33\times 10^{-4}\,NO_{2} + 4.73\times 10^{-5}\,HO_{2} \\  + 9.50\times 10^{-6}\,N_{2}O + 1.33\times 10^{-6}\,H_{2}O_{2}\end{array}\right]
$$

This equilibrium branch is what drives the dissociation results table.

$Q_{p,\mathrm{overall}}$ (formal overall reaction quotient from the solver-reported equilibrium basis)

Using the solver-reported equilibrium reaction as the reaction basis, define net coefficients

$$
\nu_{net,i} = \nu_{products,i} - \nu_{reactants,i}
$$

If $\nu_{net,i}=0$, omit the species; if $\nu_{net,i}>0$ place it in the numerator; if $\nu_{net,i}<0$ place it in the denominator with exponent $|\nu_{net,i}|$.

Omit condensed phases (activity $=1$).

Omitted condensed phases: none

$$
Q_{p,\mathrm{overall}} = \prod_i \left(\frac{P_i}{P^\circ}\right)^{\nu_{net,i}}
$$

Evaluate $Q_p$ from the Cantera/table composition using $P_i = X_i P$ (or table partial pressures when available).

$$
Q_{p,\mathrm{overall}} = \frac{\begin{array}{l}\left(\frac{P_{H_{2}O}}{P^\circ}\right)^{1.977} \cdot \left(\frac{P_{CO_{2}}}{P^\circ}\right)^{0.9963} \cdot \left(\frac{P_{NO}}{P^\circ}\right)^{0.1711} \cdot \left(\frac{P_{OH}}{P^\circ}\right)^{0.04329} \cdot \left(\frac{P_{O}}{P^\circ}\right)^{0.006945} \cdot \left(\frac{P_{CO}}{P^\circ}\right)^{0.003652} \cdot \left(\frac{P_{H_{2}}}{P^\circ}\right)^{0.001582} \\ \left(\frac{P_{H}}{P^\circ}\right)^{3.48e-4} \cdot \left(\frac{P_{NO_{2}}}{P^\circ}\right)^{2.33e-4} \cdot \left(\frac{P_{HO_{2}}}{P^\circ}\right)^{4.73e-5} \cdot \left(\frac{P_{N_{2}O}}{P^\circ}\right)^{9.50e-6} \cdot \left(\frac{P_{H_{2}O_{2}}}{P^\circ}\right)^{1.33e-6}\end{array}}{\left(\frac{P_{CH_{4}}}{P^\circ}\right)^{1} \cdot \left(\frac{P_{O_{2}}}{P^\circ}\right)^{2.097} \cdot \left(\frac{P_{N_{2}}}{P^\circ}\right)^{0.08}}
$$

$$
Q_{p,\mathrm{overall}} = 2.36\times 10^{20}
$$

The numerical value of $Q_{p,\mathrm{overall}}$ is evaluated from the Cantera/table composition state, while the net exponents come from the solver-reported equilibrium reaction basis.

At equilibrium, $Q_{p,\mathrm{overall}} = K_p$.

---

BLOCKQUOTE_START

## Section 11. Key Solver Outputs

### Mixture State (from solver tables)

$$
T = 2000.00\ \mathrm{K}
$$

$$
P = 101325\ \mathrm{Pa}
$$

$$
\phi = 0.3424
$$

$$
AFR = 50
$$

$$
AFR_{st} = 17.1200
$$

$$
HV = 5.00\times 10^{4}\ \mathrm{kJ/kg}
$$

$$
HV_{eq} = 4.84\times 10^{4}\ \mathrm{kJ/kg}
$$

These values define the thermodynamic state used for all subsequent equilibrium evaluations.

### Composition Summary

Dominant species:

$$
N_{2}, O_{2}, H_{2}O, CO_{2}
$$

Key dissociation indicators:

$$
CO, H_{2}, OH, NO, O, H
$$

### Mole Fractions (Dissociated Products)

Major species:

$$
X_{N_{2}} = 0.7591
$$

$$
X_{O_{2}} = 0.1299
$$

$$
X_{H_{2}O} = 0.06858
$$

$$
X_{CO_{2}} = 0.03457
$$

Minor species:

$$
X_{NO} = 0.005936
$$

$$
X_{OH} = 0.001502
$$

$$
X_{O} = 2.41\times 10^{-4}
$$

$$
X_{CO} = 1.27\times 10^{-4}
$$

Trace species:

$$
X_{H_{2}} = 5.49\times 10^{-5}
$$

$$
X_{H} = 1.21\times 10^{-5}
$$

$$
X_{NO_{2}} = 8.09\times 10^{-6}
$$

$$
X_{HO_{2}} = 1.64\times 10^{-6}
$$

$$
X_{N_{2}O} = 3.30\times 10^{-7}
$$

$$
X_{H_{2}O_{2}} = 4.62\times 10^{-8}
$$

### Water-Gas Shift Reaction Quotient

$$
Q_{p,\mathrm{WGS}} = \frac{X_{CO_2}X_{H_2}}{X_{CO}X_{H_2O}}
$$

Computed directly from table mole fractions using $P_i = X_i P$.

$$
Q_{p,\mathrm{WGS}} = 0.2184
$$

If $Q_{p,\mathrm{WGS}} = K_{p,\mathrm{WGS}}$, the mixture satisfies WGS equilibrium.

### Overall Reaction Quotient (Formal)

$$
Q_{p,\mathrm{overall}} = \prod_i \left(\frac{P_i}{P^\circ}\right)^{\nu_{net,i}}
$$

$\nu_{net,i}$ comes from the solver-reported equilibrium reaction; $P_i$ comes from table data using $P_i = X_i P$.

$$
Q_{p,\mathrm{overall}} = 2.36\times 10^{20}
$$

This is a formal overall reaction quotient; it is not tied to a single reaction mechanism. Its magnitude can be large because many terms multiply together.

### Equilibrium Condition

At equilibrium: $Q_p = K_p$.

The solver enforces equilibrium via Gibbs minimization, so the reported composition corresponds to an equilibrium state.

Reaction-specific quotients (e.g., $Q_{p,\mathrm{WGS}}$) are computed directly from species mole fractions and provide interpretable equilibrium checks for individual reactions. The overall $Q_p$ is a formal quantity derived from the full reaction basis and is primarily useful for consistency with thermodynamic equilibrium definitions.

BLOCKQUOTE_END