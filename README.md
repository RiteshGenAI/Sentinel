<p align="center">
  <img src="assets/sentinel_logo.svg" alt="Sentinel Logo Banner" width="650">
</p>

# Sentinel: Enterprise Cost Intelligence & LLM Gateway

**Sentinel** is a modern, enterprise-grade Cost Intelligence platform and LLM Gateway. It allows organizations to manage, track, forecast, and optimize LLM API usage and costs through centralized provider management and dynamically scoped child API keys with built-in real-time spending limits.

Featuring a beautiful, modern light-theme dashboard, predictive cost forecasting, and an OpenAI-compatible routing gateway, Sentinel guarantees that teams can leverage AI models without risking budget overruns.

---

## Key Features

### Intelligent LLM Gateway & Proxying
*   **Centralized Key Management**: Safely register and manage master credentials for AI Providers (e.g., Google Gemini, OpenAI, Anthropic) with Fernet encryption at rest.
*   **Scoped Child API Keys**: Issue custom child API keys for specific teams, projects, or applications with configurable spending limits and expiration dates.
*   **Real-time Cost Controls**: Bind child API keys to custom spending limits (budgets) with automatic token/request blocking when limits are exceeded.
*   **OpenAI-Compatible Path Routing**: Intercept completions calls on `http://localhost:8000/api/v1/proxy/chat/completions`, compute query and completion costs in real-time, record latency, and proxy downstream to the actual provider.
*   **Rate Limiting**: Configurable per-provider rate limits (RPM/TPM) to prevent API abuse and ensure fair usage distribution.
*   **Advanced Provider Configuration**: Support for custom API key headers, model JSON configuration, and provider active/inactive status management.
*   **Usage Tracking**: Detailed tracking of master key usage (requests, costs, tokens) with real-time RPM monitoring and reset functionality.
*   **Child Key Analytics**: Per-child key usage statistics including request counts, costs, tokens, and last-used timestamps.

### Cost Intelligence & Predictive Analytics
*   **Executive Dashboard**: High-fidelity UI detailing total budget allocation, real-time spending tracking, active projects, token volumes, and active alerts with 15-second auto-refresh.
*   **Interactive Visualizations**: Dynamic area, line, and bar charts showcasing daily cost trends, spending breakdowns by project, and token usage analytics using Recharts.
*   **Predictive Forecasting**: 30-day historical trend analysis using statistical projection to predict month-end spending and identify budget risk levels (`OK`, `WARNING`, `CRITICAL`) with per-member cost projections.
*   **Real-time Telemetry**: Comprehensive transaction logs with timestamp, provider, model, token counts, latency metrics, and cost breakdown with filtering and pagination.
*   **CSV Exports**: One-click exports of LLM transaction histories, CI runs, and active budgets for audit logs and accounting.
*   **Analytics Dashboard**: Aggregated metrics including token statistics, project cost breakdowns, and timeline analytics.

### Security & Role-Based Access Control (RBAC)
*   **Three Roles Enforced**:
    *   `admin`: Full CRUD access over budgets, users, providers, and key creation. Can manage custom providers and user roles.
    *   `manager`: Project management, key creation, budget monitoring, and data ingestion. Cannot manage users or system providers.
    *   `viewer`: Read-only access to dashboards, charts, forecasts, and telemetry logs.
*   **State-of-the-Art Authentication**: Secure JWT session auth with token expiration and client-side persistence.
*   **Zero Naive-Datetime Offsets**: Robust timezone handling across all API key validation filters.
*   **Encrypted Credentials**: Master API keys are encrypted using Fernet symmetric encryption and never displayed after storage.
*   **Rate Limiting Middleware**: Built-in protection against brute-force attacks on authentication endpoints (15 requests per minute per IP).
*   **Request Logging**: Comprehensive HTTP request logging with timing and status codes for monitoring and debugging.
*   **Centralized Error Handling**: Global error handling middleware for consistent error responses and logging.
*   **Secret Key Validation**: Enforces secure secret key configuration (rejects default/weak keys in production).

