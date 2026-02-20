import type { FastifyInstance } from "fastify";
import { TriageRequestSchema } from "./schemas.js";
import {
  runTicketTriageAgent,
  TriageValidationError,
} from "../core/orchestrator.js";

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  app.post("/triage", async (request, reply) => {
    const parsed = TriageRequestSchema.safeParse(request.body);

    if (!parsed.success) {
      const details = parsed.error.errors.map(
        (e) => `${e.path.join(".")}: ${e.message}`
      );
      return reply.status(400).send({
        error: "Invalid request",
        details,
      });
    }

    const { title, ticketText, source, tone, model } = parsed.data;

    try {
      const { result, markdown, runId, trace } =
        await runTicketTriageAgent({
          ticketText,
          title,
          source,
          tone,
          model,
        });

      return reply.status(200).send({
        runId,
        result,
        markdown,
        trace,
      });
    } catch (err) {
      if (err instanceof TriageValidationError) {
        return reply.status(422).send({
          error: "Model output validation failed",
          details: err.trace.validationErrors ?? [],
          runId: err.runId,
          trace: err.trace,
        });
      }
      return reply.status(500).send({
        error: "Internal error",
      });
    }
  });
}
