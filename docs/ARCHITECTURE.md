# Architecture

The ticket-triage-agent is a CLI-first pipeline that takes raw ticket text, sends it to an LLM for structured extraction, validates the output against a strict Zod schema, optionally repairs invalid JSON with a second LLM call, applies heuristic guardrails, and produces deterministic Markdown plus trace artifacts.

## Data Flow

1. **Input ticket text** — Read from a file path (or stdin in future).
2. **LLM extraction** — OpenAI Chat Completions with `response_format: json_object` produces raw JSON.
3. **Schema validation** — Zod `TriageResultSchema` validates types, required fields, and array shapes.
4. **Repair pass** — On validation failure, a second LLM call (`repairTriageJson`) attempts to fix the JSON; single retry only.
5. **Guardrail flags** — Heuristics run on the validated result (component/repro inference, low confidence); these do not fail the run.
6. **Deterministic Markdown rendering** — `renderMarkdown` produces stable output using `meta.generatedAt` (no runtime date calls).
7. **Artifact persistence** — Writes `.triage.json`, `.triage.md`, `.raw.json`, `.repaired.raw.json` (if repaired), `.trace.json` to `outputs/`.

## ASCII Diagram

```
  ┌─────────────────┐
  │  ticket.txt     │
  │  (input)        │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐     raw JSON
  │  generateTriage │────────────────────────────────────┐
  │  Json (LLM)     │                                     │
  └────────┬────────┘                                     │
           │                                              │
           ▼                                              │
  ┌─────────────────┐     invalid                         │
  │  TriageResult   │───────► repairTriageJson ────────────┤
  │  Schema parse   │              │                      │
  └────────┬────────┘              │ repaired JSON        │
           │ valid                 ▼                      │
           │              ┌─────────────────┐             │
           │              │  TriageResult   │             │
           │              │  Schema parse   │             │
           │              └────────┬────────┘             │
           │                       │                      │
           │ ◄─────────────────────┘                      │
           ▼                                              │
  ┌─────────────────┐                                     │
  │  Guardrail      │  COMPONENT_NOT_IN_TICKET             │
  │  flags          │  REPRO_MAY_BE_INFERRED               │
  │  (heuristic)    │  LOW_CONFIDENCE_OUTPUT               │
  └────────┬────────┘                                     │
           │                                              │
           ▼                                              ▼
  ┌─────────────────┐                        ┌─────────────────────┐
  │  renderMarkdown │                        │  outputs/           │
  │  (deterministic)│                        │  <runId>.raw.json   │
  └────────┬────────┘                        │  <runId>.repaired.* │
           │                                 └─────────────────────┘
           ▼
  ┌─────────────────┐
  │  outputs/       │
  │  <runId>.md     │
  │  <runId>.json   │
  │  <runId>.trace  │
  └─────────────────┘
```

## Observability

**Trace contents** — Each run writes `outputs/<runId>.trace.json` with:

| Field | Description |
|-------|-------------|
| `runId` | Unique run identifier |
| `model` | OpenAI model used |
| `ticketChars` | Input ticket length |
| `startedAt` / `finishedAt` | ISO 8601 timestamps |
| `flags` | Heuristic and status flags (see below) |
| `parseOk` | Whether validation succeeded |
| `validationErrors` | Zod error messages (when parseOk is false) |
| `evaluation` | `checklistCount`, `questionCount` |

**Example flags:**

| Flag | Meaning |
|------|---------|
| `VALIDATION_FAILED` | Initial schema validation failed |
| `REPAIRED_OUTPUT` | Repair pass succeeded; output came from repaired JSON |
| `REPAIR_FAILED` | Repair attempt still failed validation |
| `COMPONENT_NOT_IN_TICKET` | Suspected component not found in ticket text |
| `REPRO_MAY_BE_INFERRED` | Repro steps may have been invented (short ticket) |
| `LOW_CONFIDENCE_OUTPUT` | Any confidence score &lt; 0.5 |
