# Fuel Analysis Prototype

Standalone prototype for fuel-air combustion analysis. Computes ideal products by stoichiometric balance and optional dissociation with Cantera. Includes LaTeX derivation output and pollutant plots vs equivalence ratio.

## Quick start
1. Install dependencies (optional for dissociation and plots):
   - `pip install -r requirements.txt`
2. Run a single case:
   - `python run_analysis.py --fuel-id CH4 --f-over-a 0.02 --mode ideal --latex-out derivation.tex`
3. Run a phi sweep with plots:
   - `python run_analysis.py --fuel-id CH4 --phi-range 0.6,1.4,41 --mode dissociation --plot-out pollutants.png`

## Data
- `fuel_data.json` is generated from the combustion notes Appendix B table.

## Notes
- Dissociation requires Cantera and a fuel species supported in `gri30.yaml`.
- Pollutant plots show proxy trends; NOx is only available in dissociation mode.
