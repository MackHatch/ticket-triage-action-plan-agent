/**
 * Demo runner: runs the CLI twice (good ticket + vague ticket).
 * Exits non-zero if either run fails.
 * Works on Windows PowerShell.
 */
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

function runCli(ticketPath, title, tone, label) {
  console.log(`\n=== ${label} ===\n`);
  const result = spawnSync(
    "npm",
    ["run", "dev", "--", ticketPath, "--title", title, "--tone", tone],
    {
      stdio: "inherit",
      cwd: rootDir,
      shell: true,
    }
  );
  return result.status;
}

console.log("Ticket Triage Agent — Demo\n");

const code1 = runCli(
  "tickets/sample_ticket_good.txt",
  "Payments stuck after submit",
  "direct",
  "1. Good ticket (clear bug report)"
);

const code2 = runCli(
  "tickets/sample_ticket_vague.txt",
  "Student can't access application",
  "neutral",
  "2. Vague ticket (missing details)"
);

if (code1 !== 0 || code2 !== 0) {
  console.error("\nDemo failed: one or both runs exited with an error.");
  process.exit(1);
}

console.log("\n--- Demo complete ---");
