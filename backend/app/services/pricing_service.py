LLM_PRICING = {
    ('openai', 'gpt-4.1'): {'prompt': 0.002, 'completion': 0.008},
    ('openai', 'gpt-4.1-mini'): {'prompt': 0.0004, 'completion': 0.0016},
}
CI_RUNNER_PRICING = {
    'github-standard': 0.008 / 60,
    'github-large': 0.016 / 60,
}

def compute_llm_cost(provider: str, model: str, prompt_tokens: int, completion_tokens: int) -> float:
    pricing = LLM_PRICING.get((provider.lower(), model.lower()))
    if not pricing:
        return 0.0
    return (prompt_tokens / 1000 * pricing['prompt']) + (completion_tokens / 1000 * pricing['completion'])

def compute_ci_cost(runner_type: str, duration_seconds: float) -> float:
    return CI_RUNNER_PRICING.get(runner_type.lower(), 0.0) * duration_seconds
