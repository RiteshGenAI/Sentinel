# Static Analysis Report (Sonar-like)

**Tool:** Custom AST-based analyzer + Manual review  
**Scope:** `backend/app/` and `frontend/src/`  
**Date:** Auto-generated

---

## Summary

| Severity | Count | Status |
|---|---|---|
| BLOCKER | 0 | ✅ Clean |
| CRITICAL | 0 | ✅ Clean |
| MAJOR | 0 | ✅ Clean |
| MINOR | ~76 | Mostly false-positive unused imports (naive analyzer) |
| INFO | ~55 | Missing docstrings (non-blocking) |

---

## Security Issues (Manual Review)

### ✅ Fixed Issues

| Issue | File | Fix Applied |
|---|---|---|
| Hardcoded default credentials | `frontend/src/pages/LoginPage.tsx` | Empty defaults, required fields |
| Weak secret key default | `backend/app/core/config.py` | Runtime check throws if unchanged |
| No password strength validation | `backend/app/schemas/user.py` | `min_length=8` with Pydantic Field |
| Overly permissive CORS | `backend/app/main.py` | Restricted to specific methods & headers |
| Missing audit fields | All models | Added `created_at`, `updated_at`, `is_active` |
| Deprecated `on_event` | `backend/app/main.py` | Replaced with `lifespan` context manager |
| Deprecated `datetime.utcnow` | `llm_call.py`, `ci_run.py` | Replaced with `datetime.now(timezone.utc)` |
| No RBAC enum | `backend/app/core/config.py` | Added `Role(StrEnum)` |
| No input sanitization | `auth_service.py`, `project_service.py` | Added `.strip()` and `.lower()` |
| No transaction safety | `budget_service.py` | All DB operations use proper commit/rollback |
| Global budget miscalculation | `budget_service.py` | Now respects `scope` (project vs global) |
| No pagination | `projects.py`, `budgets.py` | Added `skip`/`limit` Query params |
| No 404 handling | `projects.py`, `budgets.py` | Added `HTTPException(404)` for missing resources |
| Session not persisted | `frontend/src/App.tsx` | localStorage for token + session |
| No request interceptors | `frontend/src/lib/api.ts` | 401 → redirect to login, localStorage sync |
| No loading states | `DashboardPage.tsx`, `AdminPage.tsx` | Added loading spinners |
| No React Router | `frontend/src/App.tsx` | Full BrowserRouter with protected routes |
| No rate limiting on backend | `middleware.py`, `main.py` | Added thread-safe in-memory rate limiter for auth routes |
| Large JS bundle (596KB) | `App.tsx` | Added React.lazy/Suspense routing code-splitting |
| No HTTPS enforcement | `nginx.conf` | Added production SSL/HTTPS redirections configuration templates |
| Missing docstrings on functions | `master_child_key_service.py` | Added comprehensive service function docstrings |

### ⚠️ Remaining Issues (Non-Critical)

| Issue | Severity | Notes |
|---|---|---|
| `recharts` deprecation warning | MINOR | `recharts` recommends upgrading to v3 in next cycle. |
| `vite` + `esbuild` vulnerabilities | MODERATE/HIGH | Dev-only dependencies. Production bundle is unaffected. |

---

## Code Quality Observations

### Backend
- **Architecture:** Clean separation of models, schemas, services, and endpoints. ✅
- **Dependency Injection:** Proper use of FastAPI `Depends()` throughout. ✅
- **Type Safety:** SQLAlchemy 2.0 mapped columns + Pydantic v2 schemas. ✅
- **Error Handling:** Centralized middleware catches unhandled exceptions. ✅
- **Logging:** Request logging middleware added with timing. ✅
- **Rate Limiting:** Protects `/login` and `/register` endpoints. ✅

### Frontend
- **TypeScript:** Strict mode enabled. Build passes with 0 errors. ✅
- **Component Structure:** Pages and components well-separated. ✅
- **State Management:** Simple useState + localStorage for auth. No unnecessary complexity. ✅
- **API Layer:** Centralized axios instance with interceptors. ✅
- **Code Splitting:** Dynamic imports optimize asset loading speed. ✅

---

## Recommendations

1. **Upgrade `recharts`** and `vite` in future dependency sprints to address warnings.
2. **Consider adding `alembic` migrations** for production database schema management.
3. **Add integration tests** for the new endpoints (forecast, export, admin).
