---
# Turbojet Full Stage Calculation (MK1)
---

This page mirrors the MK1 full-stage notebook and presents the station-by-station calculation flow in website-friendly markdown. The solve order is: nozzle conditions -> matching -> core totals -> inlet areas.

Key relations used throughout:
$$
\tau(M)=1+\frac{\gamma-1}{2}M^2,\quad \pi(\tau)=\tau^{\gamma/(\gamma-1)}
$$
$$
f(M)=\frac{A^*}{A}=\left(\frac{\gamma+1}{2}\right)^{\frac{\gamma+1}{2(\gamma-1)}}\frac{M}{\left(1+\frac{\gamma-1}{2}M^2\right)^{\frac{\gamma+1}{2(\gamma-1)}}}
$$
$$
\dot m=\frac{P_t A}{\sqrt{T_t}}\sqrt{\frac{\gamma}{R}}\,f(M)
$$

---
## 1) Define Inputs and Constants for Area/Station Solves
Inputs grouped by category (baseline ideal case):

Flight condition:
$$
M_0,\;T_0,\;P_0
$$
Gas properties:
$$
\gamma,\;R,\;c_p
$$
Pressure ratios (given):
$$
\pi_d=\frac{P_{t2}}{P_{t0}},\;\pi_b=\frac{P_{t4}}{P_{t3}},\;\pi_n=\frac{P_{t8}}{P_{t5}}
$$
Heat input:
$$
T_{t4}\;\text{(given)},\quad \text{LHV}
$$
Geometry areas:
$$
A_1,\;A_{1.5},\;A_2,\;A_3,\;A_5,\;A_8,\;A_e
$$
Reference throat:
$$
A_4=A^*\ \text{(turbine throat, typically choked)}
$$
Optional inputs:
$$
M_5\ \text{(if prescribed)}
$$
Nozzle mode: fully expanded or mass-flow solved.

---
## 2) Implement Thermo/Flow Helpers and Compute $\tau_r$, $\tau_\lambda$
Use isentropic relations and the mass-flow function $f(M)=A^*/A$. Set station-4 reference state with $M_4=1$ so $A_4=A^*$.
$$
\tau(M)=1+\frac{\gamma-1}{2}M^2,\quad \pi(\tau)=\tau^{\gamma/(\gamma-1)}
$$
$$
\frac{T_0}{T_{t0}}=\frac{1}{\tau_r},\quad \frac{P_0}{P_{t0}}=\frac{1}{\pi_r}
$$
$$
\tau_r=\tau(M_0),\quad T_{t0}=T_0\tau_r,\quad \pi_r=\pi(\tau_r),\quad P_{t0}=P_0\pi_r
$$
$$
\tau_\lambda=\frac{T_{t4}}{T_0}
$$
$$
M_4=1\Rightarrow \tau(M_4)=1+\frac{\gamma-1}{2},\quad T_4=\frac{T_{t4}}{\tau(M_4)}
$$
$$
\frac{T}{T_t}=\frac{1}{\tau(M)},\quad \frac{P}{P_t}=\frac{1}{\pi(\tau(M))}
$$
$$
\frac{A}{A^*}=\frac{1}{f(M)}
$$

---
## 3) Turbine Temperature Ratio From Nozzle Matching
With $A_4^*$ set as the reference area (normalized to 1) and $A_8$ given, the ideal matching relation gives the turbine temperature ratio. Then $T_{t5}$ and $\pi_t$ follow directly.
$$
\tau_t=\frac{T_{t5}}{T_{t4}}=\left(\frac{A_4^*}{A_8}\right)^{\frac{2(\gamma-1)}{\gamma+1}}
$$
$$
T_{t5}=T_0\,\tau_r\,\tau_d\,\tau_c\,\tau_b\,\tau_t
$$
$$
\pi_t=\frac{P_{t5}}{P_{t4}}=\tau_t^{\gamma/(\gamma-1)}
$$

