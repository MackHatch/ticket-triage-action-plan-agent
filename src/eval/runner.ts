import "dotenv/config";
import { readdir, mkdir, writeFile } from "fs/promises";
import { readFile } from "fs/promises";
import { join } from "path";
import { runTicketTriageAgent } from "../core/orchestrator.js";
import { evaluateCase } from "./invariants.js";
import type { EvalCase, EvalResult } from "./types.js";
import type { Trace } from "../core/trace.js";

const CASES_DIR = "eval/cases";
const RESULTS_DIR = "eval/results";

function requireEvalEnv(): void {
  if (process.env.RUN_EVALS !== "1") {
    throw new Error(
      "Eval harness requires RUN_EVALS=1. Set it to run: npm run eval (or cross-env RUN_EVALS=1 tsx src/eval/runner.ts)"
    );
  }
}

export async function runEvalHarness(): Promise<void> {
  requireEvalEnv();

  const casesDir = join(process.cwd(), CASES_DIR);
  const resultsDir = join(process.cwd(), RESULTS_DIR);

  const files = await readdir(casesDir);
  const jsonFiles = files.filter((f) => f.endsWith(".json"));

  const model = process.env.EVAL_MODEL ?? "gpt-4o-mini";
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  await mkdir(resultsDir, { recursive: true });

  const rows: { id: string; pass: string; failures: string }[] = [];

  for (const file of jsonFiles) {
    const path = join(casesDir, file);
    const raw = await readFile(path, "utf-8");
    const evalCase: EvalCase = JSON.parse(raw);

    let result: EvalResult;
    let trace: Trace | null = null;

    try {
      const { result: output, trace: t } = await runTicketTriageAgent({
        ticketText: evalCase.ticketText,
        title: evalCase.title,
        source: evalCase.source,
        tone: evalCase.tone,
        model,
      });
      trace = t;

      const evalOutput = evaluateCase(evalCase, output);

      result = {
        id: evalCase.id,
        title: evalCase.title,
        pass: evalOutput.pass,
        failures: evalOutput.failures,
        summary: {
          ...evalOutput.summary,
          flags: trace?.flags ?? [],
        },
        timestamp,
      };
    } catch (err) {
      result = {
        id: evalCase.id,
        title: evalCase.title,
        pass: false,
        failures: [err instanceof Error ? err.message : String(err)],
        summary: {
          ticketType: "-",
          severity: "-",
          checklistCount: 0,
          questionCount: 0,
          flags: trace?.flags ?? [],
        },
        timestamp,
      };
    }

    const reportPath = join(resultsDir, `${evalCase.id}.${timestamp}.json`);
    await writeFile(
      reportPath,
      JSON.stringify(
        {
          input: { id: evalCase.id, title: evalCase.title },
          output: result.summary,
          pass: result.pass,
          failures: result.failures,
        },
        null,
        2
      ),
      "utf-8"
    );

    rows.push({
      id: evalCase.id,
      pass: result.pass ? "PASS" : "FAIL",
      failures: result.failures.join("; ") || "-",
    });
  }

  // Console table-like summary
  console.log("\n--- Eval Harness Results ---\n");
  console.log("ID              | PASS/FAIL | Failures");
  console.log("-".repeat(60));
  for (const row of rows) {
    const idPad = row.id.padEnd(14);
    const passPad = row.pass.padEnd(9);
    console.log(`${idPad} | ${passPad} | ${row.failures}`);
  }
  console.log("-".repeat(60));

  const passed = rows.filter((r) => r.pass === "PASS").length;
  const total = rows.length;
  console.log(`\n${passed}/${total} passed. Reports in ${RESULTS_DIR}/\n`);

  if (passed < total) {
    process.exit(1);
  }
}

// Run when executed directly (npm run eval)
if (process.argv[1]?.includes("runner")) {
  runEvalHarness().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
