import { readFile } from "fs/promises";

export async function readTextFile(path: string): Promise<string> {
  try {
    return await readFile(path, "utf-8");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to read file "${path}": ${msg}`);
  }
}