---
## 4) Compressor Temperature and Pressure Ratios From Shaft Balance
With fuel ratio $f$ retained, the turbine-compressor shaft balance gives $\tau_c$. In the baseline ideal case, $f\approx 0$.
$$
\tau_c-1=\frac{(1+f)\,\tau_\lambda}{\tau_r}(1-\tau_t)
$$
$$
\pi_c=\tau_c^{\gamma/(\gamma-1)}
$$
$$
\frac{T_{t3}}{T_{t2}}=\tau_c,\quad \frac{P_{t3}}{P_{t2}}=\pi_c
$$

---
## 5) Inlet/Compressor Matching: Solve $f(M_2)$
Engine matching gives the compressor-face reduced flow. Keep the fuel ratio $f$ in the relation but set $f=0$ for the ideal baseline.
$$
f(M_2)=\left(\frac{\pi_c\,\pi_b}{\sqrt{\tau_\lambda/\tau_r}}\right)\left(\frac{A_4^*}{A_2}\right)\frac{1}{1+f}
$$

---
## 6) Free-Stream/Inlet Matching for $A_0$ and $\pi_d$
Use the inlet matching relation to solve for $A_0$ (from a given $\pi_d$), then compute the implied $\pi_d$ as a consistency check.
$$
f(M_2)=\left(\frac{1}{\pi_d}\right)\left(\frac{A_0}{A_2}\right)f(M_0)
$$
$$
A_0=A_2\,f(M_2)\,\pi_d\,/\,f(M_0)
$$
If the shock is in the diffuser:
$$
\pi_d =\frac{A_0f(M_0)}{A_2f(M_2)}
$$
Otherwise, set $\pi_d = 1$.

---
## 6.1) Inlet Stations (0, 1, 1.5, 2) With Isentropic Diffuser
With $\pi_d=1$ and no shocks, the diffuser is isentropic and adiabatic, so $P_{t0}=P_{t1}=P_{t1.5}=P_{t2}$ and $T_{t0}=T_{t1}=T_{t1.5}=T_{t2}$.

Freestream sets inlet critical area:
$$
A^*=f(M_0)\,A_0
$$
Solve inlet Mach numbers from geometry:
$$
\frac{A^*}{A_i}=f(M_i)\quad\Rightarrow\quad M_i\;\text{from}\;f(M_i)
$$
Static states from totals:
$$
\frac{T_i}{T_{ti}}=\frac{1}{\tau(M_i)},\quad \frac{P_i}{P_{ti}}=\frac{1}{\pi(\tau(M_i))}
$$
Subsonic inlet choking (mass balance at 1.5):
$$
A_2 f(M_2)=A_{1.5} f(M_{1.5})
$$
$$
\text{inlet chokes when } f(M_{1.5})=1\Rightarrow f(M_2)=\frac{A_{1.5}}{A_2}
$$

---
## 6.2) Inlet Case Selection, Shock Flags, and Choking
Select the inlet case by comparing $A_8/A^*$ and $A_{1.5}/A^*$. This determines whether the inlet is subsonic, choked at 1.5, or contains a normal shock between 1.5 and 2.

Table flags:
$$
\text{shock} = \text{true if shock between 1.5 and 2 or if }P_{t2}<P_{t1}
$$
$$
\text{choked at 1.5 if}\quad f(M_{1.5})=1
$$
Choke check at station 1.5 using the pressure ratio:
$$
\text{choked if}\quad \left(\frac{P_t}{P}\right)_{1.5}\ge\left(\frac{P_t}{P}\right)_{M=1}=\pi\left(\tau(M=1)\right)
$$

Normal-shock total-pressure loss (if shock present):
$$
\frac{P_{t2}}{P_{t1}}=\left(\frac{(\gamma+1)M_1^2}{(\gamma-1)M_1^2+2}\right)^{\frac{\gamma}{\gamma-1}}\left(\frac{\gamma+1}{2\gamma M_1^2-(\gamma-1)}\right)^{\frac{1}{\gamma-1}}
$$
If the inlet is choked and a shock is present, then
$$
M_{1.5,\,\text{down}}=M_2=\sqrt{\frac{1+\frac{\gamma-1}{2}M_{1.5,\,\text{up}}^2}{\gamma M_{1.5,\,\text{up}}^2-\frac{\gamma-1}{2}}}
$$

