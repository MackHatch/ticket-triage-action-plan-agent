export type EvalCase = {
  id: string;
  title: string;
  source: "ticket" | "email";
  tone: "neutral" | "direct";
  ticketText: string;
  expect: {
    ticketType?: string[];
    severity?: string[];
    mustHaveQuestions?: boolean;
    minChecklistItems?: number;
  };
};

export type EvalResult = {
  id: string;
  title: string;
  pass: boolean;
  failures: string[];
  summary: {
    ticketType: string;
    severity: string;
    checklistCount: number;
    questionCount: number;
    flags: string[];
  };
  timestamp: string;
};