### Project & Budget Management
*   **Project Organization**: Create and manage projects representing teams, departments, or applications with descriptions.
*   **Budget Allocation**: Assign spending limits to projects with real-time monitoring and status tracking (healthy, warning, critical).
*   **Budget Verification**: Verify budget compliance and track utilization ratios with automatic alert escalation.
*   **Project Cost Tracking**: Per-project cost analytics with detailed breakdowns by model and provider.
*   **Budget Alert System**: Automatic generation of warning and critical alerts when thresholds are breached, with acknowledgement functionality.
*   **Configurable Thresholds**: Set custom warning (default 70%) and critical (default 90%) thresholds per budget.

### Audit Trail & Monitoring
*   **Activity Logging**: Comprehensive audit trail tracking all user actions including key creation, budget changes, and provider modifications.
*   **Usage Analytics**: Detailed tracking of master key usage, child key usage, and API key usage with request counts, costs, and tokens.
*   **Performance Monitoring**: Built-in request timing and latency tracking for all API endpoints.
*   **Error Tracking**: Centralized error logging for debugging and monitoring system health.

### Data Ingestion & Integration
*   **LLM Call Ingestion**: API endpoint for ingesting external LLM call data for cost tracking and analytics.
*   **CI Run Ingestion**: Support for ingesting CI/CD pipeline run data for comprehensive cost attribution.
*   **External Integration**: RESTful APIs for external systems to push telemetry data into Sentinel.

### Development & Deployment Tools
*   **Database Migration Script**: Safe schema migration tool (`python migrate.py`) for adding missing columns without data loss.
*   **Demo Data Seeding**: Comprehensive script (`python seed_demo_data.py`) for populating realistic LLM calls, CI runs, and budgets across 30 days.
*   **Local Development Scripts**: PowerShell scripts for easy setup and running of components:
  - `setup.ps1` - One-time setup for dependencies and environment configuration
  - `start-docker.ps1` - Run full stack using Docker (recommended)
  - `start-local.ps1` - Run with native PostgreSQL and local processes
  - Component-specific scripts for backend, frontend, and PostgreSQL
*   **NGINX Configuration**: Production-ready reverse proxy configuration with SSL/HTTPS support template.
*   **Environment Configuration**: Flexible environment-based configuration with `.env` file support and secret key validation.

---

## Application Pages & Features

### Login Page
**Purpose**: Secure authentication gateway for all user roles.

**Features**:
- Email and password-based authentication
- Session persistence using localStorage
- Automatic redirect to dashboard on successful login
- JWT token management with automatic attachment to API requests
- Access control based on user roles

**Access**: Public (no authentication required)

---

### Dashboard Page
**Purpose**: Executive overview of organizational LLM spending and resource utilization.

**Features**:
- **KPI Cards**: Real-time display of total spent, total budgeted, total tokens processed, and alert status
- **Forecast Status Widget**: Quick view of projected monthly cost, current spend, and risk assessment
- **Interactive Charts**: 
  - Cost vs Limit comparison bar charts for budget tracking
  - Project spending breakdowns
  - Daily cost trend area charts
  - Token usage pie charts by provider
- **Timeline Analytics**: Visual representation of spending over time with daily granularity
- **Real-time Updates**: 15-second auto-refresh for live data
- **Role-based Navigation**: Admin users get access to Admin Panel button
- **Export Capabilities**: Quick access to CSV exports and forecast views

**Access**: All authenticated users (admin, manager, viewer)

**Key Metrics Displayed**:
- Total spent across all projects
- Total budget allocation
- Token volume statistics
- Critical budget alerts count
- Project-specific cost breakdowns
- Average cost per model

---

### Admin Panel
**Purpose**: System administration for user management and provider configuration.

**Features**:
- **User Management Table**:
  - View all registered users with ID, name, email, role, and active status
  - Change user roles (admin, manager, viewer) via dropdown
  - Deactivate users with confirmation dialog
  - Visual indicators for user status (active/inactive) and role badges

- **Provider Management**:
  - View configured LLM providers with display names, base URLs, and rate limits
  - Add custom providers with configuration:
    - Provider name and display name
    - Base URL for API endpoints
    - API key header configuration
    - Rate limits (RPM and TPM)
    - Supported models (JSON configuration)
  - Provider cards showing RPM/TPM limits and master key counts

