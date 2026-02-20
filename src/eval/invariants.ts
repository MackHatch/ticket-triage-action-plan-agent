import { TriageResultSchema } from "../core/schemas.js";
import type { EvalCase } from "./types.js";
import type { TriageResult } from "../core/schemas.js";

export type EvalOutput = {
  pass: boolean;
  failures: string[];
  summary: {
    ticketType: string;
    severity: string;
    checklistCount: number;
    questionCount: number;
    flags: string[];
  };
};

export function evaluateCase(
  evalCase: EvalCase,
  output: TriageResult
): EvalOutput {
  const failures: string[] = [];
  const { expect } = evalCase;

  // Validate against schema (output should already be validated, but double-check)
  const parsed = TriageResultSchema.safeParse(output);
  if (!parsed.success) {
    const msgs = parsed.error.errors.map(
      (e) => `Schema: ${e.path.join(".")} ${e.message}`
    );
    return {
      pass: false,
      failures: msgs,
      summary: {
        ticketType: output.ticketType,
        severity: output.severity,
        checklistCount: output.investigationChecklist.length,
        questionCount: output.questionsToAsk.length,
        flags: [],
      },
    };
  }

  const result = parsed.data;
  const checklistCount = result.investigationChecklist.length;
  const questionCount = result.questionsToAsk.length;
  const ticketLower = evalCase.ticketText.toLowerCase();

  // investigationChecklist non-empty
  if (checklistCount < 1) {
    failures.push("investigationChecklist must have at least 1 item");
  }

  // ticketType in allowed list
  if (expect.ticketType?.length && !expect.ticketType.includes(result.ticketType)) {
    failures.push(
      `ticketType "${result.ticketType}" not in allowed [${expect.ticketType.join(", ")}]`
    );
  }

  // severity in allowed list
  if (expect.severity?.length && !expect.severity.includes(result.severity)) {
    failures.push(
      `severity "${result.severity}" not in allowed [${expect.severity.join(", ")}]`
    );
  }

  // minChecklistItems
  const minItems = expect.minChecklistItems ?? 1;
  if (checklistCount < minItems) {
    failures.push(
      `checklistCount ${checklistCount} < minChecklistItems ${minItems}`
    );
  }

  // mustHaveQuestions
  if (expect.mustHaveQuestions === true && questionCount < 1) {
    failures.push("mustHaveQuestions true but questionCount < 1");
  }

  // Strict: suspectedComponent non-null but not in ticket text
  if (
    result.suspectedComponent !== null &&
    result.suspectedComponent.length > 0 &&
    !ticketLower.includes(result.suspectedComponent.toLowerCase())
  ) {
    failures.push(
      `suspectedComponent "${result.suspectedComponent}" not found in ticket text`
    );
  }

  return {
    pass: failures.length === 0,
    failures,
    summary: {
      ticketType: result.ticketType,
      severity: result.severity,
      checklistCount,
      questionCount,
      flags: [], // flags come from trace, not result; runner will merge
    },
  };
}
