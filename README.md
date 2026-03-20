# Turbojet Web Tool

Turbojet performance and analysis app with a FastAPI backend and a React/Vite frontend.

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

- The Vite `base` path is set for the repo name `turbojet-web-tool` in `frontend/vite.config.js`.
- If you rename the GitHub repo, update that base path to match.
- In GitHub, set **Settings -> Pages -> Build and deployment** to **GitHub Actions**.

## Backend deployment

The backend is not deployed to GitHub Pages. Host it separately (Render/Fly.io/VPS) and update the frontend API base URL accordingly.