**Access**: Admin role only

**Management Capabilities**:
- Full user lifecycle management
- Custom provider integration
- System-wide configuration control

---

### Forecast Page
**Purpose**: Predictive analytics for cost planning and budget risk assessment.

**Features**:
- **Overall Forecast Metrics**:
  - Average daily cost calculation
  - Projected monthly cost based on historical trends
  - Total budget limit across all projects
  - Risk level assessment (high, medium, low) with color-coded indicators

- **Model Confidence Details**:
  - Days of historical data used for projections
  - Linear regression analysis over sliding window
  - Probability calculations for budget overrun

- **Member Projections Table**:
  - Per-team-member cost forecasting
  - Individual average daily costs
  - Projected monthly costs per member
  - Scoped limit comparisons
  - Individual risk level assessments

**Risk Assessment Logic**:
- High risk: Projected spending likely to exceed budget limits
- Medium risk: Approaching budget limits with moderate overrun probability
- Low risk: Well within budget constraints

**Access**: All authenticated users (admin, manager, viewer)

---

### Providers Overview Page
**Purpose**: Central monitoring of all configured LLM providers and their status.

**Features**:
- **Provider Cards**:
  - Provider display name and technical base URL
  - Active status indicators
  - Rate limit configurations (RPM and TPM)
  - Master key count per provider
  - Visual grouping by provider

- **Real-time Status**:
  - Provider availability status
  - Configuration validation
  - Rate limit adherence monitoring

**Access**: All authenticated users (admin, manager, viewer)

**Provider Information Displayed**:
- Provider name and display name
- API base URL
- Rate limits (requests per minute, tokens per minute)
- Number of configured master keys
- Active/inactive status

---

### Master Credentials Page
**Purpose**: Secure management of provider API keys with encryption.

**Features**:
- **Add Master Key Form**:
  - Provider selection dropdown
  - Secure API key input (password field, never displayed)
  - Optional key label/naming
  - Immediate encryption on storage

- **Configured Keys Display**:
  - Grouped by provider
  - Key prefix display (partial key for identification)
  - Total request count per key
  - Total cost accumulated per key
  - Revocation capability with confirmation

- **Security Features**:
  - Fernet encryption at rest
  - Keys never displayed in full after storage
  - Revocation immediately disables key usage
  - Audit trail of key usage

**Access**: Admin and manager roles

**Key Information Tracked**:
- Key name/label
- Provider association
- Usage statistics (request count, cost)
- Creation timestamp
- Active status

---

### Scoped Child Keys Page
**Purpose**: Generate and manage limited-access API keys with spending controls.

**Features**:
- **Generate Scoped Key Form**:
  - Provider selection
  - Key naming and description
  - Cost limit configuration (USD)
  - Optional expiration (days)
  - Project binding for cost attribution
  - User email assignment for ownership tracking

- **Inline Project Creation**:
  - Create new projects directly from key generation form
  - Project name and description fields
  - Immediate project selection after creation

- **Key Generation & Display**:
  - One-time display of generated secret key
  - Copy to clipboard functionality
  - Security warning about key visibility
  - Auto-dismiss capability

- **Child Keys Management**:
  - List of all generated child keys
  - Provider association
  - Project binding
  - Cost limit and current spend
  - Request count tracking
  - Expiration status
  - Revocation capability

- **Usage Summaries**:
  - Per-key usage statistics
  - Remaining budget calculations
  - Active/inactive status

**Access**: Admin and manager roles

**Key Controls**:
- Spending limits (hard caps)
- Time-based expiration
- Project scoping
- User attribution
- Real-time enforcement

---

### Telemetry Logs Page
**Purpose**: Real-time monitoring and analysis of all LLM gateway transactions.

**Features**:
- **Advanced Filtering**:
  - Search by model name, provider, or project
  - Project-specific filtering dropdown
  - Real-time filter application

- **Transaction Logs Table**:
  - Timestamp with precise datetime
  - Project association
  - Provider identification
  - Model name
  - Token counts (prompt/completion/total)
  - Latency measurements (seconds)
  - Cost per transaction (USD)
  - Click-to-view detailed transaction information

