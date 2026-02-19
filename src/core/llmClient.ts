import OpenAI from "openai";

export type LlmModel = string;

const DEFAULT_MODEL = "gpt-4o-mini";

export async function generateTriageJson(params: {
  model: LlmModel;
  ticketText: string;
  title?: string;
  source: "ticket" | "email";
  tone: "neutral" | "direct";
}): Promise<{ rawJsonText: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to .env or set the environment variable."
    );
  }

  const client = new OpenAI({ apiKey });

  const { buildSystemPrompt, buildUserPrompt } = await import(
    "./prompts.js"
  );

  const response = await client.chat.completions.create({
    model: params.model,
    messages: [
      { role: "system", content: buildSystemPrompt() },
      {
        role: "user",
        content: buildUserPrompt({
          ticketText: params.ticketText,
          title: params.title,
          source: params.source,
          tone: params.tone,
        }),
      },
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No content in LLM response");
  }

  return { rawJsonText: content };
}

const REPAIR_SYSTEM_PROMPT = `You are a JSON repair function. Output ONLY valid JSON matching the schema. No extra keys. Fix type mismatches.

Required shapes:
- questionsToAsk: array of objects { "question": string, "why": string }
- investigationChecklist: array of objects { "item": string, "owner"?: string, "status"?: "todo"|"done"|"blocked" } (min 1 item)
- Arrays must be [] not null
- confidence.* must be numbers 0..1 (not strings)
- suspectedComponent must be string or null`;

export async function repairTriageJson(params: {
  model: LlmModel;
  rawJsonText: string;
  validationErrors: string[];
}): Promise<{ repairedJsonText: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to .env or set the environment variable."
    );
  }

  const client = new OpenAI({ apiKey });

  const userPrompt = `Here is invalid JSON:

${params.rawJsonText}

Here are validation errors:

${params.validationErrors.join("\n")}

Fix so it matches required shapes. Return repaired JSON only.`;

  const response = await client.chat.completions.create({
    model: params.model,
    messages: [
      { role: "system", content: REPAIR_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No content in repair LLM response");
  }

  return { repairedJsonText: content };
}
