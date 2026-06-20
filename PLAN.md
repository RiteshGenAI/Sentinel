# Sentinel Fullstack — Enhancement Plan

## Vision: Make it "One of Its Kind"
Transform the basic cost tracker into a **Cost Intelligence Platform** — not just tracking LLM + CI costs, but predicting them, alerting on them, and optimizing them.

---

## Phase 1: Foundation Fixes (Critical)
- [ ] Fix all security issues (password validation, secret key check, CORS, role enum)
- [ ] Fix datetime deprecation (utcnow → now(timezone.utc))
- [ ] Add lifespan context manager (replace on_event)
- [ ] Add audit fields (created_at, updated_at, is_active)
- [ ] Add pagination to list endpoints
- [ ] Add 404/resource-not-found checks
- [ ] Add rate limiting on auth endpoints
- [ ] Add proper input sanitization (strip whitespace)

## Phase 2: Core Features (What Makes It Unique)
- [ ] **Cost Forecasting** — Predict next month's costs using trend analysis
- [ ] **Real-time Alerts** — WebSocket endpoint for budget threshold alerts
- [ ] **Cost Intelligence API** — Auto-ingest via API key (not just JWT)
- [ ] **Project Cost Breakdown** — Per-project cost aggregation with charts data
- [ ] **Admin Dashboard** — User management, deactivate users, change roles
- [ ] **Activity Logs** — Track who created what, when
- [ ] **Export** — CSV export of costs and budgets
- [ ] **Model Cost Comparison** — Compare LLM model costs side-by-side

## Phase 3: Frontend Enhancement
- [ ] React Router with proper routes (/, /login, /dashboard, /admin, /projects/:id)
- [ ] Session persistence via localStorage
- [ ] Recharts visualizations (cost trends, project breakdown, model comparison)
- [ ] Real-time alert banner (WebSocket)
- [ ] Admin panel with user management
- [ ] Project detail page with cost history
- [ ] Loading states and error boundaries
- [ ] Responsive improvements

## Phase 4: Production Readiness
- [ ] Production Docker Compose (nginx reverse proxy, non-root containers)
- [ ] Health check endpoint with DB connectivity
- [ ] Request logging middleware
- [ ] Graceful error handling middleware
- [ ] API documentation enhancements (Swagger tags, descriptions)

## Phase 5: Testing
- [ ] Unit tests for all services (auth, pricing, budget, forecast)
- [ ] Integration tests for API endpoints (TestClient)
- [ ] End-to-end smoke test (run app, hit endpoints)

## Phase 6: SonarQube / SCR
- [ ] Run SonarQube Community Edition in Docker
- [ ] Scan backend and frontend
- [ ] Fix all blocker/critical/major issues
- [ ] Or fallback: pylint + mypy + flake8 + bandit + eslint

---

## Execution Order
1. Complete foundation fixes (backend models, schemas, deps, main)
2. Add new backend models (Alert, ActivityLog, ApiKey)
3. Implement new backend services (forecast, alert, activity log)
4. Add new API endpoints (admin, forecast, export, websocket, health)
5. Overhaul frontend (router, charts, admin, session persistence)
6. Docker production setup
7. Write tests
8. Run SonarQube / static analysis
9. Fix issues from analysis
10. Final end-to-end test