- **Pagination**:
  - Configurable page size (15 items per page)
  - Total items and pages display
  - Navigation controls

- **Detailed Transaction View**:
  - Modal popup with full transaction details
  - Complete token breakdown
  - Request/response metadata
  - Cost calculation details

- **Real-time Updates**:
  - Manual refresh capability
  - Live data streaming

**Access**: All authenticated users (admin, manager, viewer)

**Logged Information**:
- Every proxy request through the gateway
- Token usage (prompt and completion)
- Latency metrics
- Cost calculations
- Provider and model used
- Project attribution
- User identification (when available)

---

## User Journeys & Workflows

### The Administrator (Admin) Journey
1.  **Centralize Credentials**: The Admin navigates to **Providers > Master Credentials** to register Master API keys (e.g., Google Gemini, OpenAI) with Fernet encryption.
2.  **Configure Providers**: Optionally, the Admin can add custom LLM providers via **Admin Panel > Providers Directory** with specific rate limits and model configurations.
3.  **Define Guardrails**: They create **Projects** via **Scoped Child Keys > Create Project** representing departments or teams and assign hard **Budgets** (e.g., maximum spent limit of $50).
4.  **Generate Child Keys**: The Admin generates scoped **Child API Keys** via **Providers > Scoped Child Keys**, binding them to specific projects, budgets, and optional expiration dates.
5.  **User Management**: The Admin manages user accounts via **Admin Panel**, changing roles (admin/manager/viewer) and deactivating users as needed.
6.  **Oversight**: The Admin views the **Executive Dashboard** for real-time spending, monitors **Forecast** for month-end predictions, inspects **Telemetry Logs** for transaction details, and exports data to CSV for audit trails.

### The Project Manager Journey
1.  **Retrieve Child Keys**: Project managers receive scoped **Child API Keys** generated by Admins or can generate their own via **Providers > Scoped Child Keys**.
2.  **Project Setup**: Managers create new projects and allocate budgets directly from the **Scoped Child Keys** page using inline project creation.
3.  **Team Key Distribution**: Managers generate child keys for team members with appropriate spending limits and project bindings.
4.  **Monitoring**: Managers use the **Dashboard** to track project spending, **Forecast** to anticipate budget needs, and **Telemetry Logs** to debug usage patterns.
5.  **Data Ingestion**: Managers can push external LLM call data and CI run information via the ingest APIs for comprehensive cost tracking.

### The Developer Journey
1.  **Retrieve Child Keys**: Developers receive a scoped **Child API Key** from their manager.
2.  **Integration**: Instead of placing sensitive master keys in code, developers update their application environment to use the **Child Key** and point their OpenAI/Gemini SDKs to the Sentinel Proxy base URL:
    ```bash
    http://localhost:8000/api/v1/proxy
    ```
3.  **Autonomous Control**: If a team's application goes into an infinite loop or experiences high traffic and exceeds its assigned budget, Sentinel's gateway intercepts the calls and returns a `429 Rate Limit Exceeded (Budget Blown)` response, preventing budget overruns without affecting other teams.
4.  **Development Monitoring**: Developers can check **Telemetry Logs** to see their API call performance, latency, and costs in real-time.

### The Business Viewer (Viewer) Journey
1.  **Monitor & Analyze**: Viewers (e.g., finance teams or product managers) log in to a read-only view with access to dashboards and analytics.
2.  **Executive Dashboard**: They review **Dashboard** KPIs showing total spend, budget utilization, token volumes, and alert status.
3.  **Cost Analytics**: They analyze interactive charts showing cost trends, project breakdowns, and token usage patterns.
4.  **Forecast Review**: They check the **Forecast** page for 30-day predictive spending, risk assessments, and per-team-member cost projections.
5.  **Telemetry Inspection**: They review **Telemetry Logs** for detailed transaction history and **Providers Overview** to understand configured services.
6.  **Strategic Planning**: Based on forecasts and analytics, viewers make recommendations for budget allocations and resource planning.

---

## Step-by-Step Setup & Verification Guide

