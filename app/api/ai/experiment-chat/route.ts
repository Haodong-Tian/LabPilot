import { NextResponse } from "next/server";
import { ExperimentChatMessage, ExperimentRun, Protocol, ProtocolStep, StepRunLog } from "@/lib/types";

type ChatRequest = {
  runId?: string;
  question?: string;
  protocol?: Protocol;
  run?: ExperimentRun;
  currentStep?: ProtocolStep | null;
  currentStepIndex?: number;
  timerState?: unknown;
  previousCompletedSteps?: StepRunLog[];
  skippedSteps?: StepRunLog[];
  notesAndObservations?: unknown;
  deviations?: StepRunLog[];
  activeTimers?: StepRunLog[];
  recentMessages?: ExperimentChatMessage[];
};

export async function POST(request: Request) {
  try {
    const body = await request.json() as ChatRequest;
    if (!body.runId || !body.question?.trim() || !body.run) {
      return NextResponse.json({ error: "The run ID, question, and current run context are required." }, { status: 400 });
    }
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 500 });
    }

    const context = {
      protocol: body.protocol,
      currentStepIndex: body.currentStepIndex,
      currentStep: body.currentStep,
      currentStepTimer: body.timerState,
      completedSteps: body.previousCompletedSteps,
      skippedSteps: body.skippedSteps,
      notesAndObservations: body.notesAndObservations,
      timerDeviations: body.deviations,
      activeTimers: body.activeTimers,
      runStatus: body.run.status,
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: process.env.OPENAI_CHAT_MODEL || "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: "You are LabPilot's concise, cautious experiment assistant. Base answers on the provided protocol and run context. Explicitly distinguish protocol facts, the user's recorded observations, and general troubleshooting suggestions. Never invent quantities, timings, temperatures, or safety-critical steps. Do not override laboratory SOPs or supervisor instructions. Ask a clarifying question when context is ambiguous. Recommend documenting deviations when relevant. Never modify run or protocol state.",
          },
          ...(body.recentMessages || []).slice(-8, -1).map((message) => ({ role: message.role, content: message.content })),
          { role: "user", content: `Current experiment context:\n${JSON.stringify(context)}\n\nQuestion: ${body.question.trim()}` },
        ],
      }),
    });
    const rawResponse = await response.text();
    let data: { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } } = {};
    try { data = JSON.parse(rawResponse) as typeof data; }
    catch {
      if (!response.ok) {
        return NextResponse.json({ error: `OpenAI returned HTTP ${response.status} without a readable error message.` }, { status: 502 });
      }
      return NextResponse.json({ error: "OpenAI returned an unreadable response." }, { status: 502 });
    }
    if (!response.ok) return NextResponse.json({ error: data.error?.message || `OpenAI returned HTTP ${response.status}.` }, { status: 502 });
    return NextResponse.json({ answer: data.choices?.[0]?.message?.content || "No answer was returned." });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Unknown server error";
    const friendly = message === "fetch failed"
      ? "Could not connect to the OpenAI API. Check your network, proxy, or firewall, then try again."
      : `The AI assistant could not process this request: ${message}`;
    console.error("LabPilot experiment chat failed:", cause);
    return NextResponse.json({ error: friendly }, { status: 500 });
  }
}
