import { z } from "zod";

// Enums
export const TicketTypeSchema = z.enum(["bug", "feature", "data", "support"]);
export const SeveritySchema = z.enum(["sev0", "sev1", "sev2", "sev3"]);

// Question
export const QuestionSchema = z.object({
  question: z.string().min(1),
  why: z.string().min(1),
});

// Checklist item
export const ChecklistItemSchema = z.object({
  item: z.string().min(1),
  owner: z.string().optional(),
  status: z.enum(["todo", "done", "blocked"]).default("todo"),
});

// Acceptance criterion
export const AcceptanceCriterionSchema = z.object({
  criterion: z.string().min(1),
});

// Confidence scores (0..1)
export const ConfidenceSchema = z.object({
  classification: z.number().min(0).max(1),
  investigationPlan: z.number().min(0).max(1),
  responseDraft: z.number().min(0).max(1),
});

// Triage result
export const TriageResultSchema = z.object({
  title: z.string().min(1),
  ticketType: TicketTypeSchema,
  severity: SeveritySchema,
  summary: z.string().min(1),
  userImpact: z.string().min(1),
  reproSteps: z.array(z.string()).default([]),
  observedBehavior: z.string().min(1),
  expectedBehavior: z.string().min(1),
  suspectedComponent: z.string().nullable(),
  questionsToAsk: z.array(QuestionSchema).default([]),
  investigationChecklist: z.array(ChecklistItemSchema).min(1),
  proposedFixPlan: z.array(z.string()).default([]),
  acceptanceCriteria: z.array(AcceptanceCriterionSchema).default([]),
  requesterReply: z.object({
    subject: z.string().min(1),
    body: z.string().min(1),
  }),
  confidence: ConfidenceSchema,
  meta: z.object({
    source: z.enum(["ticket", "email"]),
    generatedAt: z.string().min(1),
  }),
});

// Inferred types
export type TicketType = z.infer<typeof TicketTypeSchema>;
export type Severity = z.infer<typeof SeveritySchema>;
export type TriageResult = z.infer<typeof TriageResultSchema>;
export type Confidence = z.infer<typeof ConfidenceSchema>;
