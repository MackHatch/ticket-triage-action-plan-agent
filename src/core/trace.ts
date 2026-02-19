import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

export type Trace = {
  runId: string;
  model: string;
  ticketChars: number;
  startedAt: string;
  finishedAt: string;
  flags: string[];
  parseOk: boolean;
  validationErrors?: string[];
  evaluation?: {
    checklistCount: number;
    questionCount: number;
  };
};

export function newRunId(): string {
  return `run_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function writeTrace(
  outDir: string,
  runId: string,
  trace: Trace
): Promise<void> {
  await mkdir(outDir, { recursive: true });
  const path = join(outDir, `${runId}.trace.json`);
  await writeFile(path, JSON.stringify(trace, null, 2), "utf-8");
}
