# Turbojet Parametric Cycle Simulation and Compressible Flow Analysis Tool

This project is a full-stage turbojet parametric cycle simulation and compressible flow analysis tool developed using a Python (FastAPI) backend and a React/Vite frontend. The solver is based on Cantwell's turbojet analysis and Brayton cycle methodology and is intended for preliminary propulsion design and engine performance trade studies.

The model couples the full engine system, including the inlet, compressor, combustor, turbine, and nozzle, and computes thermodynamic and flow properties across standard engine stations using compressible flow relations and choked nozzle flow.

The tool performs non-dimensional turbojet cycle analysis, allowing engine performance comparisons and trade studies independent of engine size.

The governing equations and thermodynamic relations used in this model are documented and written using LaTeX.

## Model capabilities

The solver computes and analyzes:

- Dimensionless thrust T/(P0 A0)
- Dimensionless specific impulse (Isp g)/a0
- Exit Mach number Me
- Exit-to-freestream velocity ratio Ue/U0
- Compressor temperature ratio tau_c
- Ram temperature ratio tau_r
- Engine station properties (Mach number, total pressure, total temperature, velocity)
- Choked nozzle flow and nozzle expansion behavior
- Parametric cycle sweeps for compressor ratio and flight conditions
- Compressor operating line
- Simplified compressor map (strip model with speed lines and matching lines)
- Thermodynamic cycle visualization (T-s and h-s diagrams)

This non-dimensional formulation is commonly used in preliminary propulsion analysis and conceptual engine design.

## Compressible flow and cycle analysis

The model uses standard gas dynamics and Brayton cycle relations, including:

- Isentropic flow relations
- Total-to-static property relations
- Area-Mach number relations
- Choked flow relations
- Brayton cycle temperature and pressure relations
- Engine station analysis (stations 0-9)

Future development will incorporate Rayleigh flow (combustion), normal and oblique shock relations, and non-ideal component losses.

## Engine stations modeled

Station | Description
--- | ---
0 | Freestream
2 | Compressor inlet
3 | Compressor exit
4 | Combustor exit
5 | Turbine exit
e | Nozzle exit

The solver tracks Mach number, total pressure, total temperature, and velocity across these stations.

## Example outputs

The solver generates parametric plots and engine diagnostics including:

- Dimensionless thrust vs compressor temperature ratio
- Specific impulse vs compressor temperature ratio
- Thrust vs flight temperature ratio
- Exit Mach number vs compressor ratio
- Exit velocity ratio vs compressor ratio
- Thrust vs exit Mach number
- Compressor operating line
- Compressor map (strip model)
- Mach number vs engine station
- Total pressure ratio vs engine station
- Total temperature ratio vs engine station
- Velocity vs engine station
- T-s diagram
- h-s diagram

(Add images of these plots in a /docs/images folder and link them here.)

## Planned future development

- Non-ideal component efficiencies and pressure losses
- Normal and oblique shock modeling (inlet and nozzle)
- Supersonic and subsonic inlet capture area logic
- Pipelined combustion analysis and fuel-air ratio modeling
- Fuel optimization strategies
- Converging-diverging nozzle and off-design performance
- Exit plume expansion and shock diamond simulation
- Emissions-conscious combustion and plume analysis

## Project architecture

- Backend: Python, FastAPI
- Frontend: React + Vite
- Deployment:
	- Frontend hosted on GitHub Pages
	- Backend hosted on Render
- Documentation: LaTeX (equations and thermodynamic relations)

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

- The Vite `base` path is set for the repo name `Turbojet-Project` in `frontend/vite.config.js`.
- If you rename the GitHub repo, update that base path to match.
- In GitHub, set **Settings -> Pages -> Build and deployment** to **GitHub Actions**.

## Backend deployment

The backend is not deployed to GitHub Pages. Host it separately (Render/Fly.io/VPS) and update the frontend API base URL accordingly.

## Live web version

- Frontend (GitHub Pages): https://j-shahim.github.io/Turbojet-Project/

## Author

Jarel Shahim
Mechanical Engineer - Propulsion Focus
Engineering portfolio: https://j-shahim.github.io/portfolio-webpage/

## Summary

This project combines thermodynamics, compressible flow, and propulsion cycle analysis with modern web deployment to create an interactive turbojet performance and analysis tool. The long-term goal is to expand the solver to include non-ideal effects, combustion modeling, shock modeling, and exhaust plume analysis to move toward a more complete propulsion system simulation.
