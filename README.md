# FeasPro - Property Development Feasibility Platform

FeasPro is a specialized property development feasibility and financial modelling platform designed to evaluate financial returns, cash flow, and development assumptions.

---

## Quick Start Guide

### Prerequisites
- Python 3.12+
- Node.js v18+ / npm

---

### 1. Backend Setup & Run

```bash
# In project root:
# 1. Activate the virtual environment
.\venv\Scripts\activate   # Windows
# source venv/bin/activate  # macOS / Linux

# 2. Run backend server (will automatically create database tables & seed sample project)
uvicorn backend.app.main:app --reload --port 8000
```

- Backend API: `http://127.0.0.1:8000`
- Interactive OpenAPI Docs: `http://127.0.0.1:8000/docs`
- Health Check: `http://127.0.0.1:8000/health`

---

### 2. Frontend Setup & Run

```bash
# In frontend/ directory:
cd frontend
npm run dev
```

- Open `http://localhost:5173` in your browser.

---

### 3. Running Automated Tests

```bash
# Run pytest test suite from project root:
.\venv\Scripts\pytest.exe -v
```

---

### 4. Running Database Migrations (Alembic)

```bash
# Apply migrations:
.\venv\Scripts\alembic.exe upgrade head

# Generate a new migration:
.\venv\Scripts\alembic.exe revision --autogenerate -m "Migration description"
```

---

### 5. Pre-Seeded Demo Project

On startup, the system automatically provisions:
- **Organization**: `Apex Property Group`
- **User**: `developer@apexdev.com.au`
- **Sample Project**: `Pacific Horizon Residences` (48-unit apartment development in Burleigh Heads QLD)
- **Baseline Scenario**: `Baseline Feasibility (48 Units)`
- **Alternate Scenario**: `Higher Density Scheme (56 Units)`

---

## Architecture

See [ARCHITECTURE.md](file:///c:/Users/HP/Desktop/app/ARCHITECTURE.md) for full architectural specifications, domain models, and calculation engine integration guides.
