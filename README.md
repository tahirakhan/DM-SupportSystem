# ADO Feature Dashboard

Angular + Node.js dashboard that visualises Azure DevOps Feature work items and their child User Story progress.

## Quick Start (Docker)

```bash
# 1. Copy the config template and fill in your PAT + organisation
cp backend/config/ado.config.json.example backend/config/ado.config.json
# Edit backend/config/ado.config.json

# 2. Build and run
docker-compose up --build

# 3. Open http://localhost
```

## Local Prerequisites

MongoDB 6+ is required. Start a local instance:
```bash
# Docker (recommended)
docker run -d -p 27017:27017 --name dm-mongo mongo:7

# Or install locally: https://docs.mongodb.com/manual/installation/
```

## Local Development

### Backend
```bash
cd backend
npm install
# ensure backend/config/ado.config.json is filled in
npm run dev        # http://localhost:3000
```

### Frontend
```bash
cd frontend
npm install
ng serve           # http://localhost:4200
```

### Dev with Docker
```bash
docker-compose -f docker-compose.dev.yml up --build
```

## Configuration

Edit `backend/config/ado.config.json`:

| Field | Description |
|---|---|
| `pat` | Azure DevOps Personal Access Token (read: Work Items) |
| `organization` | ADO organisation name (e.g. `mycompany`) |
| `project` | ADO project name (e.g. `STEPS`) |
| `defaultAreaPath` | Pre-selected area path |
| `defaultIterationPath` | Pre-selected iteration path |
| `iterationPaths` | List of iteration paths shown in the dropdown |

**Never commit `ado.config.json` — it is in `.gitignore`.**

## Dashboard Features

- Area Path locked to configured value
- Iteration Path selectable from dropdown (persisted in localStorage)
- Per-feature cards showing:
  - Total user stories
  - Stories in Refinement
  - Stories in QA
  - Completed stories
  - % completion (SVG progress ring + progress bar)

## Sprint Progress

See `SPRINT_PROGRESS.md` to track development status and resume work.
