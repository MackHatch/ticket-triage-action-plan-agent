# ticket-triage-agent

CLI agent for ticket triage, classification, severity scoring, and action planning.

## 2-Minute Demo

1. **Setup `.env`** — Copy `.env.example` to `.env` and set your `OPENAI_API_KEY`:

   ```bash
   cp .env.example .env
   # Edit .env and add: OPENAI_API_KEY=sk-...
   ```

2. **Install**:

   ```bash
   npm install
   ```

3. **Run the demo** — Runs both sample tickets (good + vague):

   ```bash
   npm run demo
   ```

   On success you’ll see runId and written artifacts for each run.

## Quickstart (single run)

```bash
npm run dev -- tickets/sample_ticket_good.txt --title "Payments stuck after submit" --tone direct
```

## Outputs

Each successful run writes artifacts to `outputs/`:

| File | Description |
|------|-------------|
| `<runId>.triage.json` | Validated triage result (schema-checked) |
| `<runId>.triage.md` | Rendered Markdown report |
| `<runId>.raw.json` | Raw JSON from the model (before validation) |
| `<runId>.repaired.raw.json` | Repaired JSON (only when validation failed and repair succeeded) |
| `<runId>.trace.json` | Run metadata: timing, flags, evaluation counts |

## Reliability & Guardrails

- **Schema validation** — All LLM output is validated against a strict Zod schema. Invalid structure is rejected.

- **Repair pass (single retry)** — On validation failure, a second LLM call attempts to fix the JSON. If repair succeeds, output is used and the `REPAIRED_OUTPUT` flag is set. If repair fails, the run fails.

- **Heuristic flags** — These do not fail the run; they are logged in the trace for monitoring:
  - **COMPONENT_NOT_IN_TICKET** — Suspected component named but not found in ticket text
  - **REPRO_MAY_BE_INFERRED** — Repro steps may have been invented (short ticket + steps not in text)
  - **LOW_CONFIDENCE_OUTPUT** — Any confidence score &lt; 0.5

- **Trace logging** — Each run writes `outputs/<runId>.trace.json` with runId, model, timestamps, flags, parse status, validation errors (if any), and evaluation counts (`checklistCount`, `questionCount`).

## CLI Usage

```bash
npm run dev -- <path-to-ticket.txt> [options]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--title "..."` | "Ticket" | Ticket title |
| `--tone neutral\|direct` | neutral | Reply draft tone |
| `--source ticket\|email` | ticket | Ticket source type |
| `--model <name>` | gpt-4o-mini | OpenAI model |

## Docs

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — Data flow, ASCII diagram, observability
- [docs/DECISIONS.md](docs/DECISIONS.md) — Design decisions
