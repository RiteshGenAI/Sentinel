<p align="center">
  <img src="assets/sentinel_logo.svg" alt="Sentinel Logo Banner" width="650">
</p>

# Sentinel: Enterprise Cost Intelligence & LLM Gateway

**Sentinel** is a modern, enterprise-grade Cost Intelligence platform and LLM Gateway. It allows organizations to manage, track, forecast, and optimize LLM API usage and costs through centralized provider management and dynamically scoped child API keys with built-in real-time spending limits.

Featuring a beautiful, modern light-theme dashboard, predictive cost forecasting, and an OpenAI-compatible routing gateway, Sentinel guarantees that teams can leverage AI models without risking budget overruns.

---

## Key Features

### Intelligent LLM Gateway & Proxying
*   **Centralized Key Management**: Safely register and manage master credentials for AI Providers (e.g., Google Gemini, OpenAI, Anthropic).
*   **Scoped Child API Keys**: Issue custom child API keys for specific teams, projects, or applications.
*   **Real-time Cost Controls**: Bind child API keys to custom spending limits (budgets) with automatic token/request blocking when limits are exceeded.
*   **OpenAI-Compatible Path Routing**: Intercept completions calls on `http://localhost:8000/api/v1/proxy/chat/completions`, compute query and completion costs in real-time, record latency, and proxy downstream to the actual provider.

### Cost Intelligence & Predictive Analytics
*   **Executive Dashboard**: High-fidelity UI detailing total budget allocation, real-time spending tracking, active projects, and active alerts.
*   **Interactive Visualizations**: Dynamic area, line, and bar charts showcasing daily cost trends and spending breakdowns by project.
*   **Predictive Forecasting**: 30-day historical trend analysis using statistical projection to predict month-end spending and identify budget risk levels (`OK`, `WARNING`, `CRITICAL`).
*   **CSV Exports**: One-click exports of LLM transaction histories, CI runs, and active budgets for audit logs and accounting.

### Security & Role-Based Access Control (RBAC)
*   **Three Roles Enforced**:
    *   `admin`: Full CRUD access over budgets, users, providers, and key creation.
    *   `manager`: Project management, key creation, budget monitoring, and data ingestion.
    *   `viewer`: Read-only access to dashboards, charts, and forecasts.
*   **State-of-the-Art Authentication**: Secure JWT session auth with token expiration and client-side persistence.
*   **Zero Naive-Datetime Offsets**: Robust timezone handling across all API key validation filters.

---

## Architecture & Tech Stack

Sentinel is built using a clean, decoupled architecture:

```
sentinel_fullstack/
├── backend/                  # FastAPI Application
│   ├── app/
│   │   ├── api/              # Routers (auth, projects, budgets, proxy, admin)
│   │   ├── core/             # Configuration, enums, security checks
│   │   ├── db/               # PostgreSQL engine, session, initial seeds
│   │   ├── models/           # SQLAlchemy database schemas
│   │   ├── schemas/          # Pydantic validation schemas
│   │   └── services/         # Core business logic (proxy costing, keys, budgets)
│   └── tests/                # Pytest suite
└── frontend/                 # React SPA (Vite + TypeScript)
    ├── src/
    │   ├── components/       # Common visual elements (Navbar, Cards)
    │   ├── pages/            # Page layouts (Dashboard, Forecast, Providers, Admin)
    │   └── lib/              # Client API wrapper
```

*   **Backend**: FastAPI, SQLAlchemy (PostgreSQL driver), Pydantic v2, Pytest.
*   **Frontend**: React 18, Vite, TypeScript, TailwindCSS, Recharts.
*   **Infrastructure**: Docker, Nginx, PostgreSQL 16.

---

## Quick Start (Docker Deployment)

### Production Mode (Recommended)
This mode runs the backend on Uvicorn, PostgreSQL in a dedicated volume, and compiles the frontend into static files served via Nginx on port 80.

1.  **Build and run the containers**:
    ```bash
    docker compose -f docker-compose.prod.yml up -d --build
    ```
2.  **Access the applications**:
    *   **Frontend Web UI**: `http://localhost/`
    *   **Backend API Docs (Swagger)**: `http://localhost:8000/docs`

### Development Mode
Runs the backend with auto-reload enabled and mounts the local files directly.

1.  **Start development stack**:
    ```bash
    docker compose up -d --build
    ```
2.  **Access the applications**:
    *   **Frontend React Dev Server**: `http://localhost:5173/`
    *   **Backend API**: `http://localhost:8000/`

---

## Running Tests

Ensure all API key routing, cost computation, and database rules work correctly by running the backend test suite:

```bash
cd backend
pip install -r requirements.txt
pytest
```

---

## Key API Endpoints

### LLM Proxy Gateway
*   `POST /api/v1/proxy/chat/completions` — Proxies completion requests to providers, tracks usage, computes cost, and validates child key budgets in real-time.

### Cost & Budgets Management
*   `GET /api/v1/budgets/total-spent` — Retrieves aggregated actual real-time spending.
*   `GET /api/v1/budgets/status` — Returns overall budget alert states.
*   `POST /api/v1/budgets/verify` — Triggers a manual budget integrity validation scan.

### Data Ingestion & Exports
*   `POST /api/v1/ingest/llm-call` — Manual telemetry ingest endpoint.
*   `GET /api/v1/export/llm-calls` — Export transaction history to CSV.

---

## License
Sentinel is distributed under the Apache License 2.0. See `LICENSE` for details.