### 1. Launch the Stack
Run the containerized application using Docker Compose (Production mode is recommended for Nginx routing):
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### 2. Log In as Admin
Navigate to `http://localhost/` and log in using the pre-seeded admin credentials:
*   **Email**: `admin@sentinel.com`
*   **Password**: `admin1234`

### 3. Configure Provider (Optional)
If you want to add a custom LLM provider:
1.  Navigate to **Admin Panel**
2.  In the **Providers Directory** section, click **+ Add Custom Provider**
3.  Fill in the provider details (name, display name, base URL, rate limits, models)
4.  Click **Configure** to add the provider

### 4. Add a Master Provider Key
1.  Navigate to **Providers > Master Credentials**
2.  Select a provider from the dropdown (or use a pre-configured one)
3.  Enter your API key (e.g., Google Gemini, OpenAI key)
4.  Add an optional label for the key
5.  Click **Configure Master Key**
6.  The key will be encrypted and stored securely

### 5. Setup a Project
1.  Navigate to **Providers > Scoped Child Keys**
2.  Click **+ Create New Project** in the form section
3.  Enter project name (e.g., "Customer Service Chatbot") and description
4.  Click **Create Project**
5.  The project will be available for binding to child keys

### 6. Generate a Scoped Child Key
1.  On the **Scoped Child Keys** page, fill in the generation form:
    - Select Provider (e.g., Google Gemini)
    - Enter Key Name
    - Set Cost Limit (e.g., $20.00)
    - Optionally set Expiration (days)
    - Select the Project you created
    - Optionally assign to a user email
2.  Click **Generate Scoped Key**
3.  **Important**: Copy the generated `sk_child_...` key immediately - it won't be shown again
4.  The key appears in the configured keys list with usage tracking

### 7. Monitor Dashboard
1.  Navigate to **Dashboard** to see real-time metrics
2.  View KPI cards showing total spent, budgeted, tokens, and alerts
3.  Check the Forecast Status widget for risk assessment
4.  Review interactive charts showing cost trends and project breakdowns

### 8. Run Proxy Requests
Test the Gateway by making requests using the child key. The gateway will intercept, calculate the cost, check if the budget is safe, and route the call to the LLM:
```bash
curl -X POST http://localhost:8000/api/v1/proxy/chat/completions \
  -H "Authorization: Bearer sk_child_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemini-3.5-flash",
    "messages": [{"role": "user", "content": "Hello! Speak in one sentence."}]
  }'
```

### 9. Verify Telemetry Logs
1.  Navigate to **Telemetry Logs**
2.  You should see your proxy request logged with:
    - Timestamp
    - Project name
    - Provider and model
    - Token counts (prompt/completion)
    - Latency
    - Cost
3.  Use filters to search by model, provider, or project

### 10. Check Forecast
1.  Navigate to **Forecast**
2.  Review predictive analytics including:
    - Average daily cost
    - Projected monthly cost
    - Risk level assessment
    - Per-member cost projections

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
    docker compose up -d --build
    ```
2.  **Access the applications**:
    *   **Frontend Web UI**: `http://localhost/`
    *   **Backend API Docs (Swagger)**: `http://localhost:8000/docs`

### Local Development Mode
For developers who prefer running components natively with hot-reload.

**PowerShell Setup (Windows)**:
1.  **One-time setup**:
    ```powershell
    .\scripts\setup.ps1
    ```
2.  **Start Docker-based development**:
    ```powershell
    .\scripts\start-docker.ps1
    ```
3.  **Or start with local PostgreSQL**:
    ```powershell
    .\scripts\start-local.ps1
    ```

**Manual Development Mode**:
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

## Database Management

### Schema Migration
Safe migration script for adding missing database columns:

```bash
cd backend
python migrate.py
```

### Demo Data Seeding
Populate the database with realistic demo data for development and testing:

```bash
cd backend
python seed_demo_data.py
```

This creates:
- 300 LLM calls across 30 days
- 60 CI runs with various pipelines
- Budgets for all projects
- Realistic cost and latency data

---

## Configuration

### Environment Variables
Configure the application using a `.env` file in the backend directory:

