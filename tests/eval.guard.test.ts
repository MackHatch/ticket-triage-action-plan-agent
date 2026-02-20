import { describe, it, expect } from "vitest";
import { runEvalHarness } from "../src/eval/runner.js";

describe("eval guard", () => {
  it("throws when RUN_EVALS is not set", async () => {
    const prev = process.env.RUN_EVALS;
    delete process.env.RUN_EVALS;

    await expect(runEvalHarness()).rejects.toThrow(
      "Eval harness requires RUN_EVALS=1"
    );

    process.env.RUN_EVALS = prev;
  });

  it("throws when RUN_EVALS is not 1", async () => {
    const prev = process.env.RUN_EVALS;
    process.env.RUN_EVALS = "0";

    await expect(runEvalHarness()).rejects.toThrow(
      "Eval harness requires RUN_EVALS=1"
    );

    process.env.RUN_EVALS = prev;
  });
});