---
## 6.3) Compressor-Face Choke Fallback (If $f(M_2)>1$)
If matching gives $f(M_2)>1$, the inlet is subsonically choked. Recompute $f(M_2)$ using inlet matching, then re-solve the core to keep geometry consistent.

Step 1: recompute inlet $f(M_2)$ using fixed $A_0$ (or fixed $\pi_d$):
$$
f(M_2)=\frac{A_0}{A_2}\frac{f(M_0)}{\pi_d}
$$
Step 2: solve $\pi_c$ numerically from $f(M_2)$ using the nozzle-matching relation.

Step 3: update $\tau_\lambda$ and $T_{t4}$:
$$
\tau_\lambda=\tau_r\left(\frac{\pi_c\,\pi_b\,A_4^*/A_2}{(1+f)\,f(M_2)}\right)^2
$$
$$
T_{t4}=\tau_\lambda\,T_0\quad\text{(limit to commanded }T_{t4}\text{)}
$$

---
## 7) Total Pressure Cascade to Nozzle Exit
Compute the total-pressure ratio to the nozzle exit and the exit total pressure.
$$
\frac{P_{t,e}}{P_{t0}}=\pi_d\,\pi_c\,\pi_b\,\pi_t\,\pi_n
$$
$$
P_{t,e}=P_{t0}\left(\frac{P_{t,e}}{P_{t0}}\right)
$$

---
## 7.1) Nozzle Throat Choking Check
The nozzle throat is choked if the available total-to-static pressure ratio exceeds the critical value for $M=1$. Compare $P_{t8}/P_0$ to the critical ratio.
$$\left(\frac{P_t}{P}\right)_{M=1}=\pi(\tau(M=1))$$
$$\text{choked if}\quad \frac{P_{t8}}{P_0} \ge \left(\frac{P_t}{P}\right)_{M=1}$$
If choked, set
$$M_8=1,\quad P_8=\frac{P_{t,e}}{\pi(\tau(M=1))}$$

---
## 7.2) Nozzle Exit From Mass-Flow (Non-Fully Expanded)
When the nozzle is not forced to be fully expanded, solve $M_8$ from the core mass flow and nozzle area, then compute $P_8$ and $T_8$ isentropically from $T_{t,e}$ and $P_{t,e}$.
$$
f(M_8)=\frac{\dot m\,\sqrt{T_{t,e}}}{P_{t,e}\,A_8\,\sqrt{\gamma/R}}
$$
$$
M_8\;\text{from}\;f(M_8),\quad \frac{T_8}{T_{t,e}}=\frac{1}{\tau(M_8)},\quad \frac{P_8}{P_{t,e}}=\frac{1}{\pi(\tau(M_8))}
$$

---
## 7.3) Fully Expanded Nozzle Option
If the nozzle is fully expanded, set $P_e=P_0$ and use the isentropic relations (eqs. 4.19--4.27) to solve $M_e$ and $A_e/A_8$. If an exit area $A_e$ is provided, compare it to the implied ratio. The total pressure $P_{t,e}$ remains from the $\pi$-cascade.
$$
P_e=P_0
$$
$$
\frac{P_{t,e}}{P_e}=\pi(\tau_n),\quad \tau_n=\left(\frac{P_{t,e}}{P_e}\right)^{\frac{\gamma-1}{\gamma}}
$$
$$
P_{te}=P_{0}\pi_{r}\pi_{d}\pi_{c}\pi_{b}\pi_{t}\pi_{n}
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
$$
M_e=\sqrt{\frac{2}{\gamma-1}\left(\tau_e-1\right)}
$$
$$
\frac{P_e}{P_{t,e}}=\frac{1}{\pi(\tau_n)}
$$
$$
\frac{A_e}{A_8}=\frac{A}{A^*}=\frac{1}{f(M_e)}
$$
$$
\text{if }A_e\text{ given: compare }\left(\frac{A_e}{A_8}\right)_{\text{given}}\text{ to }\left(\frac{A_e}{A_8}\right)_{\text{implied}}
$$

