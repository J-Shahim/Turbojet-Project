# Fuel-Mechanism References

This panel summarizes how the solver selects chemical mechanisms and what each data file contributes.

## Mechanism selection

- The solver looks for an exact fuel formula match in the available Cantera mechanisms.
- If no exact match exists, it selects a surrogate with similar element set, carbon count, and H/C ratio.
- Surrogate use is flagged in the UI because dissociation species and heating value estimates become approximate.

## Mechanism files in use

- `gri30.yaml`: Base gas-phase mechanism used for light fuels and general equilibrium.
- `gri30_highT.yaml`: High-temperature variant of GRI used as a fallback for light species.
- `example_data/n-hexane-NUIG-2015.yaml`: NUIG mechanism that covers mid-range hydrocarbons and aromatics.
- `nDodecane_Reitz.yaml`: Mechanism focused on heavy n-alkanes; provides surrogate options for C8-C12 fuels.

## Thermo and phase data

- `graphite.yaml`: Enables solid carbon (soot) thermodynamic properties.
- `liquidvapor.yaml`: Liquid/gas phase enthalpy data for select species.
- `water.yaml`: Reference enthalpy for liquid water (used for HHV when available).

## Notes

- If a mechanism does not contain a species, its enthalpy cannot be computed from that file.
- `HV_eq` requires enthalpies for all equilibrium products; if any are missing, the UI shows a reason.
- **Reaction count** is the number of elementary reactions listed in the mechanism file (e.g., GRI-3.0). It is not the overall combustion reaction; it is the total set of steps Cantera can use when kinetics is enabled.

## Category descriptions

- **RP-1 / Jet-A surrogate**: Long-chain n-alkane used as a stand-in for kerosene-grade aviation fuels.
- **Kerosene's — Paraffins**: C8-C12 n-alkanes commonly used as kerosene-range surrogates.
- **Kerosene's — Olefins**: C8-C12 1-alkenes representing unsaturated kerosene-range components.
- **General transportation — Paraffins**: C4-C7 n-alkanes used for gasoline-like surrogate modeling.
- **General transportation — Olefins**: C4-C7 1-alkenes used for gasoline-like surrogate modeling.
- **Aromatics**: Benzene-class aromatics used to represent ringed hydrocarbons.
- **Light gases**: C1-C3 light hydrocarbons used for gaseous fuel cases.

## Fuel-to-mechanism map

| Fuel ID | General name | Scientific name | Category | Formula | Mechanism | Species | Surrogate |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C10H20 | Decene | 1-Decene | Kerosene's — Olefins | C10H20 | nDodecane_Reitz.yaml | c10h21 | yes |
| C10H22 | Decane | n-Decane | Kerosene's — Paraffins | C10H22 | nDodecane_Reitz.yaml | c10h21 | yes |
| C11H22 | Undecene | 1-Undecene | Kerosene's — Olefins | C11H22 | nDodecane_Reitz.yaml | c12h25 | yes |
| C11H24 | Undecane | n-Undecane | Kerosene's — Paraffins | C11H24 | nDodecane_Reitz.yaml | c12h26 | yes |
| C12H24 | Dodecene | 1-Dodecene | Kerosene's — Olefins | C12H24 | nDodecane_Reitz.yaml | c12h25 | yes |
| C12H26 | Dodecane | n-Dodecane | RP-1 / Jet-A surrogate | C12H26 | nDodecane_Reitz.yaml | c12h26 | no |
| C2H2 | Acetylene | Acetylene | Light gases | C2H2 | gri30.yaml | C2H2 | no |
| C2H4 | Ethene | Ethene | Light gases | C2H4 | gri30.yaml | C2H4 | no |
| C2H6 | Ethane | Ethane | Light gases | C2H6 | gri30.yaml | C2H6 | no |
| C3H6 | Propene | Propene | Light gases | C3H6 | example_data/n-hexane-NUIG-2015.yaml | C3H6 | no |
| C3H8 | Propane | Propane | Light gases | C3H8 | gri30.yaml | C3H8 | no |
| C4H10 | Butane | n-Butane | General transportation — Paraffins | C4H10 | example_data/n-hexane-NUIG-2015.yaml | C4H10 | no |
| C4H8 | Butene | 1-Butene | General transportation — Olefins | C4H8 | example_data/n-hexane-NUIG-2015.yaml | IC4H8 | no |
| C5H10 | Pentene | 1-Pentene | General transportation — Olefins | C5H10 | example_data/n-hexane-NUIG-2015.yaml | C5H10-1 | no |
| C5H12 | Pentane | n-Pentane | General transportation — Paraffins | C5H12 | example_data/n-hexane-NUIG-2015.yaml | NC5H12 | no |
| C6H12 | Hexene | 1-Hexene | General transportation — Olefins | C6H12 | example_data/n-hexane-NUIG-2015.yaml | C6H12-1 | no |
| C6H14 | Hexane | n-Hexane | General transportation — Paraffins | C6H14 | example_data/n-hexane-NUIG-2015.yaml | NC6H14 | no |
| C6H6 | Benzene | Benzene | Aromatics | C6H6 | example_data/n-hexane-NUIG-2015.yaml | C6H6 | no |
| C7H14 | Heptene | 1-Heptene | General transportation — Olefins | C7H14 | example_data/n-hexane-NUIG-2015.yaml | C7H14-1 | no |
| C7H16 | Heptane | n-Heptane | General transportation — Paraffins | C7H16 | example_data/n-hexane-NUIG-2015.yaml | NC7H16 | no |
| C8H16 | Octene | 1-Octene | Kerosene's — Olefins | C8H16 | example_data/n-hexane-NUIG-2015.yaml | C7H14-1 | yes |
| C8H18 | Octane | n-Octane | Kerosene's — Paraffins | C8H18 | example_data/n-hexane-NUIG-2015.yaml | NC7H16 | yes |
| C9H18 | Nonene | 1-Nonene | Kerosene's — Olefins | C9H18 | nDodecane_Reitz.yaml | c10h21 | yes |
| C9H20 | Nonane | n-Nonane | Kerosene's — Paraffins | C9H20 | nDodecane_Reitz.yaml | c10h21 | yes |
| CH4 | Methane | Methane | Light gases | CH4 | gri30.yaml | CH4 | no |
