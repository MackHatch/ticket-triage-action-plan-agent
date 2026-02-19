import { describe, it, expect } from "vitest";
import { TriageResultSchema } from "../src/core/schemas.js";

const validSample = {
  title: "Login fails with 500 error",
  ticketType: "bug" as const,
  severity: "sev1" as const,
  summary: "Users cannot log in when submitting credentials.",
  userImpact: "All users attempting login are blocked.",
  suspectedComponent: null as string | null,
  observedBehavior: "API returns 500 Internal Server Error.",
  expectedBehavior: "User is authenticated and redirected to dashboard.",
  investigationChecklist: [{ item: "Check auth service logs", status: "todo" as const }],
  requesterReply: { subject: "Re: Login issue", body: "We are investigating." },
  confidence: {
    classification: 0.9,
    investigationPlan: 0.8,
    responseDraft: 0.7,
  },
  meta: { source: "ticket" as const, generatedAt: "2025-01-15T12:00:00.000Z" },
};

describe("TriageResultSchema", () => {
  it("parses valid sample", () => {
    const result = TriageResultSchema.safeParse(validSample);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Login fails with 500 error");
      expect(result.data.severity).toBe("sev1");
      expect(result.data.investigationChecklist).toHaveLength(1);
      expect(result.data.reproSteps).toEqual([]);
      expect(result.data.questionsToAsk).toEqual([]);
    }
  });

  it("rejects invalid severity", () => {
    const result = TriageResultSchema.safeParse({
      ...validSample,
      severity: "sev5",
    });
    expect(result.success).toBe(false);
  });

  it("rejects confidence > 1", () => {
    const result = TriageResultSchema.safeParse({
      ...validSample,
      confidence: {
        classification: 1.1,
        investigationPlan: 0.8,
        responseDraft: 0.7,
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty investigationChecklist", () => {
    const result = TriageResultSchema.safeParse({
      ...validSample,
      investigationChecklist: [],
    });
    expect(result.success).toBe(false);
  });

  it("applies defaults for optional arrays", () => {
    const result = TriageResultSchema.safeParse(validSample);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reproSteps).toEqual([]);
      expect(result.data.questionsToAsk).toEqual([]);
      expect(result.data.proposedFixPlan).toEqual([]);
      expect(result.data.acceptanceCriteria).toEqual([]);
    }
  });

  it("applies default status for checklist items", () => {
    const result = TriageResultSchema.safeParse({
      ...validSample,
      investigationChecklist: [{ item: "Check logs" }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.investigationChecklist[0].status).toBe("todo");
    }
  });
});
