# Decisions

- **Strict schema-first approach** — All LLM output is validated against Zod `TriageResultSchema`. No optional leniency; type mismatches and missing fields surface as validation errors.

- **Deterministic renderer** — `renderMarkdown` uses `result.meta.generatedAt` instead of `new Date()`. Same input produces identical Markdown across runs.

- **Repair pass instead of loosening schema** — When validation fails, we call a second LLM to fix the JSON rather than relaxing Zod. Keeps downstream consumers on a single, strict contract.

- **Guardrails are flags, not hard gates** — Heuristics (component/repro inference, low confidence) add trace flags but do not fail the run. Enables monitoring without blocking operational use.

- **CLI-first** — No web UI or server; CLI makes the agent portable and easy to demo, script, and integrate into existing toolchains.

- **Raw capture for debugging** — `raw.json` (and `repaired.raw.json` when repair runs) are persisted so invalid LLM output can be inspected and used to improve prompts or repair logic.
