# Turbojet Parametric Cycle Simulation and Compressible Flow + Fuel Analysis Tool

This project is a full-stage turbojet parametric cycle simulation and compressible flow analysis tool with a standalone fuel-air combustion analysis module. It uses a Python FastAPI backend and a React + Vite frontend. The turbojet solver follows Cantwell-style non-dimensional cycle analysis and Brayton cycle methodology for preliminary propulsion design and trade studies.

The project keeps the math, solver, and plots synchronized so every input change can be traced to a specific equation and output.

## Capabilities

### Turbojet analysis (MK1 solver)

- Station-by-station turbojet solution with inlet, compressor, combustor, turbine, and nozzle
- Non-dimensional thrust T/(P0 A0) and specific impulse (Isp g)/a0
- Exit Mach number Me and velocity ratio Ue/U0
- tau_c and tau_r sweeps for ideal analysis trends
- Operating line and compressor strip-model map visualization
- Station property tables and choking warnings
- Thermodynamic schematic and diagnostic plots

### Fuel-air combustion analysis (standalone)

- Ideal products and dissociation products (Cantera)
- Equivalence ratio (phi), AFR, heating value, and regime detection
- Species composition tables with element, mass, and mole balance checks
- Adiabatic flame temperature sweeps and species Xi(phi) maps
- Mechanism selection with surrogate flags when a fuel is not present

Note: The fuel analysis module is not yet coupled to the turbojet solver. It is intended as the thermochemical backbone for a future coupled combustor model.

## UI overview

Main tabs:

- Turbojet Analysis
- Fuel Analysis

Turbojet Analysis sub-tabs:

- Purpose (assumptions and scope)
- Analysis (embedded derivations + plots)
- Simulations
	- Inputs + Tables
	- Performance + Diagnostics
	- Compressor Strip Model

Fuel Analysis:

- Inputs for fuel, air model, phase, heating value basis, temperature, and pressure
- Ideal vs dissociation modes
- Reactants and products tables
- Species map Xi plots and computed derivations

## Analysis documentation (embedded in the UI)

- Ideal turbojet derivations: frontend/src/analysis/idealTurbojetAnalysis.md
- MK1 full stage calculation: frontend/src/analysis/turbojetFullStageCalculationMk1.md
- Inputs + tables limitations: frontend/src/analysis/inputsTablesNotes.md
- Performance diagnostics notes: frontend/src/analysis/perfDiagnosticsNotes.md
- Strip model limitations: frontend/src/analysis/stripModelNotes.md
- Fuel analysis purpose: frontend/src/analysis/fuelPurposeNotes.md
- Fuel derivation (symbolic): frontend/src/analysis/fuelAnalysisDerivation.md
- Fuel derivation (computed): frontend/src/analysis/fuelAnalysisDerivationComputed.md
- Fuel mechanism map: frontend/src/analysis/fuelAnalysisMechanisms.md

## Backend API surface

Core solver:

- POST /api/mk1/solve

Plots from MK1:

- POST /api/plots/mark4/diagnostics
- POST /api/plots/mark4/operating-line
- POST /api/plots/mark4/tbar-vs-me
- POST /api/plots/ideal/tau-sweeps
- POST /api/plots/strip-model/map

Ideal analysis plots:

- POST /api/analysis/ideal/tau-sweeps
- POST /api/analysis/ideal/velocity-ratio
- POST /api/analysis/ideal/tbar-vs-me
- POST /api/analysis/ideal/operating-line
- POST /api/analysis/ideal/strip-model
- POST /api/analysis/ideal/strip-model-equations

Fuel analysis:

- GET /api/fuel/list
- POST /api/fuel/analysis
- POST /api/fuel/analysis/xi-map

## Fuel data pipeline

Fuel metadata is loaded from prototype/fuel_data.json. If it is missing, the fuel API endpoints will return an error.

Generator script:

- prototype/build_fuel_data.py

Note: The build script references a local CSV path. Update the path inside prototype/build_fuel_data.py before running it on your machine.

## Optional prototype CLI

The prototype folder contains a standalone CLI for fuel analysis and plots:

- prototype/README.md

Dissociation mode requires Cantera.

## Project architecture

- Backend: Python, FastAPI, NumPy, Pandas, Cantera
- Frontend: React, Vite, Plotly, KaTeX, React Markdown
- Documentation: LaTeX-driven markdown notebooks rendered in the UI

## Requirements

- Python 3.12 (recommended for the pinned backend dependencies)
- Node.js 20+

## Local development

### Backend (FastAPI)

From the repo root:

```bash
python -m venv .venv
# Windows
.\.venv\Scripts\activate
# macOS/Linux
# source .venv/bin/activate

pip install -r backend/requirements.txt

cd backend
python -m uvicorn app:app --reload
```

Note: running `python backend/app.py` will not start the server.

The API should be available at http://127.0.0.1:8000/ (health check at /health).

### Frontend (Vite)

From the repo root:

```bash
cd frontend
npm install
npm run dev
```

The dev server runs at http://localhost:5173/.

## GitHub Pages deployment (frontend)

This repo includes a GitHub Actions workflow that builds the frontend and deploys it to GitHub Pages.

- The Vite base path is set for the repo name Turbojet-Project in frontend/vite.config.js.
- If you rename the GitHub repo, update that base path to match.
- In GitHub, set Settings -> Pages -> Build and deployment to GitHub Actions.

## Backend deployment

The backend is not deployed to GitHub Pages. Host it separately (Render/Fly.io/VPS) and update the frontend API base URL accordingly.

## Live web version

- Frontend (GitHub Pages): https://j-shahim.github.io/Turbojet-Project/

## Attribution (analysis equations)

The ideal turbojet analysis notebook adapts equations from the AA283 course reader by Brian J. Cantwell under CC BY-NC 4.0. See the attribution block in frontend/src/analysis/idealTurbojetAnalysis.md.

## Roadmap highlights

- Component efficiencies, pressure losses, and polytropic models
- Shock and inlet modeling (oblique and normal shocks, start/unstart logic)
- Combustor energy balance using fuel analysis outputs
- Coupled fuel dissociation for turbine and nozzle properties
- Off-design maps and full matching solver

## Reader note

This project is a living build: features, math, and documentation evolve as the research matures. It is not a production-grade or flagship simulation tool, and the results shown here are for exploration and learning rather than authoritative truth. Please validate any conclusions independently before using them in real engineering decisions.

The goal is to provide an interactive, approachable way to explore layered symbolic math, computation, and research ideas in context.

## Author

Jarel Shahim
Mechanical Engineer - Propulsion Focus

Engineering portfolio: https://j-shahim.github.io/portfolio-webpage/
