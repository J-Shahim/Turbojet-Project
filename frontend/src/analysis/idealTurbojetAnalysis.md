---
# Pre-analysis acknowledgement & license (AA283 Reader, CC BY-NC 4.0)
---

---
This notebook’s governing equations and definitions are adapted from the AA283 Course Reader by Brian J. Cantwell (*Aircraft and Rocket Propulsion*, July 29, 2022), licensed under **Creative Commons Attribution-NonCommercial 4.0 International**.

**License summary (from the reader cover page):**
- **You are free to:** Share (copy/redistribute) and Adapt (remix/transform/build upon) the material.
- **Under the following terms:**
  - **Attribution** — give appropriate credit, provide a link to the license, and indicate if changes were made.
  - **NonCommercial** — not for commercial use.
  - **No additional restrictions** — no legal/technical restrictions beyond the license.
- **Notices:** Public-domain/exception uses are unaffected; **no warranties** are given.

**Attribution used in this notebook (TASL):**
- **Title:** AA283 Course Reader: *Aircraft and Rocket Propulsion*
- **Author:** Brian J. Cantwell
- **Source:** (https://web.stanford.edu/~cantwell/AA283_Course_Material/AA283_Course_BOOK/AA283_Aircraft_and_Rocket_Propulsion_BOOK_Brian_J_Cantwell_May_28_2024.pdf)
- **License:** CC BY-NC 4.0 — https://creativecommons.org/licenses/by-nc/4.0/

**Change notice:** Equations are reorganized and notationally adapted for this analysis; any errors in transcription are mine.

---

---
# Ideal TurboJet Analysis
---

---
## <u>Assumptions:</u> 
- Steady, one-dimensional flow
- Ideal gas; constant $c_p$ and $\gamma$
- Isentropic compression and expansion
  - No entropy generation in compressor/turbine
    - Adiabatic (no heat loss)
    - Reversible
- Isobaric combustion (idealized: no burner pressure loss)
- Perfectly expanded nozzle when convenient: $P_e = P_0 = P_{amb}$
- No Shaft or Bearing losses

---

---
# Known Symbolic Temp/Pressure Parameters
---

---
## <u>General Ratio Parameters</u>

Define (total-to-total) stagnation ratios across any component:

**Stagnation temperature ratio**
$$
\tau \equiv \frac{T_{t,\mathrm{out}}}{T_{t,\mathrm{in}}} \tag{2.49}
$$

**Stagnation pressure ratio**
$$
\pi \equiv \frac{P_{t,\mathrm{out}}}{P_{t,\mathrm{in}}} \tag{2.49}
$$

---
***Notes***
- For a perfect gas with constant $\gamma$ undergoing an **ideal (adiabatic, reversible) isentropic** process, the stagnation ratios satisfy:
  $$
  \tau = \pi^{(\gamma-1)/\gamma},\qquad \text{equivalently}\qquad \pi = \tau^{\gamma/(\gamma-1)}.
  $$
- This relation applies whether the device is compressing ($\pi>1,\;\tau>1$) or expanding ($\pi<1,\;\tau<1$); it is the *isentropic* mapping between $P_t$ and $T_t$.
- For real compressors/turbines/nozzles (non-isentropic), you often still compute an **isentropic reference** using the relation above, then apply an efficiency model (e.g., $\eta_c$, $\eta_t$).
---

---
## <u>Station 0: Upstream / Refrence state</u>

##### Refrence state ratios w/ connetion to $M_{0}$

**Temp**
$$
  \tau_r \equiv \frac{T_{t0}}{T_{0}} = \left(1+\frac{\gamma-1}{2}M_0^2\right) \tag{2.50}
$$

**Pressure**
$$
\pi_r \equiv \frac{P_{t0}}{P_{0}} = \left(1 + \frac{\gamma - 1}{2}M_0^2\right)^{\gamma/(\gamma - 1)}\tag{2.50}
$$

---
***Notes:***

$\pi_r = P_{t0}/P_0$ depends on $M_0$,
- So, $\pi_d > 1$ for $M_0 > 0$.
- In an ideal inlet/diffuser with no losses, total pressure is conserved 

  - So: $P_{t2}=  P_{t0}$ (i.e., $\pi_d \equiv \frac{P_{t2}}{P_{t0}} = 1$). 

- Shocks/inlet losses reduce total pressure so $\pi_d < 1$.
---


---
## <u>Station 1 (Inlet) → 1.5 (Throat): Convergent Diffuser Section</u>

This is the engine inlet:
- Flow area decreases ($A_1 > A_{1.5}$).
- For ideal analysis: adiabatic, quasi-1D (often treated as isentropic).
- For c-d diffusers - stagnation preasure reamin constant, while static preasure increases.
- The inlet reduces Mach to low subsonic w/ as minimal stagnation preasure loss. 

  - For $\to$ $M_0 \ge 1$ The Throat is ideally choked.
  
---

---
## <u>Station 1 - 2: *Engine Inlet - Compressor Inlet* / Diffusor</u>

#### For $Ideal_{Isentropic / Adiabatic}$ flow & No Upstream Shoke Waves 

For a steady adiabatic diffuser with no shaft work, the stagnation temperature is conserved, and in an *ideal* diffuser the stagnation pressure is also conserved:

$$
\because\; P_{t0} = P_{0} = P_{t0} = P_{t1} = P_{t1.5} = P_{t2},
$$
$$
T_{t0} = T_{t1} =T_{t2} 
$$

$$
\therefore\; \pi_d \equiv \frac{P_{t2}}{P_{t1}} = 1,\qquad \tau_d \equiv \frac{T_{t2}}{T_{t1}} = 1 \tag{2.52}
$$

---
***Notes:***

- $\pi_d$ (total-pressure recovery) is **< 1 in reality** due to irreversibilities (friction, boundary layers, separation, shocks, etc.).
- $\tau_d$ is typically $\approx 1$ for an adiabatic diffuser; it deviates from 1 mainly if there is heat transfer, bleed, icing, etc.
---

---
## <u>Station 2 - 3: *Compressor Inlet - Combustor Inlet*</u>

This section models the compressor (work input to raise total pressure and total temperature).

Define the compressor ratios:
$$
\pi_c \equiv \frac{P_{t3}}{P_{t2}},\qquad \tau_c \equiv \frac{T_{t3}}{T_{t2}} \tag{2.55}
$$

**Ideal (adiabatic, isentropic) compressor:**
$$
\tau_c = \pi_c^{(\gamma-1)/\gamma}
$$

---
***Notes:***
- For a compressor, typically $\pi_c>1$ and $\tau_c>1$.
- In reality, compressor isentropic efficiency $\eta_c<1$ means the actual temperature rise is larger than the ideal (isentropic) temperature rise for the same pressure ratio
---

---
## <u>Station 3-4: Combustor Inlet - Turbine Inlet</u>

The combustor (burner) parameters are often denoted with subscript $b$:
$$
\pi_b \equiv \frac{P_{t4}}{P_{t3}},\qquad \tau_b \equiv \frac{T_{t4}}{T_{t3}} \tag{2.56}
$$

---
***Notes:***
- The combustor exit (station 4) is typically the highest total temperature in the core (often called turbine inlet temperature, TIT).
- Modern engines *tend* to push $T_{t4}$ higher to increase specific thrust and improve cycle performance, but it is limited by turbine durability/life, NO$_x$ emissions constraints, and the cooling air required.
- Values on the order of $T_{t4}\sim 1700$–$2100\,\mathrm{K}$ can be seen in modern high-performance cores (engine-dependent). The hot gas temperature can exceed the allowable turbine metal temperature because internal/film cooling, thermal-barrier coatings, and advanced materials keep metal temperatures and temperature gradients lower—reducing creep and thermally driven fatigue (thermomechanical stress).
---

---
## <u>Station 4-5: Turbine Inlet - Turbine Exit</u>

The Turbine parameters are often denoted with subscript $t$:
$$
\pi_t \equiv \frac{P_{t5}}{P_{t4}},\qquad \tau_t \equiv \frac{T_{t5}}{T_{t4}} \tag{2.57}
$$

---
***Notes:***
- For a turbine, $P_{t5}<P_{t4}$ and $T_{t5}<T_{t4}$, so typically $\pi_t<1$ and $\tau_t<1$.
- Ideal (adiabatic, isentropic) turbine relation:
  $$
  \tau_t = \left(\pi_t\right)^{(\gamma-1)/\gamma}\qquad \pi_t = \tau_t^{\gamma/(\gamma-1)}.
  $$

- In reality, turbine efficiency $\eta_t<1$ means a larger pressure drop (smaller $\pi_t$) is required to produce the same shaft work; cooling/bleeds also modify the simple balance.
---

---
## <u>Station 5-8: Turbine Exit - Nozzle Throat (with optional Afterburner)</u>

Different books use slightly different station numbers. A common convention **when an afterburner exists** is:
- **5**: turbine exit (nozzle supply plenum / tailpipe inlet)
- **6**: afterburner inlet (often same as tailpipe exit / AB entry diffuser)
- **7**: afterburner exit = nozzle inlet (i.e., just upstream of the nozzle)
- **8**: nozzle throat

#### Case A — No afterburner (simple ideal turbojet)
The region 5→8 is just the tailpipe/duct up to the nozzle throat.

Define duct ratios:
$$
\pi_{tp} \equiv \frac{P_{t8}}{P_{t5}},\qquad \tau_{tp} \equiv \frac{T_{t8}}{T_{t5}}
$$

Ideal (adiabatic, no losses):
$$
T_{t8}=T_{t5}\Rightarrow \tau_{tp}=1,\qquad P_{t8}=P_{t5}\Rightarrow \pi_{tp}=1
$$

Realistic note: typically $\pi_{tp}<1$ due to duct losses, while $\tau_{tp}\approx 1$ if the duct is adiabatic and has no work.

#### Case B — With afterburner
Here the stations are typically split as:
- **5→6**: tailpipe/duct into the afterburner (usually adiabatic, but with total-pressure loss)
- **6→7**: **afterburner combustor** (heat addition; total pressure usually drops)
- **7→8**: nozzle approach to the throat (no heat addition; may have losses)

Afterburner ratios are often defined as:
$$
\pi_{ab} \equiv \frac{P_{t7}}{P_{t6}}<1,\qquad \tau_{ab} \equiv \frac{T_{t7}}{T_{t6}}>1 \tag{2.58}
$$
---

---
## <u>Station 8 - e: Nozzle Throat - Nozzle Exit</u>

This section models the nozzle expansion from the throat (station 8) to the exit plane (station $e$, sometimes labeled 9).

#### Nozzle $\pi$ and $\tau$ ratios
Define nozzle ratios:
$$
\pi_n \equiv \frac{P_{te}}{P_{t8}},\qquad \tau_n \equiv \frac{T_{te}}{T_{t8}} \tag{2.59}
$$

For an **ideal (adiabatic, isentropic) nozzle with no losses**:
$$
P_{te}=P_{t8}\Rightarrow \pi_n=1,\qquad T_{te}=T_{t8}\Rightarrow \tau_n=1
$$

(For a real nozzle with losses, typically $\pi_n<1$; $\tau_n$ is usually close to 1 if adiabatic.)

#### Static-to-stagnation relations (useful for throat/exit)
For a perfect gas (constant $\gamma$):
$$
\frac{T_t}{T} = 1+\frac{\gamma-1}{2}M^2
$$
$$
\frac{P_t}{P} = \left(\frac{T_t}{T}\right)^{\gamma/(\gamma-1)} = \left(1+\frac{\gamma-1}{2}M^2\right)^{\gamma/(\gamma-1)}
$$

#### Choking condition (sets the throat)
The nozzle is choked when the back pressure is low enough that $M_8=1$. The critical (sonic) pressure ratio is:
$$
\frac{P^*}{P_{t8}} = \left(\frac{2}{\gamma+1}\right)^{\gamma/(\gamma-1)}
$$
so choking occurs if $\;P_{amb} \le P^*\;$ (for a convergent nozzle).

At the throat (if choked):
$$
T_8 = T^* = \frac{2}{\gamma+1}T_{t8},\qquad P_8 = P^*
$$

#### Exit plane relations (isentropic expansion)
If the nozzle expands isentropically to an exit static pressure $P_e$ (perfectly expanded means $P_e=P_{amb}$):
$$
\frac{T_e}{T_{t8}} = \left(\frac{P_e}{P_{t8}}\right)^{(\gamma-1)/\gamma}
$$

Exit speed (axial jet velocity) from the energy equation:
$$
U_e = \sqrt{2c_p\,(T_{t8}-T_e)}
$$

---
***Notes:***
- If the nozzle is not perfectly expanded, thrust includes a pressure term $(P_e-P_{amb})A_e$.
- Some station conventions use **9** instead of $e$ for the nozzle exit; the equations are identical.
---

---
# Important Parameters and Equations
---

---
*Overall Efficiency*
$$
\eta_{ov}=\eta_{pr}\eta_{th} \tag{2.28}
$$

*Propulsive Efficiency*
$$
\eta_{pr}=\frac{\text{Power delivered to vehicle}}{\text{Power delivered to vehicle}+\frac{\Delta KE_{a}}{\text{sec}}+\frac{\Delta KE_{f}}{\text{sec}}} \tag{2.29}
$$
$$
\eta_{pr}=\frac{\mathbb{T}U_{0}}{\mathbb{T}U_{0}+\frac{\dot{m}_a}{2}(U_e-U_0)^2+\frac{\dot{m}_f}{2}(U_e-U_0)^2} \tag{2.30}
$$
$$
\eta_{pr} \equiv \frac{2U_{0}}{U_{e}+U_{0}}=\frac{2}{1+\frac{U_{e}}{U_{0}}} \tag{2.31}
$$

*Fuel-Air Enthalpy Ratio / Fuel Energy Parameter*
$$
\tau_f \equiv \frac{h_{f}}{C_{p}T_{0}} \tag{2.61}
$$

*Engine Preformance Parameter*
$$
\tau_{\lambda} \equiv \frac{T_{t4}}{T_{0}} \tag{2.62}
$$

*Specific Impulse*
$$
I_{sp} \equiv \frac{\text{Thrust Force}}{\text{Weight flow of fuel burned}} = \frac{\mathbb{T}}{\dot{m}_f\,g_0} \tag{2.41}
$$

*Specific Fuel Consumption*
$$
SFC \equiv \frac{\text{Pounds(lb) of fuel burned per hour}}{\text{Pounds(lb) of Thurst}} = \frac{3600}{I_{sp}} \tag{2.42}
$$

*1-D mass flow*
$$
\dot{m} = \rho U A = \frac{\gamma}{\left(\frac{\gamma+1}{2}\right)^{\frac{\gamma+1}{2(\gamma-1)}}}\left(\frac{P_t A}{\sqrt{\gamma R T_t}}\right) f(M) \tag{3.1}
$$

*Area - Mach function*
$$
f(M) \equiv \frac{A^*}{A} = \left(\frac{\gamma+1}{2}\right)^{\frac{\gamma+1}{2(\gamma-1)}}\,\frac{M}{\left(1+\frac{\gamma-1}{2}M^2\right)^{\frac{\gamma+1}{2(\gamma-1)}}} \tag{3.2}
$$

*Velocity Ratio*
$$
\frac{U_{e}}{U_{0}} =\frac{M_{e}}{M_{0}}\sqrt{\frac{T_{e}}{T_{0}}} \tag{4.18}
$$

---
### Useful notes / rearrangements

*Choked (sonic) condition*

At $M=1$, the area-Mach function gives $A=A^*$, so:
$$
f(1)=\frac{A^*}{A}=1
$$

*Area–Mach related critical (sonic) ratios*
$$
\frac{T_t^*}{T_t}=\frac{(1+\gamma M^2)^2}{2(1+\gamma)M^2\left(1+\frac{\gamma-1}{2}M^2\right)} \tag{3.3}
$$
$$
\frac{P_t^*}{P_t}=\frac{1+\gamma M^2}{1+\gamma}\left(\frac{1+\frac{\gamma-1}{2}M^2}{\frac{\gamma+1}{2}}\right)^{\gamma/(\gamma-1)} \tag{3.3}
$$

*Mass-flow parameter form (often used for nozzle/throat sizing)*
$$
\frac{\dot{m}\,\sqrt{T_t}}{P_t\,A}=\frac{\gamma}{\left(\frac{\gamma+1}{2}\right)^{\frac{\gamma+1}{2(\gamma-1)}}}\,\frac{f(M)}{\sqrt{\gamma R}}
$$

For a choked section ($M=1\Rightarrow f(M)=1$):
$$
\dot{m}=\frac{\gamma}{\left(\frac{\gamma+1}{2}\right)^{\frac{\gamma+1}{2(\gamma-1)}}}\left(\frac{P_t A^*}{\sqrt{\gamma R T_t}}\right)
$$

*Inverted area–Mach relation*
$$
\frac{A}{A^*}=\frac{1}{f(M)}
$$

*Velocity / Mach relation (perfect gas)*

The **sonic speed** is
$$
a \equiv \sqrt{\gamma R T}
$$

The **local flow speed** is related by
$$
U \equiv M\,a = M\sqrt{\gamma R T}
$$

---
***Source / attribution***
- Cantwell, *Aircraft and Rocket Propulsion* (Ch. 2: efficiency definitions; Ch. 3: compressible flow relations).
- Area–Mach function as written corresponds to Cantwell Ch. 3, Eq. (3.2).
---

---
# Dimensionless Forms
---

---
*Dimensionless Thrust*
$$
\frac{\mathbb{T}}{P_{0}A_{0}}=\gamma M_{0}^2\left((1+ f)\frac{U_{e}}{U_{0}}-1\right)+\frac{A_{e}}{A_{0}}\left(\frac{P_{e}}{P_{0}}-1\right) \tag{2.44}
$$
$$
\frac{\mathbb{T}}{\dot{m}_{a}a_{0}}=\left(\frac{1}{\gamma M_{0}}\right)\frac{\mathbb{T}}{P_{0}A_{0}} \tag{2.44}
$$

*Dimensionless Specific Impulse*
$$
\frac{I_{sp}g}{a_{0}}=\left(\frac{1}{f}\right)\frac{\mathbb{T}}{\dot{m}_{a}a_{0}} \tag{2.45}
$$

Alternatively $\therefore$
$$
 \frac{I_{sp}g}{a_{0}}=\left(\frac{1}{f}\right)\left(\frac{1}{\gamma M_{0}}\right)\frac{\mathbb{T}}{P_{0}A_{0}} \tag{2.45}
$$

*$f =$ the Fuel/Air Ratio*
$$
f =\frac{\dot{m}_{f}}{\dot{m}_{a}} \tag{2.46}
$$

*Overall Efficiency*
$$
\eta_{ov}=\left(\frac{\gamma-1}{\gamma}\right)\left(\frac{1}{f\tau_f}\right)\left(\frac{\mathbb{T}}{P_{0}A_{0}}\right)\left|\,\text{*Note: }\tau_{f}=\frac{h_{f}}{C_{p}T_{0}}\,\right. \tag{2.47/2.48}
$$

---
***Source / attribution***
- Cantwell, *Aircraft and Rocket Propulsion*, Ch. 2 (dimensionless performance parameters and efficiencies).
---

---
# Thermal Efficiency
---

---
## General form of Thermal Efficiency
$$
\eta_{th} = \frac{\text(Power to the Vechivle)+\frac{\Delta KE_{air}}{sec}+\frac{\Delta KE_{fuel}}{sec}}{\dot{m}_{f}h_{f}} \tag{4.1/4.2}
         = \frac{\mathbb{T}U_{0} +\left(\frac{\dot{m}_{a}(U_{e}-U_{0})^2}{2}- \frac{\dot{m}_{a}(0)^2}{2}\right)+\left(\frac{\dot{m}_{f}(U_{e}-U_{0})^2}{2}- \frac{\dot{m}_{f}(U_{0})^2}{2}\right)}{\dot{m}_{f}h_{f}}
$$

If $P_{e}=P_{0}$
$$
\eta_{th} = \frac{\frac{(\dot{m}_{a}+\dot{m}_{f})U_{e}^2}{2}-\frac{\dot{m}_{a}U_{0}^2}{2}}{\dot{m}_{f}h_{f}} \qquad \text{or} \qquad \eta_{th} = 1-\frac{Q_{rejected}}{Q_{input}} \tag{4.3/4.4}
$$

### Work Definition and Derivation (General → Stagnation Enthalpy)

General steady-flow energy equation (per unit mass):
$$
w_s = \Delta h + \frac{\Delta V^2}{2} + \Delta(gz) - q
$$

For steady, one-dimensional, adiabatic flow with negligible potential-energy change ($\Delta(gz)\approx 0$) and negligible inlet/exit kinetic-energy change (or absorbed into stagnation enthalpy), $q=0$, so:
$$
w_s = \Delta h + \frac{\Delta V^2}{2}
$$

Define stagnation enthalpy:
$$
h_t \equiv h + \frac{V^2}{2}
$$

Thus:
$$
w_s = \big(h_{t,\text{in}} - h_{t,\text{out}}\big)
$$

Multiplying by mass flow rate:
$$
\dot{W}_{s} = \dot{m}\,\big(h_{t,\text{in}} - h_{t,\text{out}}\big)
$$

Thus:
- **Compressor work input**
$$
\dot{W}_{c} = \dot{m}_{a}\,(h_{t3} - h_{t2})
$$
- **Turbine work output**
$$
\dot{W}_{t} = (\dot{m}_{a} + \dot{m}_{f})\,(h_{t4} - h_{t5})
$$

These relations motivate the compressor–turbine balance used below.

Expressing the enthalpy balance between the work done by compressor and turbine considering adiabatic with no shaft /or bearing losss:
$$
(\dot{m}_{a} + \dot{m}_{f})(h_{t4} - h_{t5})=\dot{m}_{a}(h_{t3} - h_{t2}) \tag{4.6}
$$

Enthalpy Across Combustor:
$$
(\dot{m}_{a} + \dot{m}_{f})h_{t4}=\dot{m}_{a}h_{t3} + \dot{m}_{f}h_{f} \tag{4.7}
$$

Enthalpy Across the Engine: ( Work done by combustor - work done by compressor and turbine )
$$
(\dot{m}_{a} + \dot{m}_{f})h_{t5}=\dot{m}_{a}h_{t2} + \dot{m}_{f}h_{f} \tag{4.8}
$$

Because we have assumed inlet and nozzle flows are adiabatic the enthalpy across the engine becomes: 
$$
(\dot{m}_{a} + \dot{m}_{f})h_{te}=\dot{m}_{a}h_{t0} + \dot{m}_{f}h_{f} \tag{4.9}
$$

The thermal efficiency becomes the following: 
$$
\eta_{th} = \frac{(\dot{m}_{a} + \dot{m}_{f})(h_{te} - h_{e}) - \dot{m}_{a}(h_{t0} - h_{0})}{(\dot{m}_{a} + \dot{m}_{f})h_{t4} - \dot{m}_{a}h_{t3}} \tag{4.10}
$$

By combining the previous two eq's and the enthatlpy across the combustor:
$$
\eta_{th} = \frac{(\dot{m}_{a} + \dot{m}_{f})h_{t4}  - \dot{m}_{a}h_{t3} - (\dot{m}_{a} +\dot{m}_{f})h_{e} + \dot{m}_{a}h_{0}}{(\dot{m}_{a} + \dot{m}_{f})h_{t4} - \dot{m}_{a}h_{t3}} \tag{4.11}
$$
alternativly,
$$
\eta_{th} = 1-\frac{Q_{rejected}}{Q_{input}} = 1 - \left(\frac{(\dot{m}_{a} + \dot{m}_{f})h_{e} - \dot{m}_{a}h_{0} }{(\dot{m}_{a} + \dot{m}_{f})h_{t4} - \dot{m}_{a}h_{t3}} \right) 
\Rightarrow \eta_{th} = 1-\frac{h_{0}}{h_{t3}}\left(\frac{(1+f)\frac{h_{e}}{h_{0}}-1}{(1+f)\frac{h_{t4}}{h_{t3}}-1}\right) \tag{4.12}
$$

If caloricallly perfect the above can be expressed in terms of temperature:
$$
\eta_{th} = 1-\frac{T_{0}}{T_{t3}}\left(\frac{(1+f)\frac{T_{e}}{T_{0}}-1}{(1+f)\frac{T_{t4}}{T_{t3}}-1}\right) \tag{4.13}
$$

Since the Freestream to station 3 and station 4 to exit stream is analyized as an Ideal bryaton cycle and the compression process and expansion process respectively are assumed isentropic and adiabatric
$$
\frac{T_{t3}}{T_{0}}=\left(\frac{P_{t3}}{P_{0}}\right)^\frac{\gamma-1}{gamma} \qquad \frac{T_{t4}}{T_{e}}=\left(\frac{P_{t4}}{P_{e}}\right)^\frac{\gamma-1}{gamma} \tag{4.14}
$$

And the heat addition and removal occur at constant preasure in the ideal cycle implying $P_{t4}=P_{t3}, P_{e}=P_{0}$
$$
\frac{T_{t4}}{T_{e}}=\frac{T_{t3}}{T_{0}}  \tag{4.15}
$$
$$
\therefore \eta_{idealTurbojet}=1-\frac{T_{0}}{T_{t3}}=1-\frac{1}{\tau_{r}\tau_{c}} \tag{4.16}
$$

---
***Notes:***
- **Meaning of terms**
  - $\text{Power to the Vehicle}=F\,U_0$ (useful propulsive power).
  - $\Delta KE_{air}/\text{sec}=\tfrac{1}{2}\dot{m}_a\big[(U_e-U_0)^2-(0)^2\big]$ is the jet kinetic power imparted to the ingested air (Cantwell reference frame).
  - $\Delta KE_{fuel}/\text{sec}=\tfrac{1}{2}\dot{m}_f\big[(U_e-U_0)^2-U_0^2\big]$ accounts for the fuel stream entering with the vehicle and exiting with the jet.
- **Reference-frame note**
  - Cantwell uses a frame where ambient air is at rest and the vehicle moves at $U_0$, so the inlet air term uses $0$ and the fuel term uses $U_0$.
- **Perfectly expanded condition**
  - $P_e=P_0$ removes pressure-thrust power; if $P_e\ne P_0$, include $(P_e-P_0)A_e$ in the numerator of the power-to-vehicle (thrust power) term, i.e., $F\,U_0=(\dot{m}U_e-\dot{m}U_0+(P_e-P_0)A_e)\,U_0$.
- **Fuel heating value**
  - $h_f$ is the fuel chemical energy per unit mass (typically LHV).
- **Link to overall efficiency**
  - $\eta_{ov}=\dfrac{\mathbb{T}\,U_0}{\dot{m}_f h_f}=\eta_{pr}\,\eta_{th}$.

**Key conclusions**
- Thermal efficiency reduces to $1-Q_{rejected}/Q_{input}$ under adiabatic steady-flow assumptions.
- For a calorically perfect gas, $\eta_{th}$ can be written in temperature ratios and simplifies to $\eta_{idealTurbojet}=1-\dfrac{1}{\tau_r\tau_c}$ for the ideal Brayton assumptions.
- Isentropic compression/expansion and $P_e=P_0$ are the critical assumptions behind the ideal-efficiency form.

---
***Source / attribution***
- Cantwell, *Aircraft and Rocket Propulsion*, Ch. 4 (turbojet-cycle efficiency development).
---

---
# Thrust of an Ideal Turbojet 
---

---
Starting with the Dimensionless Thrust Equation for Fully Expaned exit nozzle
$$
\frac{\mathbb{T}}{P_{0}A_{0}}=\gamma M_{0}^2\left((1+ f)\frac{U_{e}}{U_{0}}-1\right)\left|\,\text{*To determine thurst work out the velocity ratio: } \frac{U_{e}}{U_{0}} =\frac{M_{e}}{M_{0}}\sqrt{\frac{T_{e}}{T_{0}}}\,\right. \tag{4.17/4.18}
$$

#### <u>Using Stagnation Preasure</u> 
To determine Mach we focus on Stagnation prassure/Mach relations through the engine, Using the Engine Preasure Parameters:
$$
P_{te}=P_{0}\pi_{r}\pi_{d}\pi_{c}\pi_{b}\pi_{t}\pi_{n} \tag{4.19-4.22/4.25}
\left|\,\begin{aligned}
&\text{Refrence state:}\\
&\pi_{r} =\tau_{r}^\frac{\gamma}{\gamma - 1}
         =\frac{P_{t0}}{P_{0}} 
         =\left(1 + \frac{\gamma - 1}{2}M_0^2\right)^\frac{\gamma}{\gamma - 1}\\
&\text{For Ideal Cycle Assumptions Diffusser and Nozzle losses are Negligible:}\\
&\therefore \pi_{d}=1\\
&\therefore \pi_{n}=1\\
&\text{Simmilarly, Combustion Chamber is Assumed Isobaric:}\\
&\therefore \pi_{b}=1\\
&\text{The Compressor and turbione have been assumed Isentropic:}\\
&\therefore \pi_{c}=\tau_{c}^\frac{\gamma}{\gamma-1}\\
&\therefore \pi_{t}=\tau_{t}^\frac{\gamma}{\gamma-1}
\end{aligned}\,\right.
$$

$\therefore$ Therefore,
$$
P_{te}=P_{0}\pi_{r}\pi_{c}\pi_{t}
      =P_{e}\left(1+\frac{\gamma-1}{2}M_{e}^2\right)^\frac{\gamma}{\gamma-1} \tag{4.23}
$$

However, Considering the Nozzle is Fully Expanded $P_{e}=P_{0}$, previous reduces to the following:
$$
\pi_{r}\pi_{c}\pi_{t}=\left(1+\frac{\gamma-1}{2}M_{e}^2\right)^\frac{\gamma}{\gamma-1} \tag{4.24}
$$

From here we can interpret the exit Mach $M_{e}$ and the Mach number ratio in terms of $\tau$
$$
\left.
\begin{aligned}
&\text{Exit Mach \#:}\\
& M_{e}^2= \frac{2}{\gamma-1}(\tau_{r}\tau_{c}\tau_{t}-1)
\end{aligned}
\right|\,
\begin{aligned}
&\text{Mach \# Ratio:}\\
&\frac{M_{e}^2}{M_{0}^2}= \left(\frac{\tau_{r}\tau_{c}\tau_{t}-1}{\tau_r-1}\right)
\end{aligned} \tag{4.26/4.27}
$$

#### <u>Using Stagnation Temperature</u>

We use the same approach we did using stagnation pressure parameters, but with the stagnation temperatures instead
$$
T_{te}=T_{0}\tau_{r}\tau_{d}\tau_{c}\tau_{b}\tau_{t}\tau_{n} 
\left|\,\begin{aligned}
&\text{Diffuser and Nozzles are Adiabatic:}\\
&\therefore \tau_{d}=1\\
&\therefore \tau_{n}=1
\end{aligned}\,\right.
\qquad \Rightarrow \qquad
\begin{aligned}
T_{te} &= T_{0}\tau_{r}\tau_{c}\tau_{b}\tau_{t} \\
       &= T_{e}\left(1+\frac{\gamma-1}{2}M_{e}^2\right)\\
       &= T_{e}\tau_{r}\tau_{c}\tau_{t}
\end{aligned} \tag{4.28-4.30}
$$

From the above we can infer:
$$
\frac{T_{e}}{T_{0}}=\tau_{b}=\frac{T_{t4}}{T_{t3}} \tag{4.31}
$$
The above is the same result as summized when we symbolically rendered the thermal efficiency. However, it is more prudent/convient to express in terms of $\tau_{\lambda}\because $ *<u>this parameter is what designers want to maximize and make as large as possible</u>* this term is generally *<u>fixed</u>* and is limited by the turbine materaial thermal allowance.
$$
\frac{T_{e}}{T_{0}}=\frac{\tau_{\lambda}}{\tau_{r}t_{c}} \tag{4.32}
$$

##### <u>Thrust formula is now:</u>
$$
\frac{\mathbb{T}}{P_{0}A_{0}}=\frac{2\gamma}{\gamma-1}(\tau_{r}-1)\left((1+ f)\sqrt{\left(\frac{\tau_{r}\tau_{c}\tau_{t}-1}{\tau_{r}-1}\right)\frac{\tau_{\lambda}}{\tau_{r}t_{c}}}-1\right) 
\left|\,\begin{aligned}
&\text{From the combustor energy balance:}\\
&(\dot m_a+\dot m_f)c_pT_{t4}=\dot m_a c_pT_{t3}+\dot m_f h_f\\
&\Rightarrow (1+f)T_{t4}=T_{t3}+f\,\tau_f\,T_0\quad(\tau_f\equiv h_f/c_pT_0)\\
&\text{Divide by }T_0\text{ and use }\tau_\lambda=T_{t4}/T_0,\;\tau_r\tau_c=T_{t3}/T_0\\
&\Rightarrow (1+f)\tau_\lambda=\tau_r\tau_c+f\,\tau_f\\
&\Rightarrow f=\frac{\tau_{\lambda}-\tau_{r}\tau_{c}}{\tau_{f}-\tau_{\lambda}}
\end{aligned}\,\right. \tag{4.33/4.34}
$$

$\because f=\frac{\tau_{\lambda}-\tau_{r}\tau_{c}}{\tau_{f}-\tau_{\lambda}}$ this implies that our Dimentionless Thurst is a function of only four vairables for the ideal case:
$$
\frac{\mathbb{T}}{P_{0}A_{0}}=F(\tau_{r},\tau_{c},\tau_{\lambda},\tau_{t}) \tag{4.35}
$$

However, $\because$ turbine and compressor are connected by shaft, by analyzing the work done between the two components we will see that $\tau_{t}$ is a function of ($\tau_{r},\tau_{c},\tau_{\lambda}$) 
$$
\dot W_t=\dot W_c
$$
$$
(\dot m_a+\dot m_f)c_p(T_{t4}-T_{t5})=\dot m_a c_p(T_{t3}-T_{t2}) \tag{4.36}
$$
Divide by $\dot m_a c_p T_0$ and use $(1+f)=\dot m_a+\dot m_f\over\dot m_a$:
$$
(1+f)\left(\frac{T_{t4}}{T_0}-\frac{T_{t5}}{T_0}\right)=\frac{T_{t3}}{T_0}-\frac{T_{t2}}{T_0}
$$
Use $\tau_\lambda=\frac{T_{t4}}{T_0}$, $\tau_r\tau_c=\frac{T_{t3}}{T_0}$, and $\tau_r=\frac{T_{t2}}{T_0}$:
$$
(1+f)\tau_\lambda(1-\tau_t)=\tau_r(\tau_c-1) \tag{4.37}
$$
Solve for $\tau_t$:
$$
\tau_t=1-\frac{\tau_r(\tau_c-1)}{(1+f)\tau_\lambda} \tag{4.38}
$$
Substitute $f=\frac{\tau_\lambda-\tau_r\tau_c}{\tau_f-\tau_\lambda}$ to obtain $\tau_t$ in terms of $\tau_r,\tau_c,\tau_\lambda$ only.

The above only assumes adiabatic flow and no shaft losses, and it is not tied to the other assumptions of ideal cycle.

$\because$ Generally, we may neglect fuel mass flow because $\dot{m}_a \gg \dot{m}_f$ (i.e., $f=\dot{m}_f/\dot{m}_a \ll 1$) for most non-afterburning operating conditions; then $(\dot{m}_a+\dot{m}_f)\approx \dot{m}_a$.
$$
\therefore \text{The velocity ratio becomes: } \left(\frac{U_{e}}{U_{0}}\right)^2=\frac{1}{\tau_{r}-1}\left(\tau_{\lambda}-\tau_{r}(\tau_{c}-1)-\frac{\tau_{\lambda}}{\tau_{r}\tau_{c}} \right) \tag{4.39}
$$
---

---
# Max Thrust Ideal
---

---
Considering our Dimensionless Specific Impulse:
$$
 \frac{I_{sp}g}{a_{0}}=\left(\frac{1}{f}\right)\left(\frac{1}{\gamma M_{0}}\right)\frac{\mathbb{T}}{P_{0}A_{0}} \tag{2.45}
$$
We have noticed that $\frac{\mathbb{T}}{P_{0}{A_{0}}},M_{0},f,and \frac{I_{sp}g}{a_{0}}$ are all functions of the $\tau$ ratios by analyzing the Thrust and Specific Impulse  curves (i.e the functions of $F(\tau_{r},\tau_{c},\tau_{\lambda},\tau_{t})$) holding all $\tau$ values constant and independently varying $\tau_{c}/or\tau_{r}$ respectively. We can infer an ideal maximum compresion ratio that maximizes our Thurst. 

<!-- PLOT:tau-sweeps -->

---

From the above plots for some standard realistic parameters we can see that there is a max $\tau_{c}$ that gives max thrust.
In order to determine $\tau_{c_{maxthrust}},$ We find it by maximizing the velocity ratio. This is 
done by taking the partial derivative of the velocity-ratio expression as a function of $\tau_c$:

$$
\left(\frac{U_e}{U_0}\right)^2
=
\frac{1}{\tau_r-1}
\left(
\tau_\lambda-\tau_r(\tau_c-1)-\frac{\tau_\lambda}{\tau_r\tau_c}
\right)\tag{4.39}
$$

Let
$$
\Phi(\tau_c),\text{repesent the function} \left(\frac{U_e}{U_0}\right)^2\text{in terms of}(\tau_c)
$$
with $\tau_r,\tau_\lambda$ treated as constants. Then
$$
\frac{\partial \Phi}{\partial \tau_c}
=
\frac{1}{\tau_r-1}
\frac{\partial}{\partial \tau_c}
\left(
\tau_\lambda-\tau_r(\tau_c-1)-\frac{\tau_\lambda}{\tau_r\tau_c}
\right)
=
\frac{1}{\tau_r-1}
\left(
-\tau_r+\frac{\tau_\lambda}{\tau_r\tau_c^2}
\right)\tag{4.40}
$$

Set to zero for an extremum:
$$
\frac{1}{\tau_r-1}
\left(
-\tau_r+\frac{\tau_\lambda}{\tau_r\tau_c^2}
\right)=0
\;\Longrightarrow\;
-\tau_r+\frac{\tau_\lambda}{\tau_r\tau_c^2}=0\tag{4.41}
$$
$$
\frac{\tau_\lambda}{\tau_r\tau_c^2}=\tau_r
\;\Longrightarrow\;
\tau_\lambda=\tau_r^2\tau_c^2
\;\Longrightarrow\;
\tau_c^2=\frac{\tau_\lambda}{\tau_r^2}
$$
$$
\therefore\quad
\tau_{c,\max\text{ thrust}}=\frac{\sqrt{\tau_\lambda}}{\tau_r}\tag{4.42}
$$
(positive root only, since $\tau_c>0$).

Check it is a maximum:
$$
\frac{\partial^2 \Phi}{\partial \tau_c^2}
=
\frac{1}{\tau_r-1}
\left(
-\frac{2\tau_\lambda}{\tau_r\tau_c^3}
\right)<0
\quad (\tau_r>1,\;\tau_\lambda>0,\;\tau_c>0)
$$

So this critical point gives a maximum velocity ratio (and thus maximum thrust in this idealized form).

---

<!-- PLOT:velocity-ratio -->

---
## $\tau_c$ sweep: how to read the plot
**Plotted quantities**
- $U_e/U_0$ (left axis): velocity ratio from Eq. (4.39).
- $M_e$ (right axis): exit Mach from the isentropic relation tied to $\tau_r\,\tau_c\,\tau_t$.
- $\mathbb{T}/(P_0A_0)$ (right axis): dimensionless thrust from Eq. (4.33/4.34).
- $M_0$ (outer right axis): constant reference line set by the slider.

**Region A: $\tau_c < \tau_{c,\max} = \sqrt{\tau_\lambda}/\tau_r$**
- Increasing $\tau_c$ raises the nozzle expansion capability.
- Fuel–air ratio $f$ remains positive and relatively large.
- Turbine work balance is still favorable ($\tau_t$ not yet depressed).
- Result: $U_e/U_0$ and $\mathbb{T}/(P_0A_0)$ increase with $\tau_c$.

**At $\tau_{c,\max}$**
- From
  $$
  \left(\frac{U_e}{U_0}\right)^2=\frac{1}{\tau_r-1}\left(\tau_\lambda-\tau_r(\tau_c-1)-\frac{\tau_\lambda}{\tau_r\tau_c}\right),
  $$
  setting $\partial/\partial\tau_c=0$ gives
  $$
  \tau_{c,\max}=\frac{\sqrt{\tau_\lambda}}{\tau_r}.
  $$
- This is where $U_e/U_0$ (and ideal thrust) peaks.

**Region B: $\tau_c > \tau_{c,\max}$**
- Compressor work continues to rise, forcing more turbine extraction.
- $\tau_t$ drops, reducing exit stagnation temperature.
- Fuel–air ratio decreases,
  $$
  f=\frac{\tau_\lambda-\tau_r\tau_c}{\tau_f-\tau_\lambda},
  $$
  so less energy is added.
- Result: $U_e/U_0$ and $\mathbb{T}/(P_0A_0)$ decline even if $M_e$ keeps rising.

**Fuel-shutoff limit (what it means physically)**
- At $\tau_c=\tau_\lambda/\tau_r$, the combustor energy balance gives $f=0$.
- With no fuel addition, $T_{t4}=T_{t3}$, so the core has no heat input to offset compressor work.
- The turbine can only extract work from the compressed air stream, so $\tau_t$ drops and the exit stagnation temperature collapses.
- In the ideal model (no losses, $P_e=P_0$), the net jet power goes to zero and thrust can approach zero or even negative.
- Practically, this point is a boundary of the ideal cycle: real engines would flame out or be unable to sustain operation before reaching it.

**Key takeaway (cycle physics, not nozzle physics)**
- The thrust peak is set by a balance between **added heat** and **shaft work required by the compressor**.
- Increasing $\tau_c$ improves pressure ratio but also raises compressor work, which forces the turbine to extract more energy and lowers $\tau_t$.
- Once the turbine work penalty and reduced $f$ dominate, the jet energy drops even if $M_e$ continues to rise.

---

---
# Engine Matching Conditions
---

---
## 
Up to this point, the analysis focused on maximizing thrust through $\tau$-ratio relationships (e.g., how $\tau_c$, $\tau_r$, and $\tau_\lambda$ shape $U_e/U_0$, $M_e$, and $\mathbb{T}/(P_0A_0)$). That tells us where peak performance *could* occur, but it does not by itself guarantee the engine can actually operate there.

To be physically realizable, every operating point must also satisfy **mass-flow matching** across all coupled components: inlet/diffuser, compressor, combustor, turbine, and nozzle. In steady operation, the core cannot accumulate mass, so each stage must pass compatible corrected flow rates while also satisfying the shaft-work coupling between compressor and turbine.

This is why matching is central: if one component demands a different flow than the adjacent component can pass (for the same shaft speed/pressure ratio/temperature state), the assumed point is not self-consistent. The engine will move away from that point (or become unstable) until continuity and work balance are restored.

A compact way to think about the matching requirement is:
$$
\dot m_2 = \dot m_3,\qquad
\dot m_4 = \dot m_3 + \dot m_f,\qquad
\dot m_4 = \dot m_e,\qquad

$$
(with bleed/cooling terms included when modeled), together with the stage flow-capacity relation
$$
\dot m \;=\; \rho U A
\;=\;
\frac{\gamma}{\left(\frac{\gamma+1}{2}\right)^{\frac{\gamma+1}{2(\gamma-1)}}}
\left(\frac{P_t A}{\sqrt{\gamma R T_t}}\right)\,f(M),
\qquad
f(M)\equiv
\left(\frac{\gamma+1}{2}\right)^{\frac{\gamma+1}{2(\gamma-1)}}
\frac{M}{\left(1+\frac{\gamma-1}{2}M^2\right)^{\frac{\gamma+1}{2(\gamma-1)}}},
$$
where $P_t$, $T_t$, area, and Mach/choking state set how much flow each component can pass.

So the next step is to treat thrust-optimal trends and stage matching together: the best cycle point is not only high-thrust on paper, but also one where compressor, turbine, and nozzle can all pass the required mass flow simultaneously.

## Turbine - Nozzle 

Mass balance between station 4 - exit: since nozzle is ideal $P_{te}=P_{t8}$ same with $T_t$ values
$$
\dot{m}_{4} = \dot{m}_{e} \Rightarrow \left(\frac{P_{t4}A_4}{\sqrt{\gamma R T_{t4}}}\right)\,f(M_{4})=\left(\frac{P_{t8}A_8}{\sqrt{\gamma R T_{t8}}}\right)\,f(M_{8})\tag{4.43}
$$
Because we see a large preasure drop across the turbine and the first stage of the turbine (called turbine nozzle) the flow is choked:
$$
\therefore  A_{4}f(M_{4})=A_{4}^*
$$
Similarly sicne, over a wide range of reallistic operating conditions the the nozzles throat is also choked we can simplifiy the above into:
$$
\frac{P_{t4}A_{4}^*}{\sqrt{T_{t4}}} = \frac{P_{t8}A_{8}}{\sqrt{T_{t8}}}\tag{4.44}
$$

Since we have assumed turbine is isentropic $(i.e, \pi_{t}=\tau_{t}^\frac{\gamma}{\gamma-1})$ and there is no losses and is adiabatic throught the nozzle (i.e, $P_{t5}=P_{t8}$ and $T_{t5}=T_{t8}$) 
$$
\tau_t = \frac{T_{t5}}{T_{t4}} = \left(\frac{A_{4}^*}{A_{8}}\right)^\frac{2(\gamma-1)}{\gamma+1} \tag{4.46}
$$

Note: this implies that the temp and pressure prameters are entirely detemined by the Area ratio between the turbine nozzle throat and the exit nozzle throat.

## Free-Stream - Compressor Inlet

Mass balance between station 0 - station 2
$$
\dot{m}_{a}=\dot{m}_{2}\Rightarrow \left(\frac{P_{t0}A_{0}}{\sqrt{T_{t0}}}\right)f(M_{0})=\left(\frac{P_{t2}A_{2}}{\sqrt{T_{t2}}}\right)f(M_{2})\tag{4.47}
$$

Since, it has been assumed this region is considered adiabatic (i.e, $T_{t2}=T_{t0}$)
$$
\therefore \text{The mass balance reduces to:} \qquad P_{t0}A_{0}(M_{0})=P_{t2}A_{2}(M_{2})\tag{4.48}
$$
This is commonly expressed as $f(M_{2})$ in terms of the engine parameters
$$
f(M_{2})=\left(\frac{1}{\pi_{d}}\right)\left(\frac{A_{0}}{A_{2}}\right)f(M_{0})\tag{4.50}
$$

## Compressor - Turbine 

Compressor-to-turbine matching (including fuel addition):
$$
\dot m_2(1+f)=\dot m_4
\Rightarrow
(1+f)\left(\frac{P_{t2}A_2}{\sqrt{T_{t2}}}\right)f(M_2)
=
\left(\frac{P_{t4}A_4^*}{\sqrt{T_{t4}}}\right)\tag{4.51}
$$

This is commonly expressed as $f(M_{2})$ in terms of the engine parameters.
$$
f(M_{2})=\left(\frac{1}{1+f}\right)\left(\frac{\pi_{c}\pi_{b}}{\sqrt{\tau_{\lambda}/\tau_{r}}}\right)\left(\frac{A_{4}^*}{A_{2}}\right)\tag{4.52}
$$

In terms of the ideal assumbtions (i.e $\pi_{b}=1 $) and neglecting f $\because \dot{m}_{a}>>\dot{m}_{a}$
$$
f(M_{2})=\left(\frac{\pi_{c}}{\sqrt{\tau_{\lambda}/\tau_{r}}}\right)\left(\frac{A_{4}^*}{A_{2}}\right)\tag{4.53}
$$

**Note:**
$f(M_{2})$ is an outcome of the interaction between the nozzle with the turbine/compressor. Considering this and what was determined with the inlet diffusor/freestream. It is thus, noted: The engine determines/demands what the $f(M_{2})$ is. The gas dynamics of the of the inleft adjust ($A_0$ and/or $\pi_{d}$) to suit the demand 

---

## Engine Matching Summary

The Following in order from nozzle to inlet are:
$$
\tau_t = \left(\frac{A_{4}^*}{A_{8}}\right)^\frac{2(\gamma-1)}{\gamma+1} \tag{4.45}
$$
$$
\tau_c-1=\frac{\tau_{\lambda}}{\tau_{r}}(1-\tau_t)\tag{4.46}
$$
$$
f(M_{2})=\left(\frac{\pi_{c}}{\sqrt{\tau_{\lambda}/\tau_{r}}}\right)\left(\frac{A_{4}^*}{A_{2}}\right)\tag{4.53}
$$
$$
f(M_{2})=\left(\frac{1}{\pi_{d}}\right)\left(\frac{A_{0}}{A_{2}}\right)f(M_{0})\tag{4.50}
$$

# <u>Example Analysis from Cantwell 4.7.1</u>

Supersonic ideal turbojet at $M_0=3$ with $T_{t4}=1944\,\mathrm{K}$. The compressor and turbine polytropic efficiencies are $\eta_{pc}=\eta_{pt}=1$. At the condition shown, the engine operates semi-ideally with $\pi_b=\pi_n=1$, but $\pi_d<1$, and uses a simple convergent nozzle. The relevant areas are
$$
\frac{A_1}{A_2}=2,\qquad \frac{A_2}{A_4^*}=14,\qquad \frac{A_e}{A_4^*}=4.
$$
Supersonic flow is established at the inlet entrance with a normal shock downstream of the inlet throat (supercritical inlet operation).

**Task**
1) Sketch the distribution of stagnation pressure $P_t/P_{t0}$ and stagnation temperature $T_t/T_{t0}$ through the engine, and assign numerical values at each station.

Figure 4.6 (Cantwell, p.100)

![Figure 4.6: Supersonic turbojet with inlet shock](/analysis/figure_4_6.png)

---

**Note:**
- $f(3)=0.236$
- $T_{t0}=605\,\mathrm{K}$
- $\dfrac{A_e}{A_1}=\left(\dfrac{A_e}{A_4^*}\right)\left(\dfrac{A_4^*}{A_2}\right)\left(\dfrac{A_2}{A_1}\right)=\dfrac{4}{14}\cdot\dfrac{1}{2}=\dfrac{1}{7}$

### 1) Given data and ratios

- $M_0 = 3$
- $T_{t4} = 1944\,\mathrm{K}$
- $\eta_{pc}=\eta_{pt}=1$
- $\pi_b=\pi_n=1$
- $\pi_d<1$ (normal shock in inlet)
- $\gamma=1.4$
- $T_{t0}=605\,\mathrm{K}$

Then
$$
\frac{T_{t4}}{T_{t0}}=\frac{1944}{605}=3.214.
$$


---

### 2) Turbine ratio from $A_4^*/A_e$

With $A_4^*/A_e=1/4$:
$$
\tau_t=\left(\frac{A_4^*}{A_e}\right)^{\frac{2(\gamma-1)}{\gamma+1}}=\left(\frac{1}{4}\right)^{1/3}=0.630,
$$
$$
\pi_t=\tau_t^{\gamma/(\gamma-1)}=\tau_t^{3.5}=0.199.
$$


---

### 3) Compressor ratio from shaft balance

$$
\tau_c-1=\frac{T_{t4}}{T_{t0}}(1-\tau_t)=3.214(1-0.630)=1.189,
$$
$$
\tau_c=2.189,\qquad \pi_c=\tau_c^{3.5}=15.4.
$$


---

### 4) Inlet recovery from matching

Use the mass-flow function
$$
f(M)=\frac{M}{\left[\left(\frac{2}{\gamma+1}\right)\left(1+\frac{\gamma-1}{2}M^2\right)\right]^{\frac{\gamma+1}{2(\gamma-1)}}},\qquad \gamma=1.4.
$$

Compute the target value:
$$
f(M_2)=\left(\frac{\pi_c}{\sqrt{T_{t4}/T_{t0}}}\right)\left(\frac{A_4^*}{A_2}\right)
=\frac{15.4}{\sqrt{3.214}}\cdot\frac{1}{14}=0.614.
$$

Bracket/interpolate:
- $M_2=0.38\Rightarrow f=0.609$
- $M_2=0.39\Rightarrow f=0.616$

So
$$
M_2\approx 0.388.
$$

Solve for inlet recovery:
$$
f(M_2)=\left(\frac{1}{\pi_d}\right)\left(\frac{A_1}{A_2}\right)f(M_0)
=\frac{0.472}{\pi_d}
\Rightarrow
\pi_d=\frac{0.472}{0.614}=0.769.
$$

**Result:** $M_2\approx0.388$, $\pi_d\approx0.769$.


---

### 5) Stagnation pressure and temperature distributions

**Thinking behind this chain:** each component contributes a stagnation-pressure ratio $\pi_x\equiv P_{t,\text{out}}/P_{t,\text{in}}$, so marching station-by-station means multiplying ratios in sequence. That is why the burner/nozzle steps do not change the product here ($\pi_b=1,\;\pi_n=1$), while inlet/compressor/turbine do. 
$$
\frac{P_{te}}{P_{t0}}
=
\left(\frac{P_{t2}}{P_{t0}}\right)
\left(\frac{P_{t3}}{P_{t2}}\right)
\left(\frac{P_{t4}}{P_{t3}}\right)
\left(\frac{P_{t5}}{P_{t4}}\right)
\left(\frac{P_{te}}{P_{t5}}\right)
=\pi_d\,\pi_c\,\pi_b\,\pi_t\,\pi_n
=\pi_d\,\pi_c\,\pi_t.
$$
Equivalently,
$$
\frac{P_t}{P_{t0}}:\;
1 \xrightarrow{\pi_d} \pi_d
\xrightarrow{\pi_c} \pi_d\pi_c
\xrightarrow{\pi_b=1} \pi_d\pi_c
\xrightarrow{\pi_t} \pi_d\pi_c\pi_t
\xrightarrow{\pi_n=1} \pi_d\pi_c\pi_t
$$

$$
\frac{P_t}{P_{t0}}:\;
1 \to 0.769 \to 11.84 \to 11.84 \to 2.36 \to 2.36
$$

**Thinking behind this chain:** in an adiabatic inlet and nozzle, stagnation temperature is unchanged, so those steps = 1 , no change ideal. The compressor raises total temperature by work input (factor $\tau_c$), the burner sets the jump to the specified turbine-inlet level $T_{t4}/T_{t0}$, and the turbine then reduces it by the work-extraction factor $\tau_t$.
$$
\frac{T_{te}}{T_{t0}}
=
\left(\frac{T_{t2}}{T_{t0}}\right)
\left(\frac{T_{t3}}{T_{t2}}\right)
\left(\frac{T_{t4}}{T_{t3}}\right)
\left(\frac{T_{t5}}{T_{t4}}\right)
\left(\frac{T_{te}}{T_{t5}}\right)
=
1\cdot\tau_c\cdot\frac{T_{t4}}{T_{t3}}\cdot\tau_t\cdot1
=
\tau_t\frac{T_{t4}}{T_{t0}}.
$$
 Equivalently,
$$
\frac{T_t}{T_{t0}}:\;
1 \xrightarrow{} 1
\xrightarrow{\tau_c} \tau_c
\xrightarrow{} \frac{T_{t4}}{T_{t0}}
\xrightarrow{\tau_t} \tau_t\frac{T_{t4}}{T_{t0}}
\xrightarrow{} \tau_t\frac{T_{t4}}{T_{t0}}
$$

$$
\frac{T_t}{T_{t0}}:\;
1 \to 1 \to 2.189 \to 3.214 \to 2.025 \to 2.025
$$

| Station | $P_t/P_{t0}$ | $T_t/T_{t0}$ |
|---|---:|---:|
| 0 | 1.000 | 1.000 |
| 1 | $\approx1.000$ | 1.000 |
| 2 | 0.769 | 1.000 |
| 3 | 11.84 | 2.189 |
| 4 | 11.84 | 3.214 |
| 5 | 2.36 | 2.025 |
| $e$ | 2.36 | 2.025 |

Exit (convergent, choked, $M_e=1$):
$$
\frac{P_{te}}{P_{t0}}=2.36,
\quad
\frac{P_e}{P_{t0}}=2.36\times0.528=1.24,
\quad
\frac{P_e}{P_0}=\frac{P_e/P_{t0}}{P_0/P_{t0}}=45.6,
$$
$$
\frac{T_{te}}{T_{t0}}=2.025,
\quad
\frac{T_e}{T_{t0}}=2.025\times0.833=1.69,
\quad
\frac{T_e}{T_0}=\frac{1.69}{(1+0.2M_0^2)^{-1}}=4.73,
$$
$$
\frac{U_e}{U_0}=\frac{M_e}{M_0}\sqrt{\frac{T_e}{T_0}}=\frac{1}{3}\sqrt{4.73}\approx0.725.
$$

---

### 6) Sketch guidance

- **$P_t/P_{t0}$:** nearly flat to inlet shock, sharp drop across shock ($\pi_d$), large rise across compressor, flat across burner ($\pi_b=1$), strong drop across turbine, flat through nozzle ($\pi_n=1$).
- **$T_t/T_{t0}$:** flat through inlet/shock, rises across compressor, rises again in burner to a maximum at station 4, drops across turbine, then stays flat through adiabatic nozzle.


---

### 7) Dimensionless thrust in $\mathbb{T}/(P_0A_0)$ (symbolic and numerical)

Assume capture area $A_0=A_1$ and a choked convergent nozzle ($M_e=1$):
$$
\frac{T_e}{T_{t5}}=\frac{2}{\gamma+1},\qquad
\frac{P_e}{P_{t5}}=\left(\frac{2}{\gamma+1}\right)^{\frac{\gamma}{\gamma-1}}.
$$

Define
$$
\tau_r=1+\frac{\gamma-1}{2}M_0^2,\qquad
\frac{T_{t5}}{T_{t0}}=\tau_t\frac{T_{t4}}{T_{t0}}.
$$

Then
$$
\frac{T_e}{T_0}=\frac{2}{\gamma+1}\left(\tau_t\frac{T_{t4}}{T_{t0}}\right)\tau_r,
\qquad
\frac{U_e}{U_0}=\frac{1}{M_0}\sqrt{\frac{T_e}{T_0}}.
$$

Dimensionless thrust in pressure-area form:
$$
\frac{\mathbb{T}}{P_0A_0}=\gamma M_0^2\left(\frac{U_e}{U_0}-1\right)+\left(\frac{P_e}{P_0}-1\right)\frac{A_e}{A_0},
$$
with
$$
\frac{P_e}{P_0}=\left(\frac{2}{\gamma+1}\right)^{\frac{\gamma}{\gamma-1}}(\pi_d\pi_c\pi_t)\,\tau_r^{\frac{\gamma}{\gamma-1}}.
$$

Numerical evaluation:
$$
\gamma=1.4,\quad M_0=3,\quad \tau_r=2.8,\quad \tau_t=0.630,\quad \frac{T_{t4}}{T_{t0}}=3.214,
$$
$$
\pi_d\pi_c\pi_t=0.769(15.4)(0.199)=2.36,\qquad \frac{A_e}{A_0}=\frac{1}{7},
$$
$$
\frac{T_e}{T_0}=\frac{2}{2.4}(0.630)(3.214)(2.8)=4.73
\Rightarrow
\frac{U_e}{U_0}=\frac{1}{3}\sqrt{4.73}=0.725,
$$
$$
\frac{P_e}{P_0}=\left(\frac{2}{2.4}\right)^{3.5}(2.36)(2.8)^{3.5}=45.6,
$$
$$
\frac{\mathbb{T}}{P_0A_0}=(1.4)(3^2)(0.725-1)+(45.6-1)\left(\frac{1}{7}\right)=2.91.
$$

$$
\boxed{\frac{\mathbb{T}}{P_0A_0}\approx 2.91}
$$
---

### 8) Increasing Thurst by adding Divergent Expansion Section to exit nozzle
$$
\begin{aligned}
&\frac{\mathbb{T}}{P_0A_0} =\gamma M_0^2\left(\frac{U_e}{U_0}-1\right)+\left(\frac{P_e}{P_0}-1\right)\frac{A_e}{A_0}\\ 
                           &=\gamma M_0^2\left(\frac{M_e}{M_0}\sqrt{\frac{T_e}{T_0}}-1\right)+\left(\frac{P_e}{P_0}-1\right)\frac{A_e}{A_0}\\
                           &=\gamma M_0^2\left(\frac{M_e}{M_0}\sqrt{\frac{T_{te}}{T_{0}}\frac{T_e}{T_{te}}}-1\right)+\left(\frac{P_e}{P_{te}}\frac{P_{te}}{P_0}-1\right)\frac{A_e}{A_8}\frac{A_8}{A_0}\\

&\text{Or As a function of}, M_{e}\\
&\frac{\mathbb{T}}{P_0A_0}(M_{e})=\gamma M_0^2\left(\frac{M_e}{M_0}\sqrt{\frac{T_{te}}{T_{0}}\left(\frac{1}{1+\frac{\gamma-1}{2}M_e^2}\right)}-1\right)+\left(\frac{P_{te}}{P_0}\left( \frac{1}{1+\frac{\gamma-1}{2}M_e^2}\right)^{\frac{\gamma}{\gamma-1}}-1\right)\frac{A_8}{A_0}\frac{1}{f({M_e})}                        
\end{aligned} \tag{4.74}
$$

<!-- PLOT:tbar-vs-me -->

---
# Compressor Operating Line
---

---

Using our Engine matching conditions:
$$
\tau_c-1=\frac{\tau_{\lambda}}{\tau_{r}}(1-\tau_t)
$$
$$
 f(M_{2})=\left(\frac{\pi_{c}}{\sqrt{\tau_{\lambda}/\tau_{r}}}\right)\left(\frac{A_{4}^*}{A_{2}}\right)
$$

And, eliminateing $\tau_{\lambda}/\tau_{r}$ using $\pi_{c}=\tau_c^\frac{\gamma}{\gamma-1}$ results in the following expression:
$$
\frac{\pi_{c}}{\sqrt{\pi_c^\frac{\gamma-1}{\gamma}-1}}=\sqrt{\frac{1}{1-\left(\frac{A_4^*}{A_8}\right)^\frac{2(\gamma-1)}{\gamma+1}}}\frac{A_2}{A_4^*}f(M_2)\tag{4.76}
$$

Commoninly shown as, $f(M_2)$ as a funtion of, $\pi_c$
$$
 f(M_2)=\left(\frac{A_4^*}{A_2}\right)\sqrt{1-\left(\frac{A_4^*}{A_8}\right)^\frac{2(\gamma-1)}{\gamma+1}}\;\frac{\pi_c}{\sqrt{\pi_c^\frac{\gamma-1}{\gamma}-1}}
$$

---

<!-- PLOT:operating-line -->

---
# The Gas Generator
---

---

The **gas generator** is the compressor + combustor + turbine. 
For compressor analysis, performance is commonly represented on a **compressor map**, relating pressure ratio, corrected speed, and reduced/corrected flow.

![Figure 4.12](/analysis/figure_4_11.png)

To compare operating points across altitude and flight-speed changes, we define **corrected weight flow**:
$$
\dot{w}_{c}=\dot{m}_{a}g\frac{\sqrt{\theta}}{\delta},
\qquad\left|\,\begin{aligned}
&\theta=\frac{T_{t2}}{T_{SL}},\qquad T_{SL}=518.67\,R\\
&\delta=\frac{P_{t2}}{P_{SL}},\qquad P_{SL}=2116.22\,\left[\frac{lb}{ft^2}\right]
\end{aligned}
\right.\tag{4.77}
$$

Here, $P_{SL}$ and $T_{SL}$ are standard sea-level reference conditions.

The air gas constant is:
$$
R_{\text{air}}=\frac{\bar{R}}{M_{\mathrm{air}}}
\qquad\Rightarrow\qquad
R_{\text{air}}=\frac{1545.32\ \mathrm{ft\,lbf/(lbmol\cdot R)}}{28.97\ \mathrm{lbm/lbmol}}
=\frac{1545.32}{28.97}\,\frac{\mathrm{ft\,lbf}}{\mathrm{lbm\cdot R}}
=1710.2\ \frac{\mathrm{ft}^2}{\mathrm{s}^2\cdot \mathrm{R}}\tag{4.80}
$$

Using the quasi-1D compressible-flow relation, corrected flow can be rewritten as:
$$
\dot{w}_{c}=\dot{m}_{a}g\frac{\sqrt{\theta}}{\delta}=\left(\frac{1}{\left(\frac{\gamma+1}{2}\right)^\frac{\gamma+1}{2(\gamma-1)}}\frac{\gamma gP_{SL}}{\sqrt{\gamma RT_{SL}}}\right)A f(M)\tag{4.81}
$$

Since the bracketed term is constant (for fixed references and gas model):
$$
\dot{w}_{c}=49.459\,A_2 f(M_2)\;\left[\frac{lb}{s}\right]\tag{4.82}
$$

---
*Why this matters for the compressor map*

- $\dot{w}_c$ is derived to remove inlet-condition scaling effects from raw flow.
- For fixed inlet area $A_2$, corrected flow is proportional to $f(M_2)$.
- So $f(M_2)$ is a convenient reduced-flow coordinate in the matching equations and maps directly to movement along compressor-map speed lines.
- In practice, using $f(M_2)$ here preserves the same flow physics as corrected flow while making the matching relations cleaner.
---

The compressor map is a cross plot of 3 independent functions. The $1^{st}$ being the compressor turbine inlet matching function rearranged to express $/pi_c$:
$$
\pi_c=F_1\left(\frac{\tau_{\lambda}}{\tau_r},f(M_2)\right)=\left(\frac{(1+f)}{\pi_b}\frac{A_2}{A_4^*}\right)\sqrt{\frac{\tau_{\lambda}}{\tau_r}}f(M_2)\tag{4.83}
$$
---
Note: fuel/air ratio and burner losses are included and the value in ( ) $\approx$ constant.
---

The $2^{nd}$, relates compressor efficiency to the preassure ratio and mass flow. 
$$
\eta_c=F_2(\pi_c,f(M_2))\tag{4.84}
$$

---
Note: This function can only be determined by exhaustive empirical testing of the compressor:

Using compressor-map terminology, this means:
- At each corrected speed line, moving in $f(M_2)$ changes incidence/losses and therefore $\eta_c$.
- For a given $f(M_2)$, changing loading (reflected by $\pi_c$) also changes losses and $\eta_c$.
- The map therefore contains **iso-efficiency contours** in the $(\pi_c, f(M_2))$ plane.

Why this is not derived from first principles here:
- Unlike the matching function $F_1$, efficiency depends on detailed 3D blade aerodynamics, boundary layers, tip-clearance leakage, secondary flows, and Reynolds-number effects.
- Those effects are too complex to capture with a single closed-form ideal-cycle equation.
- So $F_2$ is obtained from compressor rig/engine test data and then curve-fit for use in cycle matching.
---

The $3^{rd}$, relates the rotational speed of the compressor and the pressure ratio and mass flow:
$$
\pi_c=F_3\left(\frac{M_{b0}}{\sqrt{\tau_r}},f(M_2)\right)\tag{4.85}
$$
$$
M_{b0}=\frac{U_{blade}}{\sqrt{\gamma RT_0}}\tag{4.86}
$$

---
Note: $M_{b0}$ the compressor blade Mach is a function of the compressor blade speed $U_{blade}$ and the free steem sonic speed $a_0$ 
- This appears on the map as lines of constant % corrected speed.
- $M_{b0}/\sqrt{\tau_r}$ is a *corrected blade Mach* (or corrected speed) that removes inlet-temperature effects, so the same nondimensional line applies at different flight conditions.
- On a compressor map, these appear as **constant corrected-speed lines** (often labeled $N_c$ or $N/\sqrt{\theta}$), along which $\pi_c$ varies with $f(M_2)$.
- Moving to higher $M_{b0}/\sqrt{\tau_r}$ shifts the operating line upward, enabling higher pressure ratios at a given flow but also approaching surge/temperature limits.
- Physically: higher blade speed increases work input per unit mass, raising $\pi_c$, while $f(M_2)$ sets the flow capacity (incidence/losses), so the map captures both loading and flow effects.
---

---
# Simple Aerodynamic Model of Compressor Blades
---

![Figure 4.10 :Gas Generator](/analysis/figure_4_10.png)

![Figure 4.12](/analysis/figure_4_12.png)

This methodolgy is called the **strip model of the compressor** where the blades are approximated by an infinite 2-D cascade. This model utilizes the aerodynamic principles of the flow across across the compressor airfoils. The flow off the trailing edge is directed by the wing surface and is a fixed angle. The leading edge flow angle varies with the axial flow and blade speed.

One design parameter of a comprressor cascade is the solidity: 

- Solidity is defined as the blade chord / the verticle distance between the compressor blades trailing edges.
- Low solidty: *blades far apart* $\rightarrow$  guideing effects of cascade on flow reduces (i.e. trailing edges flow risks stall/ flow seperation). Work capability is reduced.
- High solidity: *blades close together* $\rightarrow$  drag losses and weight of compressor becomes excessive 
- Solidity $\approx 1$ is typical 

## Model Assumptions
- $c_z$ is constant throughout the engine
- All stages are identical
- The stage-averaged inlet and exit flow are assumed equal in direction and magnitude
- Flow angles $\alpha_{2a} \ \& \ \beta_{2b}$ are held constant
- Radial variations in flow along the blad elemeents are neglected (i.e $c_r$ is neglected)

$$
\alpha_{2a} = \alpha_{3a},\qquad C_{2a} = C_{3a}\tag{4.88}
$$

## The Station Notations
- Station $2_a$ - Compressor rotor inlet 
- Station $2_b$ - Compressor rotor exit/ Stator inlet
- Station $3_a$ - Stator exit

## The Velocity Vectors
The velocity vector relationship between 2a and 2b are:
$$
W_{2a}=C_{2a}-U_{blade}\qquad \& \qquad W_{2b}=C_{2b}-U_{blade}\tag{4.87}
$$

## Velocity Component Vectors
- Axial velocity: $$c_z$$
- Tangential velocity:
$$
c_{2a\theta} = c_z\tan(\alpha_{2a})\qquad c_{2b\theta} = U_{blade} - c_z\tan(\beta_{2b})\tag{4.89}
$$

## Flow Angles
- Non-moving cordinates: $$\alpha_{2a}, \alpha_{2b}, \ \& \ \alpha_{3a}$$
- Moving coordinates: $$\beta_{2a}, \beta_{2b}, \ \& \ \beta_{3a}$$

## Tangential velocity change 
This change in flow is induced by the tangential component of lift:
$$
\Delta c_{\theta} = c_{2b\theta} - c_{2a\theta}=U_{blade} - c_z\tan(\beta_{2b}) - c_z\tan(\alpha_{2a})\tag{4.90}
$$

Note: Consdierable axial force componetent on stage due to preasure increases as flow interacts with stator ( which removes tangential velocity change).

## Energy balance
Work done across the rotor is a key equation that connects cascade work done, blade speed and change in tangential velocity
$$
\dot{m}_{a}(h_{t2b}-h_{t2a})=\bar F \bar U_{blade}\left|\,\bar F=\dot{m}_{a}\Delta c_{\theta}\right.\tag{4.91}
$$

In terms of the tangential velocity change:
$$
\dot{m}_{a}(h_{t2b}-h_{t2a})=\dot{m}_{a}\Delta c_{\theta}U_{blade}\tag{4.92}
$$

All stage work is done by rotor 
$$
  \therefore (h_{t3a}-h_{t2a})=\Delta c_{\theta}U_{blade} \tag{4.93}
$$

Also $\because$ stages are identical the enthalpy across the compressor can be written:
$$
(h_{t3}-h_{t2})=n\Delta c_{\theta}U_{blade}\left|\, n = \text{\# of identical stages}\right.\tag{4.94}
$$

Assuming constant heat capacity:
$$
c_p\left(T_{t3}-T_{t2}\right)=n\,\Delta c_{\theta}\,U_{blade}
$$

Divide by $c_pT_0$:
$$
\frac{T_{t3}}{T_0}-\frac{T_{t2}}{T_0}
=
n\frac{\Delta c_{\theta}U_{blade}}{c_pT_0}
$$

Using $\tau_c\equiv T_{t3}/T_{t2}$ and $\tau_r\equiv T_{t2}/T_0$:
$$
  \tau_r(\tau_c-1)=n(\gamma-1)\frac{U_{blade}^2}{\gamma RT_0}\left(\frac{\Delta c_{\theta}}{U_{blade}}\right)\tag{4.95}
$$

Now define
$$
\psi \equiv \frac{\Delta c_{\theta}}{U_{blade}}\tag{4.97}
$$

$$
M_{b0}\equiv\frac{U_{blade}}{\sqrt{\gamma RT_0}}
\qquad
c_p=\frac{\gamma R}{\gamma-1}
$$


Then
$$
\frac{\Delta c_{\theta}U_{blade}}{c_pT_0}
=
\frac{\Delta c_{\theta}}{U_{blade}}
\frac{U_{blade}^2}{c_pT_0}
=
\psi\,(\gamma-1)\,M_{b0}^2
$$
Substituting the definitions of $\psi$, $M_{b0}$, and $c_p$ and rearranging to solve for $\tau_c$
$$
\tau_c=1 + n(\gamma-1)\left(\frac{M_{b0}}{\sqrt{\tau_r}}\right)^2\psi
\tag{4.96}
$$

The Stage Load factor's upper limit is $\approx \frac{1}{4}$ and is a measure of max pressure rise a stage can achieve.

Expressing the Stage load factor in terms of $f(M_2)$ is required to fully define $\pi_c=F_3\left(\frac{M_{b0}}{\sqrt{\tau_r}},f(M_2)\right)$ we do this by using the definition of the change in tangential velocity.
$$
\psi = 1 - \frac{c_z}{U_{blade}}\left(\tan(\beta_{2b}) + \tan(\alpha_{2a})\right)\tag{4.98}
$$

$$
\phi=\frac{c_z}{U_{blade}}\tag{4.99}
$$

For a basic compressor design based on aerodynamic principles, it comes down to just two basic dimensionless velocity ratios, the $\psi \ \& \ \phi$ since the flow angles are assumed constant. Therefore the stage load factor is a linear function of the flow coefficient.
$$
  \tau_c=1 + n(\gamma-1)\left(\frac{M_{b0}}{\sqrt{\tau_r}}\right)^2\big( 1 - \phi(\tan(\beta_{2b}) + \tan(\alpha_{2a}))\big)\tag{4.100}
$$

At station 2 $f(M_2)$ can be approximated as follows, because Mach is generally relatively low
$$
f(M_2)
\approx \left(\frac{\gamma+1}{2}\right)^\frac{\gamma+1}{2(\gamma-1)}\frac{c_z}{\sqrt{\gamma RT_2}}
\approx \left(\frac{\gamma+1}{2}\right)^\frac{\gamma+1}{2(\gamma-1)}\frac{U_{blade}}{\sqrt{\gamma RT_2}}\left(\frac{c_z}{U_{blade}}\right)\\[6pt]
  \tag{4.101}
$$

$$
\phi = \frac{1}{\left(\frac{\gamma+1}{2}\right)^\frac{\gamma+1}{2(\gamma-1)}}\frac{f(M_2)}{\left(\frac{M_{b0}}{\sqrt{\tau_r}}\right)}\tag{4.102}
$$

Therefore, the aerodynamic model of the compressor results in:
$$
\tau_c = 1 + n(\gamma-1)\left(\frac{M_{b0}}{\sqrt{\tau_r}}\right)^2
-\frac{n(\gamma-1)}{\left(\frac{\gamma+1}{2}\right)^\frac{\gamma+1}{2(\gamma-1)}}(\tan(\beta_{2b}) + \tan(\alpha_{2a}))\left(\frac{M_{b0}}{\sqrt{\tau_r}}\right)f(M_2)\tag{4.103}
$$

and $\because$ assumed ideal (adiabatic, and reversible) isentropic compression
$\pi_c=\tau_c^\frac{\gamma}{\gamma-1}$

---
## Compressor Map using Strip Model
---

<!-- PLOT:strip-model-map -->

---
## Strip-Model Equations (LaTeX + Python Definitions)
---
This cell pair lists the exact equations used in the compressor-map strip-model and binds each equation to Python functions so the math and implementation stay synchronized.

<!-- PLOT:strip-model-equations -->

## What This Plot Shows (Design Context)

- **Axes:** Horizontal is the corrected mass-flow function $f(M_2)$ and vertical is compressor pressure ratio $\pi_c$. Together they describe how much flow the compressor can pass and how much pressure rise it can produce.
- **Colored families:** The heatmap families are the model-generated speed lines ($M_{b0}/\sqrt{\tau_r}$) and the $F_1$ matching lines for different $\tau_\lambda/\tau_r$. This is the compressor map predicted by the strip model plus the turbine/burner matching constraint.
- **Black user lines:** The black $M_{b0}/\sqrt{\tau_r}$ line is your selected corrected speed level. The black $F_1$ line is your selected combustor temperature ratio. These are the two design “knobs” that fix a single operating point.
- **Intersection point:** The black dot is where those two constraints meet. That point is the consistent design solution: the compressor, turbine, and burner can all be satisfied simultaneously at that $f(M_2)$ and $\pi_c$.
- **Operating-line envelope:** The blue dashed compressor operating line comes from the nozzle/burner flow constraint. **Below** it (lower $\pi_c$ at a given $f(M_2)$) is generally feasible for the assumed geometry. **Above** it the flow constraint is violated, so those points are not physically achievable unless geometry or matching changes.
- **Ideal turbojet meaning:** In the ideal turbojet, the design point sets the core flow and pressure ratio, which determine compressor work, turbine work, and net jet power. Moving the intersection (by changing $\tau_\lambda/\tau_r$, corrected speed, or area ratios) shifts the ideal cycle: higher $\pi_c$ raises thermal efficiency but also increases compressor work and may push you above the operating constraint; higher $f(M_2)$ raises mass flow (thrust potential) but can reduce achievable $\pi_c$ on a given speed line.
- **Viability indicator:** The intersection marker is colored by whether it lies below (viable) or above (stalled/not viable) the operating line. This tells you if the chosen design inputs produce a physically consistent ideal turbojet match under the current assumptions.
- **Design correlation:** If you tune the sliders, the map and the intersection move. Use this to explore tradeoffs: locate a point that is both feasible (below the operating line) and aligned with your target $\pi_c$ and flow for the ideal turbojet design.

---
## Engine Controls
---
There are 2 main inputs that controll the engine they are:
* Controlling $T_{t4}$ by throttling /or at constant altitude $\tau_{lambda}$
* The Nozzle throat area $A_8$ 

### Logic Behind Operation:
* <u>Case 1:</u>
$$
\begin{aligned}
& 1^{st}:\ \ \big(\uparrow A_8\left|\,\tau_{\lambda} = constant\right.\big)\\ 
& 2^{nd}:\ \ \text{Use -}\ \ \tau_t = \left(\frac{A_{4}^*}{A_{8}}\right)^\frac{2(\gamma-1)}{\gamma+1}\ \ \text{to determine}\ \ \tau_t\ \ \text{which determines}\ \ \tau_c \ \ \text{from}\ \ \tau_c-1 = \frac{\tau_{\lambda}}{\tau_{r}}(1-\tau_t)\\
& 3^{rd}:\ \ \text{Determine:}\ \ \pi_c\ \ \text{from isentropic relation}\ \ \pi_c = \tau_c^\frac{\gamma}{\gamma-1}\ \& \ f{M_2}\ \ \text{from}\ \ f(M_{2}) = \left(\frac{\pi_{c}}{\sqrt{\tau_{\lambda}/\tau_{r}}}\right)\left(\frac{A_{4}^*}{A_{2}}\right)\\
& 4^{th}:\ \ f(M_{2})\ \ \text{completely specifies the inlet operations by}\ \ f(M_{2})=\left(\frac{1}{\pi_{d}}\right)\left(\frac{A_{0}}{A_{2}}\right)f(M_{0})\\& \ \ \ \ \ \ \ \ \ \ \  \text {since}\ \ \ f(M_0)\ \& \ f(M_2)\ \ \text{are know values and}\ \ A_2\ \& \ ^*\pi_d\ \ \text{are held (*assumed) constant}
\end{aligned}
$$

Note:
* An increase $\uparrow$ in $A_8$ leads to increase in $\uparrow f(M_2)\ \& \ \uparrow \pi_c \because \uparrow U_{blade}$ increase in Compressor speed as seen in the compressor map
* The compressors operating point moves along the $F_1$ matching line at constant $\frac{\tau_{\lambda}}{\tau_r}$

* <u>Case 2:</u>
$$
\begin{aligned}
& 1^{st}:\ \ \big(\uparrow \tau_{\lambda}\left|\, A_8 = constant\right.\big)\\
& 2^{nd}:\ \ \text{compressor-turbine work matcing condition}\ \ \tau_t=1-\frac{\tau_r(\tau_c-1)}{(1+f)\tau_\lambda} \rightarrow \tau_t = constant\\
& \ \ \ \ \ \ \ \ \ \ \ \text{which determines}\ \ \tau_c \ \ \text{from}\ \ \tau_c-1 = \frac{\tau_{\lambda}}{\tau_{r}}(1-\tau_t)\\
& 3^{rd}:\ \ \text{determines}\ \ \pi_c\ \ \text{through isentropic relation} \ \ \pi_c = \tau_c^\frac{\gamma}{\gamma-1}\ \& \ f{M_2}\\& \ \ \ \ \ \ \ \ \ \ \ \text{from the operating line}\ \ f(M_2)=\left(\frac{A_4^*}{A_2}\right)\sqrt{1-\left(\frac{A_4^*}{A_8}\right)^\frac{2(\gamma-1)}{\gamma+1}}\;\frac{\pi_c}{\sqrt{\pi_c^\frac{\gamma-1}{\gamma}-1}}\\
& 4^{th}:\ \ f(M_{2})\ \ \text{ is known and completely defines the inlet operations by}\ \ \left(\frac{1}{\pi_{d}}\right)\left(\frac{A_{0}}{A_{2}}\right)\\
& \ \ \ \ \ \ \ \ \ \ \ \text {since}\ \ \ f(M_0)\ \& \ f(M_2)\ \ \text{are know values and}\ \ A_2\ \& \ ^*\pi_d\ \ \text{are held (*assumed) constant}
\end{aligned}
$$

Note:
* An increase $\uparrow$ in $tau_{lambda}$ leads to increase in $\uparrow f(M_2)\ \& \ \uparrow \pi_c \because \uparrow U_{blade}$ increase in Compressor speed as seen in the compressor map
* The compressors operating point moves along the $F_1$ matching line at constant $\frac{\tau_{\lambda}}{\tau_r}$

### Take Away:
To understand engine operation:
* Begin at the nozzle and work upstream (backward through the engine)
* Inlet flow is determined by the engine operating point via $f(M_2)$
* Engine sets back pressure for the inlet
* Each component's operating point is constrained by mass-flow continuity and energy balance
* Changing nozzle area $A_8$ or combustor temperature $\tau_\lambda$ shifts the entire operating envelope

      

---
## Inlet Operation
---

![Figure 4.15](/analysis/figure_4_15.png)

![Figure 4.16](/analysis/figure_4_16.png)

- **Core idea:** The inlet mass flow is set by the engine operating point through $f(M_2)$; the inlet’s job is to deliver that flow with minimal stagnation-pressure loss. This is the engine “pumping characteristic.”
- **Subsonic inlet behavior:** Increasing nozzle throat area $A_8$ raises $f(M_2)$ and the inlet capture area $A_0$ grows until the inlet throat chokes. Beyond choking, mass flow cannot increase; a shock forms downstream, $\pi_d$ drops, and thrust/efficiency degrade.
- **Supersonic inlet behavior:** The inlet normally includes shocks. As $A_8$ opens, the inlet transitions from subcritical to critical to started flow; once started, the inlet shock system and losses move to satisfy the engine’s demanded $f(M_2)$, again tying inlet operation to the engine operating point.

- Inlet/compressor-face mass balance:
$$
\frac{P_{t2}A_2}{\sqrt{T_{t2}}}f(M_2)=\frac{P_{t1.5}A_{1.5}}{\sqrt{T_{t1.5}}}f(M_{1.5})\tag{4.104}
$$
- Adiabatic, isentropic flow from $1.5$ to $2$:
$$
A_2 f(M_2)=A_{1.5} f(M_{1.5})\tag{4.105}
$$
- Inlet choking condition ($f(M_{1.5})=1$):
$$
f(M_2)_{\text{inlet choking}}=\frac{A_{1.5}}{A_2}\tag{4.106}
$$

---
## Inlet Pressure Recovery $\pi_d$
---

### Meaning and matching role
| Item | Relation | Effect on matching |
|---|---|---|
| Definition | $\pi_d\equiv\dfrac{P_{t2}}{P_{t0}}$ | Sets the inlet total-pressure recovery |
| Ideal limit | $\pi_d=1$ | Lowest demanded $f(M_2)$ for given $A_0/A_2$ and $M_0$ |
| Loss link | $\pi_d=\exp\left(-\dfrac{\Delta s}{R}\right)$ | Any shock/separation lowers $\pi_d$ |
| Matching link | $f(M_2)=\left(\dfrac{1}{\pi_d}\right)\left(\dfrac{A_0}{A_2}\right)f(M_0)$ | Lower $\pi_d$ forces higher $f(M_2)$ (moves toward choke) |

### Varying effects
| Driver | Immediate effect | Engine consequence |
|---|---|---|
| $A_8\uparrow$ (nozzle opens) | Engine demands $f(M_2)\uparrow$ | Inlet must supply more corrected flow; $\pi_d$ can drop if near critical |
| $\tau_\lambda\uparrow$ at fixed $A_8$ | Compressor work rises, matching point moves on $F_1$ | If inlet is marginal, small changes can trigger a $\pi_d$ drop |
| Freestream $M_0\uparrow$ (supersonic) | Stronger shocks needed | $\pi_d$ decreases; feasible $\pi_c$ at a given speed line drops |
| Diffuser/BL separation | Irreversibility increases | $\pi_d$ falls, $f(M_2)$ rises, choke margin shrinks |

### $\pi_d$ relations
| Relation | Use |
|---|---|
| $f(M_2)=\left(\dfrac{1}{\pi_d}\right)\left(\dfrac{A_0}{A_2}\right)f(M_0)$ | Core matching: inlet recovery sets the compressor-face flow |
| $\pi_d=\pi_{\text{shock}}\,\pi_{\text{diff}}$ | Separates shock losses from diffuser losses |
| $\displaystyle \frac{P_{t2}}{P_{t1}}=\left(\frac{(\gamma+1)M_1^2}{(\gamma-1)M_1^2+2}\right)^{\frac{\gamma}{\gamma-1}}\left(\frac{\gamma+1}{2\gamma M_1^2-(\gamma-1)}\right)^{\frac{1}{\gamma-1}}$ | Baseline for pitot/normal-shock inlets |
| $\pi_{\text{shock}}=\prod_i\left(\frac{P_{t2}}{P_{t1}}\right)_i$ | Multiple weak shocks preserve $\pi_d$ better than one strong shock |

### Turbojet configurations
| Configuration | $\pi_d$ trend with $M_0$ | Matching and operability impact |
|---|---|---|
| **No aerospike (pitot/normal-shock)** | Drops steeply as $M_0$ increases | Higher $f(M_2)$ demand, reduced feasible $\pi_c$ at a given corrected speed, higher risk of inlet unstart |
| **Axisymmetric aerospike (external compression)** | Higher $\pi_d$ at the same $M_0$ due to staged oblique shocks | Lower $f(M_2)$ demand, more choke margin, higher feasible $\pi_c$, better stability during throttle or $A_8$ changes |

### Takeaway
| Case | Summary |
|---|---|
| No aerospike | $\pi_d$ collapses quickly at supersonic $M_0$, shifting the operating point toward higher $f(M_2)$ and lower feasible $\pi_c$. |
| Aerospike inlet | Staged compression preserves $\pi_d$, keeping $f(M_2)$ lower and enabling higher $\pi_c$ at the same freestream condition. |

---
# The non-ideal turbojet cycle
---

Non-ideal behavior is introduced by component losses that reduce total pressure and shift the matching point. The main effects are inlet shocks, nozzle under-expansion, burner pressure loss, and shaft mechanical losses.

- **Nozzle expansion loss:** If $P_e < P_0$, the jet is under-expanded and thrust is below the ideal maximum. This penalty is largest at high $M_0$ and becomes much smaller in subsonic flight.
- **Nozzle total-pressure loss:** Usually dominated by viscous skin friction; shock loss appears at off-design conditions. Separation is most likely only in severe over-expansion.
- **Burner total-pressure loss:** Heat addition and friction cause $\pi_b < 1$. A common rule-of-thumb form is
$$
\pi_b = 1 - C\,\frac{\gamma M_3^2}{2},\qquad C\in[1,2]. \tag{4.107}
$$
- **Combustor efficiency (energy balance):**
$$
\eta_b = \frac{(1+f)h_{t4}-h_{t3}}{f h_f}. \tag{4.108}
$$
- **Shaft mechanical efficiency:**
$$
\eta_m = \frac{h_{t3}-h_{t2}}{(1+f)(h_{t4}-h_{t5})}. \tag{4.109}
$$
These losses lower available turbine work and reduce attainable compressor pressure ratio at a given shaft speed.

## Polytropic efficiency of compression

The overall compressor efficiency compares real to isentropic work for the same pressure ratio:
$$
\eta_c = \frac{h_{t3s}-h_{t2}}{h_{t3}-h_{t2}}. \tag{4.110}
$$
For a calorically perfect gas:
$$
\eta_c = \frac{T_{t3s}-T_{t2}}{T_{t3}-T_{t2}}. \tag{4.112a}
$$
To compare compressors with different pressure ratios, define **polytropic efficiency** as the efficiency of an infinitesimal compression:
$$
\eta_{pc} = \left(\frac{dT_{ts}}{dT_t}\right)_{\text{compression}}. \tag{4.113}
$$
Using the Gibbs relation for an isentropic ideal gas:
$$
\frac{dT_{ts}}{T_t}=\left(\frac{\gamma-1}{\gamma}\right)\frac{dP_t}{P_t}. \tag{4.114}
$$
Then the real-process differential becomes
$$
\frac{dT_t}{T_t}=\left(\frac{\gamma-1}{\gamma\,\eta_{pc}}\right)\frac{dP_t}{P_t}. \tag{4.115}
$$
Assuming constant $\eta_{pc}$ from station 2 to 3 and integrating gives
$$
\frac{P_{t3}}{P_{t2}}=\left(\frac{T_{t3}}{T_{t2}}\right)^{\gamma\eta_{pc}/(\gamma-1)}. \tag{4.116}
$$
From this, the overall compressor efficiency is
$$
\eta_c = \frac{\left(\frac{P_{t3}}{P_{t2}}\right)^{(\gamma-1)/\gamma}-1}{\left(\frac{P_{t3}}{P_{t2}}\right)^{(\gamma-1)/(\gamma\eta_{pc})}-1}. \tag{4.117}
$$
For pressure ratios close to one, $\eta_c \approx \eta_{pc}$.

## Polytropic efficiency of expansion
Define the turbine isentropic efficiency for a fixed pressure ratio:
$$
\eta_e = \frac{h_{t5}-h_{t4}}{h_{t5s}-h_{t4}}. \tag{4.111}
$$
For a calorically perfect gas:
$$
\eta_e = \frac{T_{t5}-T_{t4}}{T_{t5s}-T_{t4}}. \tag{4.112b}
$$
Define the **polytropic efficiency of expansion** as the infinitesimal-process efficiency:
$$
\eta_{pe}=\left(\frac{dT_t}{dT_{ts}}\right)_{\text{expansion}}. \tag{4.118}
$$
Using the Gibbs relation for an isentropic ideal gas:
$$
\frac{dT_{ts}}{T_t}=\left(\frac{\gamma-1}{\gamma}\right)\frac{dP_t}{P_t}. \tag{4.119}
$$
Using the Gibbs relation and $\eta_{pe}$, the real-process differential becomes
$$
\frac{dT_t}{T_t}=\left(\frac{(\gamma-1)\eta_{pe}}{\gamma}\right)\frac{dP_t}{P_t}. \tag{4.120}
$$
Assuming constant $\eta_{pe}$ from station 4 to 5,
$$
\frac{P_{t5}}{P_{t4}}=\left(\frac{T_{t5}}{T_{t4}}\right)^{\gamma/((\gamma-1)\eta_{pe})}. \tag{4.121}
$$
The overall turbine efficiency becomes
$$
\eta_e = \frac{\left(\frac{P_{t5}}{P_{t4}}\right)^{(\gamma-1)\eta_{pe}/\gamma}-1}{\left(\frac{P_{t5}}{P_{t4}}\right)^{(\gamma-1)/\gamma}-1}. \tag{4.122}
$$
Typically $\eta_{pe}$ is slightly higher than $\eta_{pc}$, so turbines tend to be more efficient than compressors.

## The effect of afterburning
An afterburner adds heat downstream of the turbine at relatively low Mach number. In the idealized model it introduces little total-pressure loss:
$$
\pi_a = \frac{P_{t6}}{P_{t5}} \approx 1. \tag{4.123}
$$
For fixed nozzle area ratio (thus fixed $M_e$), the pressure-thrust term is unchanged and exit velocity scales with exhaust temperature:
$$
\frac{U_e}{U_0}=\frac{M_e}{M_0}\sqrt{\frac{T_e}{T_0}}. \tag{4.124}
$$
Define the afterburner temperature ratio $\tau_a \equiv T_{t6}/T_{t5}$. Then the exit stagnation temperature is
$$
T_{te}=T_{t5}\,\tau_a. \tag{4.125}
$$
Thus $U_e$ increases roughly with $\sqrt{\tau_a}$, giving a rapid thrust increase at the cost of much higher fuel burn.

## Nozzle operation
- **Commercial engines:** typically use fixed, convergent nozzles. Under-expansion losses are modest at low $M_0$, so the weight and complexity savings dominate.
- **Military engines:** commonly use variable-area (and sometimes vectored) nozzles. This is essential when afterburning is used.

When the afterburner is turned on, the nozzle throat area must increase to preserve mass flow and avoid overloading the turbine. With a choked nozzle, the turbine temperature ratio becomes
$$
\tau_t=\left(\frac{A_4^*}{A_8\,\tau_a}\right)^{\frac{2(\gamma-1)}{\gamma+1}}. \tag{4.126}
$$
If $A_8$ is not increased as $\tau_a$ rises, the mass flow can drop, thrust may not increase as intended, and compressor stability margin can be compromised.