---
## 7.4) Station 5 From Mass-Flow (If $M_5$ Not Given)
If $M_5$ is not prescribed, solve it from the core mass flow and $A_5$ using the turbine-exit totals.
$$
f(M_5)=\frac{\dot m\,\sqrt{T_{t5}}}{P_{t5}\,A_5\,\sqrt{\gamma/R}}
$$
$$
M_5\;\text{from}\;f(M_5),\quad \frac{T_5}{T_{t5}}=\frac{1}{\tau(M_5)},\quad \frac{P_5}{P_{t5}}=\frac{1}{\pi(\tau(M_5))}
$$

---
## 8) Exit Total Temperature Ratio
With an adiabatic nozzle, the total temperature is unchanged from station 5 to exit.
$$
\frac{T_{t,e}}{T_{t0}}=\frac{T_{t5}}{T_{t0}}=\frac{\tau_\lambda}{\tau_r}\,\tau_t
$$
$$
T_{t,e}=T_{t0}\left(\frac{T_{t,e}}{T_{t0}}\right)
$$
$$
T_e=\frac{T_{t,e}}{\tau(M_e)}
$$

---
## 9) Station Table Formulas
The station table uses these relations (isentropic unless noted).

Core relations:
$$
\tau(M)=1+\frac{\gamma-1}{2}M^2,\quad \pi(\tau)=\tau^{\gamma/(\gamma-1)}
$$
$$
f(M)=\left(\frac{\gamma+1}{2}\right)^{\frac{\gamma+1}{2(\gamma-1)}}\frac{M}{\left(1+\frac{\gamma-1}{2}M^2\right)^{\frac{\gamma+1}{2(\gamma-1)}}}
$$
$$
\frac{A}{A^*}=\frac{1}{f(M)}
$$
$$
\frac{T}{T_t}=\frac{1}{\tau(M)},\quad \frac{P}{P_t}=\frac{1}{\pi(\tau(M))}
$$
$$
\dot m=\frac{P_t A}{\sqrt{T_t}}\sqrt{\frac{\gamma}{R}}\,f(M)
$$

Total-pressure cascade used in the table:
$$
P_{t2}=P_{t0}\pi_d,\quad P_{t3}=P_{t2}\pi_c,\quad P_{t4}=P_{t3}\pi_b,\quad P_{t5}=P_{t4}\pi_t,\quad P_{t,e}=P_{t5}\pi_n
$$
Total-temperature cascade used in the table:
$$
T_{t2}=T_{t0},\quad T_{t3}=T_{t2}\tau_c,\quad T_{t4}=T_0\tau_\lambda,\quad T_{t5}=T_{t4}\tau_t
$$

Critical areas and mass-flow solves:
$$
f(M_3)=\frac{\dot m_3\,\sqrt{T_{t3}}}{P_{t3}\,A_3\,\sqrt{\gamma/R}},\quad A_3^*=A_3 f(M_3)
$$
$$
A_4^*=\frac{\dot m_4\,\sqrt{T_{t4}}}{P_{t4}\,\sqrt{\gamma/R}\,f(M_4)},\quad f(M_4)=f(1)
$$
$$
f(M_5)=\frac{\dot m\,\sqrt{T_{t5}}}{P_{t5}\,A_5\,\sqrt{\gamma/R}},\quad A_5^*=A_5 f(M_5)
$$
$$
f(M_8)=\frac{\dot m\,\sqrt{T_{t,e}}}{P_{t,e}\,A_8\,\sqrt{\gamma/R}},\quad A_8^*=A_8 f(M_8)
$$
$$
f(M_e)=\frac{\dot m\,\sqrt{T_{t,e}}}{P_{t,e}\,A_e\,\sqrt{\gamma/R}},\quad A_e^*=A_e f(M_e)
$$
