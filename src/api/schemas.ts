import { z } from "zod";
import { TriageResultSchema } from "../core/schemas.js";

export const TriageRequestSchema = z.object({
  title: z.string().min(1).default("Ticket"),
  ticketText: z.string().min(1),
  source: z.enum(["ticket", "email"]).default("ticket"),
  tone: z.enum(["neutral", "direct"]).default("neutral"),
  model: z.string().optional(),
});

export const TraceSchema = z.object({
  runId: z.string(),
  model: z.string(),
  ticketChars: z.number(),
  startedAt: z.string(),
  finishedAt: z.string(),
  flags: z.array(z.string()),
  parseOk: z.boolean(),
  validationErrors: z.array(z.string()).optional(),
  evaluation: z
    .object({
      checklistCount: z.number(),
      questionCount: z.number(),
    })
    .optional(),
});

export const TriageResponseSchema = z.object({
  runId: z.string(),
  result: TriageResultSchema,
  markdown: z.string(),
  trace: TraceSchema,
});

export type TriageRequest = z.infer<typeof TriageRequestSchema>;
export type TriageResponse = z.infer<typeof TriageResponseSchema>;
