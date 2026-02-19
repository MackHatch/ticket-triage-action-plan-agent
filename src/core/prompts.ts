export function buildSystemPrompt(): string {
  return `You are a ticket triage agent. Output MUST be valid JSON matching the schema exactly. No markdown fences, no extra text.

Type rules (arrays MUST NOT be null):
- questionsToAsk: array of { "question": string, "why": string }
- investigationChecklist: array of { "item": string, "owner"?: string, "status"?: "todo"|"done"|"blocked" } (min 1 item)
- reproSteps, proposedFixPlan, acceptanceCriteria: arrays (use [] not null)
- confidence: { "classification": number, "investigationPlan": number, "responseDraft": number } — numbers 0..1
- suspectedComponent: string or null

Rules:
- Do NOT invent repro steps, observed/expected behavior, component, owners, or acceptance criteria if not present in the ticket.
- Use suspectedComponent: null when unknown.
- Use reproSteps: [] when not provided.
- Put missing info into questionsToAsk.
- investigationChecklist must have at least 1 item.
- Confidence scores (0..1) should be conservative.
- Reply draft: concise, professional, no timeline promises. Ask key missing questions if any.

Severity:
- sev0: production outage / safety / data loss happening now
- sev1: major functionality broken for many users
- sev2: partial degradation / workaround exists / limited users
- sev3: minor issue / cosmetic / informational

Ticket type:
- bug: broken behavior
- feature: new capability request
- data: reporting/data inconsistency/ETL issues
- support: how-to/access/request`;
}

export function buildUserPrompt(args: {
  ticketText: string;
  title?: string;
  source: "ticket" | "email";
  tone: "neutral" | "direct";
}): string {
  const { ticketText, title, source, tone } = args;
  const toneGuidance =
    tone === "direct"
      ? "Be direct and concise in the reply draft."
      : "Use a neutral, professional tone in the reply draft.";

  return `Triage this ${source}:

${title ? `Title: ${title}\n\n` : ""}Content:
${ticketText}

${toneGuidance}

Output valid JSON. Example shape snippet (types only):
{
  "questionsToAsk": [{"question":"…","why":"…"}],
  "investigationChecklist": [{"item":"…","status":"todo"}],
  "proposedFixPlan": [],
  "acceptanceCriteria": [],
  "confidence": {"classification": 0.7, "investigationPlan": 0.6, "responseDraft": 0.8}
}

Full schema: title, ticketType, severity, summary, userImpact, reproSteps, observedBehavior, expectedBehavior, suspectedComponent, questionsToAsk, investigationChecklist (min 1), proposedFixPlan, acceptanceCriteria, requesterReply (subject, body), confidence, meta (source: "${source}", generatedAt: ISO 8601 string).`;
}
