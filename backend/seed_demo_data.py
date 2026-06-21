"""
Demo data seeder - creates realistic LLM call records across 30 days
so the dashboard charts populate with meaningful data.
Run: python seed_demo_data.py
"""
import random
from datetime import datetime, timedelta, timezone
from app.db.session import SessionLocal
from app.models.llm_call import LLMCall
from app.models.ci_run import CIRun
from app.models.project import Project
from app.models.budget import Budget

# ----- configurable ----------------------------------------------------------
NUM_LLM_CALLS = 300       # spread over 30 days
NUM_CI_RUNS   = 60
DAYS_BACK     = 30
# -----------------------------------------------------------------------------

PROVIDERS_MODELS = [
    ("openai",    "gpt-4o",              0.000005, 0.000015),
    ("openai",    "gpt-4o-mini",         0.00000015, 0.0000006),
    ("anthropic", "claude-3-5-sonnet",   0.000003, 0.000015),
    ("anthropic", "claude-3-haiku",      0.00000025, 0.00000125),
    ("gemini",    "gemini-1.5-pro",      0.00000175, 0.0000105),
    ("gemini",    "gemini-1.5-flash",    0.000000075, 0.0000003),
]

PIPELINES = ["ci-build", "deploy-staging", "integration-tests", "e2e-tests", "security-scan"]
JOBS      = ["build", "test", "deploy", "lint", "audit"]
RUNNERS   = ["ubuntu-latest", "windows-latest", "macos-latest", "self-hosted"]

def seed_demo():
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc).replace(tzinfo=None)

        # Fetch projects
        projects = db.query(Project).all()
        if not projects:
            print("No projects found – run seed_for_run.py first.")
            return

        # ── Budgets ──────────────────────────────────────────────────────────
        if db.query(Budget).count() == 0:
            for p in projects:
                db.add(Budget(
                    scope="project",
                    period="monthly",
                    project_id=p.id,
                    limit_usd=50.0,
                    warning_threshold=0.7,
                    critical_threshold=0.9,
                ))
            db.add(Budget(scope="global", period="monthly", project_id=None, limit_usd=200.0))
            db.commit()
            print("Seeded budgets")

        # ── LLM Calls ────────────────────────────────────────────────────────
        existing = db.query(LLMCall).count()
        if existing >= NUM_LLM_CALLS:
            print(f"Already have {existing} LLM calls – skipping LLM seed")
        else:
            records = []
            for _ in range(NUM_LLM_CALLS - existing):
                prov, model, pt_rate, ct_rate = random.choice(PROVIDERS_MODELS)
                project = random.choice(projects)
                days_ago = random.uniform(0, DAYS_BACK)
                created = now - timedelta(days=days_ago)

                prompt_tok = random.randint(200, 4000)
                completion_tok = random.randint(50, 1200)
                cost = prompt_tok * pt_rate + completion_tok * ct_rate
                latency = random.uniform(400, 8000)

                records.append(LLMCall(
                    provider=prov,
                    model=model,
                    prompt_tokens=prompt_tok,
                    completion_tokens=completion_tok,
                    cost_usd=round(cost, 8),
                    latency_ms=round(latency, 1),
                    project_id=project.id,
                    created_at=created,
                ))
            db.add_all(records)
            db.commit()
            print(f"Seeded {len(records)} LLM calls")

        # ── CI Runs ──────────────────────────────────────────────────────────
        existing_ci = db.query(CIRun).count()
        if existing_ci >= NUM_CI_RUNS:
            print(f"Already have {existing_ci} CI runs – skipping CI seed")
        else:
            ci_records = []
            for _ in range(NUM_CI_RUNS - existing_ci):
                project = random.choice(projects)
                days_ago = random.uniform(0, DAYS_BACK)
                created = now - timedelta(days=days_ago)
                duration = random.randint(60, 900)
                infra_cost = round(random.uniform(0.01, 2.5), 4)

                ci_records.append(CIRun(
                    project_id=project.id,
                    pipeline=random.choice(PIPELINES),
                    job=random.choice(JOBS),
                    runner_type=random.choice(RUNNERS),
                    duration_seconds=duration,
                    infra_cost_usd=infra_cost,
                    created_at=created,
                ))
            db.add_all(ci_records)
            db.commit()
            print(f"Seeded {len(ci_records)} CI runs")

        print("✅ Demo data seed complete!")
    finally:
        db.close()


if __name__ == '__main__':
    seed_demo()
