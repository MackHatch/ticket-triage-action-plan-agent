import type { TriageResult } from "./schemas.js";

export function renderMarkdown(result: TriageResult): string {
  const component = result.suspectedComponent ?? "Unclear";
  const status = (s: "todo" | "done" | "blocked" | undefined) => s ?? "todo";

  const lines: string[] = [
    `# ${result.title}`,
    "",
    `Type: ${result.ticketType} | Severity: ${result.severity}`,
    `Component: ${component}`,
    `Generated: ${result.meta.generatedAt}`,
    "",
    "## Summary",
    result.summary,
    "",
    "## User Impact",
    result.userImpact,
    "",
    "## Observed vs Expected",
    `**Observed:** ${result.observedBehavior}`,
    `**Expected:** ${result.expectedBehavior}`,
    "",
    "## Repro Steps",
    result.reproSteps.length > 0
      ? result.reproSteps.map((s) => `- ${s}`).join("\n")
      : "- None provided.",
    "",
    "## Questions to Ask",
    result.questionsToAsk.length > 0
      ? result.questionsToAsk
          .map(
            (q) =>
              `- Q: ${q.question} (Why: ${q.why})`
          )
          .join("\n")
      : "- None.",
    "",
    "## Investigation Checklist",
    ...result.investigationChecklist.map((c) => {
      const checkbox = status(c.status) === "done" ? "[x]" : "[ ]";
      const ownerPart = c.owner ? ` (Owner: ${c.owner})` : "";
      const statusPart = ` (Status: ${status(c.status)})`;
      return `- ${checkbox} ${c.item}${ownerPart}${statusPart}`;
    }),
    "",
    "## Proposed Fix Plan",
    result.proposedFixPlan.length > 0
      ? result.proposedFixPlan.map((s) => `- ${s}`).join("\n")
      : "- Not proposed yet.",
    "",
    "## Acceptance Criteria",
    result.acceptanceCriteria.length > 0
      ? result.acceptanceCriteria.map((a) => `- ${a.criterion}`).join("\n")
      : "- None defined.",
    "",
    "## Reply Draft",
    `**Subject:** ${result.requesterReply.subject}`,
    "",
    result.requesterReply.body,
  ];

  return lines.join("\n") + "\n";
}
