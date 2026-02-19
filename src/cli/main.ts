import "dotenv/config";
import { mkdir, writeFile } from "fs/promises";
import { join, resolve } from "path";
import { readTextFile } from "../tools/fileLoader.js";
import {
  runTicketTriageAgent,
  TriageValidationError,
} from "../core/orchestrator.js";
import { writeTrace } from "../core/trace.js";

const OUTPUTS_DIR = "outputs";
const DEFAULTS = {
  title: "Ticket",
  tone: "neutral" as const,
  source: "ticket" as const,
  model: "gpt-4o-mini",
};

function parseArgs(argv: string[]): {
  ticketPath: string;
  title: string;
  tone: "neutral" | "direct";
  source: "ticket" | "email";
  model: string;
} {
  const args = argv.slice(2);
  let ticketPath = "";
  let title = DEFAULTS.title;
  let tone: "neutral" | "direct" = DEFAULTS.tone;
  let source: "ticket" | "email" = DEFAULTS.source;
  let model = DEFAULTS.model;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--title" && args[i + 1]) {
      title = args[++i];
    } else if (arg === "--tone" && args[i + 1]) {
      const t = args[++i];
      if (t === "neutral" || t === "direct") tone = t as "neutral" | "direct";
    } else if (arg === "--source" && args[i + 1]) {
      const s = args[++i];
      if (s === "ticket" || s === "email") source = s as "ticket" | "email";
    } else if (arg === "--model" && args[i + 1]) {
      model = args[++i];
    } else if (!arg.startsWith("--") && !ticketPath) {
      ticketPath = arg;
    }
  }

  return { ticketPath, title, tone, source, model };
}

async function main(): Promise<void> {
  const { ticketPath, title, tone, source, model } = parseArgs(
    process.argv
  );

  if (!ticketPath) {
    console.error(
      "Usage: npm run dev -- <path-to-ticket.txt> [--title \"...\"] [--tone neutral|direct] [--source ticket|email] [--model ...]"
    );
    console.error("Example: npm run dev -- tickets/sample_ticket_good.txt --title \"Payments stuck\" --tone direct");
    process.exit(1);
  }

  const resolvedPath = resolve(ticketPath);

  let ticketText: string;
  try {
    ticketText = await readTextFile(resolvedPath);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }

  try {
    await mkdir(OUTPUTS_DIR, { recursive: true });
  } catch (err) {
    console.error("Failed to create outputs directory:", err);
    process.exit(1);
  }

  try {
    const { result, markdown, runId, trace, rawModelJson, repairedModelJson } =
      await runTicketTriageAgent({
        ticketText,
        title,
        source,
        tone,
        model,
      });

    const outDir = resolve(OUTPUTS_DIR);

    await writeTrace(outDir, runId, trace);
    await writeFile(
      join(outDir, `${runId}.triage.json`),
      JSON.stringify(result, null, 2),
      "utf-8"
    );
    await writeFile(
      join(outDir, `${runId}.triage.md`),
      markdown,
      "utf-8"
    );
    await writeFile(
      join(outDir, `${runId}.raw.json`),
      rawModelJson,
      "utf-8"
    );
    if (repairedModelJson !== null) {
      await writeFile(
        join(outDir, `${runId}.repaired.raw.json`),
        repairedModelJson,
        "utf-8"
      );
    }

    const triagePath = join(outDir, `${runId}.triage.json`);
    const mdPath = join(outDir, `${runId}.triage.md`);
    const rawPath = join(outDir, `${runId}.raw.json`);
    const tracePath = join(outDir, `${runId}.trace.json`);

    console.log("Written:");
    console.log(`  ${triagePath}`);
    console.log(`  ${mdPath}`);
    console.log(`  ${rawPath}`);
    if (repairedModelJson !== null) {
      console.log(`  ${join(outDir, `${runId}.repaired.raw.json`)}`);
    }
    console.log(`  ${tracePath}`);
    if (trace.flags.length > 0) {
      console.log("Flags:", trace.flags.join(", "));
    }
    if (trace.flags.includes("REPAIRED_OUTPUT")) {
      console.log("Repair: occurred (output was repaired from invalid initial response)");
    }
  } catch (err) {
    if (err instanceof TriageValidationError) {
      const outDir = resolve(OUTPUTS_DIR);
      await writeTrace(outDir, err.runId, err.trace);
      console.error(err.message);
      if (err.validationErrors?.length) {
        console.error("Validation errors:");
        err.validationErrors.forEach((e) => console.error(`  - ${e}`));
      }
      console.error(`Trace written: ${join(outDir, `${err.runId}.trace.json`)}`);
    } else {
      console.error(err instanceof Error ? err.message : err);
    }
    process.exit(1);
  }
}

main();
