"use client";

import { useEffect, useState } from "react";
import { Bot, Copy, Send, Trash2 } from "lucide-react";
import { clearExperimentChats, getExperimentChats, saveExperimentChats } from "@/lib/storage";
import { ExperimentChatMessage, ExperimentRun, ProtocolStep, StepRunLog } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

type Props = {
  run: ExperimentRun;
  currentStep: ProtocolStep;
  currentStepIndex: number;
  currentTimerSeconds: number;
};

export function ExperimentChat({ run, currentStep, currentStepIndex, currentTimerSeconds }: Props) {
  const [open, setOpen] = useState(true);
  const [messages, setMessages] = useState<ExperimentChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setMessages(getExperimentChats(run.id)), [run.id]);

  const send = async () => {
    const content = question.trim();
    if (!content || loading) return;
    const userMessage: ExperimentChatMessage = { id: crypto.randomUUID(), runId: run.id, role: "user", content, createdAt: new Date().toISOString() };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    saveExperimentChats(run.id, nextMessages);
    setQuestion("");
    setLoading(true);
    setError("");

    const previousCompletedSteps = run.stepLogs.filter((step) => step.status === "completed");
    const skippedSteps = run.stepLogs.filter((step) => step.status === "skipped");
    const activeTimers = run.stepLogs.filter((step) => step.timerStartedAt);
    const deviations = run.stepLogs.filter((step) => step.plannedDurationSeconds && step.timerSecondsElapsed !== undefined && Math.abs(step.timerSecondsElapsed - step.plannedDurationSeconds) > 0);

    try {
      const response = await fetch("/api/ai/experiment-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId: run.id,
          question: content,
          protocol: {
            id: run.protocolId,
            title: run.protocolName,
            description: run.protocolDescription,
            version: run.protocolVersion,
            objective: run.protocolObjective,
            steps: run.protocolSteps,
          },
          run,
          currentStep,
          currentStepIndex,
          timerState: { elapsedSeconds: currentTimerSeconds, log: run.stepLogs[currentStepIndex] },
          previousCompletedSteps,
          skippedSteps,
          notesAndObservations: run.stepLogs.map((step: StepRunLog) => ({ stepId: step.stepId, notes: step.notes, observation: step.actualObservation })),
          deviations,
          activeTimers,
          recentMessages: nextMessages.slice(-10),
        }),
      });
      const data = await response.json() as { answer?: string; error?: string };
      if (!response.ok) throw new Error(data.error || "The AI assistant could not answer.");
      const assistantMessage: ExperimentChatMessage = { id: crypto.randomUUID(), runId: run.id, role: "assistant", content: data.answer || "No answer was returned.", createdAt: new Date().toISOString() };
      const completedMessages = [...nextMessages, assistantMessage];
      setMessages(completedMessages);
      saveExperimentChats(run.id, completedMessages);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The AI assistant could not answer.");
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    if (!confirm("Clear the AI chat for this experiment run?")) return;
    clearExperimentChats(run.id);
    setMessages([]);
    setError("");
  };

  return <section className="card mt-5 overflow-hidden">
    <button className="flex w-full items-center justify-between p-5 text-left" onClick={() => setOpen((value) => !value)}>
      <span className="flex items-center gap-3"><Bot className="text-moss" size={21} /><span><span className="label block">Ask AI</span><span className="font-bold">Experiment assistant</span></span></span>
      <span className="text-sm text-slate-500">{open ? "Collapse" : "Open"}</span>
    </button>
    {open && <div className="border-t p-5">
      <p className="mb-4 text-xs text-slate-500">Uses this run's protocol, step, timers, notes, and observations. Always follow your lab SOP and supervisor guidance.</p>
      <div className="max-h-80 space-y-3 overflow-auto">
        {!messages.length && <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">Ask about the current step, an observation, or how to document a deviation.</p>}
        {messages.map((message) => <div key={message.id} className={`rounded-lg p-3 text-sm ${message.role === "user" ? "ml-8 bg-mist" : "mr-8 bg-slate-100"}`}>
          <div className="flex items-start justify-between gap-3"><div><b>{message.role === "user" ? "You" : "AI assistant"}</b><p className="mt-1 whitespace-pre-wrap">{message.content}</p><p className="mt-2 text-[11px] text-slate-400">{formatDateTime(message.createdAt)}</p></div>{message.role === "assistant" && <button title="Copy answer" className="text-moss" onClick={() => navigator.clipboard.writeText(message.content)}><Copy size={15} /></button>}</div>
        </div>)}
        {loading && <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-500">Reviewing the current run context...</p>}
      </div>
      {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="mt-4 flex gap-2">
        <input className="field mt-0" value={question} disabled={loading} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void send(); }} placeholder="Ask about this experiment step..." />
        <button className="btn-primary" disabled={loading || !question.trim()} onClick={() => void send()}><Send size={16} /> Send</button>
      </div>
      {messages.length > 0 && <button className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-red-600" onClick={clear}><Trash2 size={13} /> Clear chat</button>}
    </div>}
  </section>;
}
