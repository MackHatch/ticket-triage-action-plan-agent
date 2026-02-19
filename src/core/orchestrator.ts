import { TriageResultSchema, type TriageResult } from "./schemas.js";
import { renderMarkdown } from "./renderer.js";
import { generateTriageJson, repairTriageJson } from "./llmClient.js";
import { newRunId, type Trace } from "./trace.js";

const DEFAULT_MODEL = "gpt-4o-mini";

export class TriageValidationError extends Error {
  constructor(
    message: string,
    public readonly validationErrors: string[],
    public readonly trace: Trace,
    public readonly runId: string
  ) {
    super(message);
    this.name = "TriageValidationError";
  }
}

export async function runTicketTriageAgent(args: {
  ticketText: string;
  title: string;
  source: "ticket" | "email";
  tone: "neutral" | "direct";
  model?: string;
}): Promise<{
  result: TriageResult;
  markdown: string;
  runId: string;
  trace: Trace;
  rawModelJson: string;
  repairedModelJson: string | null;
}> {
  const runId = newRunId();
  const model = args.model ?? DEFAULT_MODEL;
  const startedAt = new Date().toISOString();

  const flags: string[] = [];

  const { rawJsonText: rawModelJson } = await generateTriageJson({
    model,
    ticketText: args.ticketText,
    title: args.title,
    source: args.source,
    tone: args.tone,
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawModelJson);
  } catch {
    flags.push("VALIDATION_FAILED");
    const trace: Trace = {
      runId,
      model,
      ticketChars: args.ticketText.length,
      startedAt,
      finishedAt: new Date().toISOString(),
      flags,
      parseOk: false,
      validationErrors: ["Invalid JSON from model"],
    };
    throw new TriageValidationError(
      "JSON parse failed: invalid JSON from model",
      ["Invalid JSON from model"],
      trace,
      runId
    );
  }

  let result: TriageResult;
  let repairedModelJson: string | null = null;

  const parsedResult = TriageResultSchema.safeParse(parsed);

  if (parsedResult.success) {
    result = parsedResult.data;
  } else {
    // Schema validation failed — try repair
    flags.push("VALIDATION_FAILED");
    const validationErrors = parsedResult.error.errors.map(
      (e) => `${e.path.join(".")}: ${e.message}`
    );

    const { repairedJsonText } = await repairTriageJson({
      model,
      rawJsonText: rawModelJson,
      validationErrors,
    });
    repairedModelJson = repairedJsonText;

    let repairedParsed: unknown;
    try {
      repairedParsed = JSON.parse(repairedJsonText);
    } catch {
      flags.push("REPAIR_FAILED");
      const trace: Trace = {
        runId,
        model,
        ticketChars: args.ticketText.length,
        startedAt,
        finishedAt: new Date().toISOString(),
        flags,
        parseOk: false,
        validationErrors: ["Repaired JSON parse failed"],
      };
      throw new TriageValidationError(
        "Repair failed: repaired output is not valid JSON",
        ["Repaired JSON parse failed"],
        trace,
        runId
      );
    }

    const repairedParsedResult = TriageResultSchema.safeParse(repairedParsed);

    if (!repairedParsedResult.success) {
      flags.push("REPAIR_FAILED");
      const repairErrors = repairedParsedResult.error.errors.map(
        (e) => `${e.path.join(".")}: ${e.message}`
      );
      const trace: Trace = {
        runId,
        model,
        ticketChars: args.ticketText.length,
        startedAt,
        finishedAt: new Date().toISOString(),
        flags,
        parseOk: false,
        validationErrors: repairErrors,
      };
      throw new TriageValidationError(
        `Repair failed: ${repairErrors.slice(0, 3).join("; ")}${repairErrors.length > 3 ? "..." : ""}`,
        repairErrors,
        trace,
        runId
      );
    }

    result = repairedParsedResult.data;
    flags.push("REPAIRED_OUTPUT");
  }

  // Override meta.generatedAt with orchestrator timestamp
  result.meta.generatedAt = new Date().toISOString();

  // Heuristic guardrail flags (do not fail)
  const ticketLower = args.ticketText.toLowerCase();
  if (
    result.suspectedComponent !== null &&
    !ticketLower.includes(result.suspectedComponent.toLowerCase())
  ) {
    flags.push("COMPONENT_NOT_IN_TICKET");
  }

  if (
    args.ticketText.length < 800 &&
    result.reproSteps.some(
      (step) => step.length > 0 && !ticketLower.includes(step.toLowerCase())
    )
  ) {
    flags.push("REPRO_MAY_BE_INFERRED");
  }

  // Confidence flags
  const { classification, investigationPlan, responseDraft } = result.confidence;
  if (
    classification < 0.5 ||
    investigationPlan < 0.5 ||
    responseDraft < 0.5
  ) {
    flags.push("LOW_CONFIDENCE_OUTPUT");
  }

  const evaluation = {
    checklistCount: result.investigationChecklist.length,
    questionCount: result.questionsToAsk.length,
  };

  const markdown = renderMarkdown(result);

  const trace: Trace = {
    runId,
    model,
    ticketChars: args.ticketText.length,
    startedAt,
    finishedAt: new Date().toISOString(),
    flags,
    parseOk: true,
    evaluation,
  };

  return {
    result,
    markdown,
    runId,
    trace,
    rawModelJson,
    repairedModelJson,
  };
}