- `DATABASE_URL`: PostgreSQL connection string
- `SECRET_KEY`: JWT signing key (must be changed from default in production)
- `ACCESS_TOKEN_EXPIRE_MINUTES`: Token expiration time (default: 120 minutes)

### Security Configuration
- **Secret Key Validation**: The application enforces secure secret key configuration and rejects default/weak keys
- **Rate Limiting**: Authentication endpoints are rate-limited to 15 requests per minute per IP
- **CORS Configuration**: Configurable CORS settings for cross-origin requests

---

## Key API Endpoints

### Authentication & User Management
*   `POST /api/v1/auth/register` — Register new user accounts
*   `POST /api/v1/auth/login` — Authenticate users and receive JWT tokens
*   `GET /api/v1/auth/me` — Get current user profile
*   `GET /api/v1/admin/users` — List all users (admin only)
*   `PUT /api/v1/admin/users/{user_id}/role` — Change user role (admin only)
*   `DELETE /api/v1/admin/users/{user_id}` — Deactivate user (admin only)

### Projects & Budgets
*   `POST /api/v1/projects/` — Create new projects (admin, manager)
*   `GET /api/v1/projects/` — List all projects
*   `GET /api/v1/projects/{project_id}` — Get project details
*   `GET /api/v1/projects/{project_id}/costs` — Get project cost breakdown
*   `POST /api/v1/budgets/` — Create budgets (admin only)
*   `GET /api/v1/budgets/` — List all budgets
*   `GET /api/v1/budgets/status` — Get budget status and alert levels
*   `GET /api/v1/budgets/total-spent` — Get total spending across all budgets
*   `POST /api/v1/budgets/verify` — Verify budget integrity
*   `DELETE /api/v1/budgets/{budget_id}` — Delete budget (admin only)

### Providers & Credentials
*   `POST /api/v1/providers/` — Create custom providers (admin only)
*   `GET /api/v1/providers/` — List all providers
*   `GET /api/v1/providers/{provider_id}` — Get provider details
*   `POST /api/v1/master-keys/` — Add master provider credentials (admin, manager)
*   `GET /api/v1/master-keys/` — List all master keys
*   `DELETE /api/v1/master-keys/{key_id}` — Revoke master key (admin, manager)
*   `POST /api/v1/child-keys/` — Generate scoped child keys (admin, manager)
*   `GET /api/v1/child-keys/` — List all child keys
*   `DELETE /api/v1/child-keys/{key_id}` — Revoke child key (admin, manager)
*   `GET /api/v1/child-keys/{key_id}/summary` — Get child key usage summary
*   `GET /api/v1/child-keys/providers/{provider_id}/stats` — Get provider stats (admin, manager)

### LLM Proxy Gateway
*   `POST /api/v1/proxy/chat/completions` — Proxies completion requests to providers, tracks usage, computes cost, and validates child key budgets in real-time

### Analytics & Forecasting
*   `GET /api/v1/analytics/dashboard` — Get dashboard analytics data
*   `GET /api/v1/forecast/` — Get cost forecast and risk assessment

### Telemetry & Monitoring
*   `GET /api/v1/telemetry/calls` — Get LLM transaction logs with pagination and filtering
*   `GET /api/v1/health/` — Health check endpoint

### Data Ingestion & Exports
*   `POST /api/v1/ingest/llm-call` — Ingest external LLM call data
*   `POST /api/v1/ingest/ci-run` — Ingest CI/CD run data
*   `GET /api/v1/export/llm-calls` — Export LLM transaction history to CSV (admin, manager)
*   `GET /api/v1/export/ci-runs` — Export CI run data to CSV (admin, manager)
*   `GET /api/v1/export/budgets` — Export budget data to CSV (admin, manager)

### API Keys (Legacy)
*   `POST /api/v1/api-keys/` — Create API keys (admin, manager)
*   `GET /api/v1/api-keys/` — List all API keys
*   `DELETE /api/v1/api-keys/{key_id}` — Revoke API key (admin, manager)
*   `GET /api/v1/api-keys/{key_id}/usage` — Get API key usage statistics
*   `GET /api/v1/api-keys/{key_id}/summary` — Get API key summary

---

## License
Sentinel is distributed under the Apache License 2.0. See `LICENSE` for details.
