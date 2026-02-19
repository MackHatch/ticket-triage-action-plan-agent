import { describe, it, expect } from "vitest";
import { renderMarkdown } from "../src/core/renderer.js";
import type { TriageResult } from "../src/core/schemas.js";

const validResult: TriageResult = {
  title: "Login fails with 500 error",
  ticketType: "bug",
  severity: "sev1",
  summary: "Users cannot log in when submitting credentials.",
  userImpact: "All users attempting login are blocked.",
  reproSteps: ["Navigate to /login", "Enter credentials", "Click Sign in"],
  observedBehavior: "API returns 500 Internal Server Error.",
  expectedBehavior: "User is authenticated and redirected to dashboard.",
  suspectedComponent: "auth-service",
  questionsToAsk: [
    { question: "When did this start?", why: "Identify deployment window." },
  ],
  investigationChecklist: [
    { item: "Check auth service logs", owner: "DevOps", status: "todo" },
    { item: "Verify DB connectivity", status: "done" },
  ],
  proposedFixPlan: ["Restart auth pods", "Rollback if needed"],
  acceptanceCriteria: [
    { criterion: "Login returns 200 for valid credentials" },
    { criterion: "User sees dashboard after login" },
  ],
  requesterReply: {
    subject: "Re: Login issue — investigating",
    body: "We are looking into the auth service. ETA for update: 2 hours.",
  },
  confidence: {
    classification: 0.9,
    investigationPlan: 0.8,
    responseDraft: 0.7,
  },
  meta: { source: "ticket", generatedAt: "2025-01-15T12:00:00.000Z" },
};

describe("renderMarkdown", () => {
  it("renders valid TriageResult to Markdown", () => {
    const md = renderMarkdown(validResult);
    expect(md).toContain("# Login fails with 500 error");
    expect(md).toContain("Type: bug | Severity: sev1");
    expect(md).toContain("Component: auth-service");
    expect(md).toContain("Generated: 2025-01-15T12:00:00.000Z");
    expect(md).toContain("## Summary");
    expect(md).toContain("## User Impact");
    expect(md).toContain("**Observed:** API returns 500");
    expect(md).toContain("**Expected:** User is authenticated");
    expect(md).toContain("- Navigate to /login");
    expect(md).toContain("- Q: When did this start?");
    expect(md).toContain("- [ ] Check auth service logs (Owner: DevOps) (Status: todo)");
    expect(md).toContain("- [x] Verify DB connectivity (Status: done)");
    expect(md).toContain("- Restart auth pods");
    expect(md).toContain("- Login returns 200 for valid credentials");
    expect(md).toContain("**Subject:** Re: Login issue — investigating");
  });

  it("handles null suspectedComponent", () => {
    const result = { ...validResult, suspectedComponent: null };
    const md = renderMarkdown(result);
    expect(md).toContain("Component: Unclear");
  });

  it("matches inline snapshot", () => {
    const md = renderMarkdown(validResult);
    expect(md).toMatchInlineSnapshot(`
      "# Login fails with 500 error

      Type: bug | Severity: sev1
      Component: auth-service
      Generated: 2025-01-15T12:00:00.000Z

      ## Summary
      Users cannot log in when submitting credentials.

      ## User Impact
      All users attempting login are blocked.

      ## Observed vs Expected
      **Observed:** API returns 500 Internal Server Error.
      **Expected:** User is authenticated and redirected to dashboard.

      ## Repro Steps
      - Navigate to /login
      - Enter credentials
      - Click Sign in

      ## Questions to Ask
      - Q: When did this start? (Why: Identify deployment window.)

      ## Investigation Checklist
      - [ ] Check auth service logs (Owner: DevOps) (Status: todo)
      - [x] Verify DB connectivity (Status: done)

      ## Proposed Fix Plan
      - Restart auth pods
      - Rollback if needed

      ## Acceptance Criteria
      - Login returns 200 for valid credentials
      - User sees dashboard after login

      ## Reply Draft
      **Subject:** Re: Login issue — investigating

      We are looking into the auth service. ETA for update: 2 hours.
      "
    `);
  });
});
