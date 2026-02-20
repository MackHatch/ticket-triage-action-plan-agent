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

## Web Demo

Run the server (serves both API and static UI):

```bash
npm run api
```

Open **http://localhost:3000** in your browser. Use the sample buttons ("Load Sample: Good", "Load Sample: Vague") to populate the form, then click "Triage Ticket".

## API

Run the HTTP server (also serves the web UI at `/`):

```bash
npm run api
```

Example request:

```bash
curl -X POST http://localhost:3000/triage \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Student can't access application\",\"ticketText\":\"Hi, a student says they can't get into the application. Can someone look?\nThanks\",\"tone\":\"neutral\",\"source\":\"ticket\"}"
```

The API returns validated JSON (`result`), Markdown (`markdown`), and trace metadata (`trace`). It does not write artifacts to disk; use the CLI for file output.

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

## Evaluation Harness

An eval harness detects regressions when prompts or models change. It runs golden cases against the agent and validates outputs against invariants (not exact text).

**Run:** `npm run eval`

- Requires `RUN_EVALS=1` (set via cross-env in the script) to avoid accidental paid LLM calls in CI
- Writes reports to `eval/results/<id>.<timestamp>.json`
- Exits non-zero if any case fails

Add cases in `eval/cases/*.json`; see existing cases for the expect format.

## Docs

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — Data flow, ASCII diagram, observability
- [docs/DECISIONS.md](docs/DECISIONS.md) — Design decisions
