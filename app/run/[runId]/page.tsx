"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, Pause, Play, RotateCcw, SkipForward, Square } from "lucide-react";
import { ExperimentChat } from "@/components/experiment-chat";
import { useAuth } from "@/components/auth-provider";
import { createExperimentReport, findReportByExperiment } from "@/lib/supabase/experiment-reports";
import { loadExperiment, updateExperiment } from "@/lib/supabase/experiments";
import { reportFromRun } from "@/lib/report";
import { ExperimentRun, StepRunLog } from "@/lib/types";
import { formatDuration } from "@/lib/utils";

const elapsed = (log: StepRunLog, clock: number) => {
  const saved = log.timerSecondsElapsed || 0;
  if (!log.timerStartedAt) return saved;
  return saved + Math.max(0, Math.floor((clock - new Date(log.timerStartedAt).getTime()) / 1000));
};

export default function Runner({ params }: { params: Promise<{ runId: string }> }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [runId, setRunId] = useState("");
  const [run, setRun] = useState<ExperimentRun | null>(null);
  const [clock, setClock] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    params.then(({ runId }) => setRunId(runId));
  }, [params]);

  useEffect(() => {
    setClock(Date.now());
    const id = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (authLoading || !runId) return;
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    loadExperiment(user.id, runId)
      .then(setRun)
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Could not load experiment."))
      .finally(() => setLoading(false));
  }, [authLoading, runId, user]);

  if (authLoading || loading) return <div className="card p-8 text-sm text-slate-500">Loading experiment...</div>;
  if (!user) return <div className="card p-8">Login to open this experiment. <Link className="text-moss underline" href="/run">Back to active experiments</Link></div>;
  if (error) return <div className="card p-8 text-red-700">{error}</div>;
  if (!run) return <div className="card p-8">Run not found. <Link className="text-moss underline" href="/run">Back to active experiments</Link></div>;

  const currentUser = user;
  const currentRun = run;
  const index = currentRun.currentStepIndex || 0;
  const step = currentRun.protocolSteps[index];
  const log = currentRun.stepLogs[index];
  if (!step || !log) return <div className="card p-8">This run has no current step. <Link className="text-moss underline" href="/run">Back to active experiments</Link></div>;

  const seconds = elapsed(log, clock);
  const planned = log.plannedDurationSeconds || 0;
  const isLastStep = index === currentRun.stepLogs.length - 1;

  async function persist(next: ExperimentRun) {
    setRun(next);
    setError("");
    try {
      const saved = await updateExperiment(currentUser.id, next);
      setRun(saved);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save experiment.");
    }
  }

  function updateLog(patch: Partial<StepRunLog>) {
    void persist({ ...currentRun, updatedAt: new Date().toISOString(), stepLogs: currentRun.stepLogs.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) });
  }

  function startTimer() {
    const time = new Date().toISOString();
    void persist({ ...currentRun, status: "running", updatedAt: time, stepLogs: currentRun.stepLogs.map((item, itemIndex) => itemIndex === index ? { ...item, status: "in_progress", startedAt: item.startedAt || time, timerStartedAt: time } : item) });
  }

  function pauseTimer() {
    const time = new Date().toISOString();
    void persist({ ...currentRun, status: "paused", updatedAt: time, stepLogs: currentRun.stepLogs.map((item, itemIndex) => itemIndex === index ? { ...item, status: "paused", timerSecondsElapsed: elapsed(item, Date.now()), timerStartedAt: undefined, timerPausedAt: time } : item) });
  }

  async function finishStep(skip = false) {
    const time = new Date().toISOString();
    const completedLog: StepRunLog = {
      ...log,
      status: skip ? "skipped" : "completed",
      startedAt: log.startedAt || time,
      completedAt: time,
      skippedAt: skip ? time : undefined,
      timerSecondsElapsed: elapsed(log, Date.now()),
      timerStartedAt: undefined,
      actualDurationSeconds: log.startedAt ? Math.round((Date.now() - new Date(log.startedAt).getTime()) / 1000) : 0,
    };
    const next: ExperimentRun = {
      ...currentRun,
      stepLogs: currentRun.stepLogs.map((item, itemIndex) => itemIndex === index ? completedLog : item),
      currentStepIndex: isLastStep ? index : index + 1,
      status: isLastStep ? "completed" : "running",
      endedAt: isLastStep ? time : undefined,
      updatedAt: time,
    };
    await persist(next);
    if (isLastStep) {
      const existing = await findReportByExperiment(currentUser.id, next.id);
      const report = existing || await createExperimentReport(currentUser.id, reportFromRun(next));
      router.push(`/logs?report=${report.id}`);
    }
  }

  function abort() {
    if (confirm("Abort this experiment run?")) void persist({ ...currentRun, status: "aborted", endedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }

  return <div className="mx-auto max-w-4xl">
    <div className="mb-5 flex items-center justify-between"><Link className="btn-secondary" href="/run">Active experiments</Link><button className="btn-danger" onClick={abort}><Square size={16} /> Abort run</button></div>
    {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="card overflow-hidden">
      <div className="p-6">
        <p className="label">{currentRun.protocolName} - Step {index + 1}/{currentRun.protocolSteps.length}</p>
        <h1 className="mt-1 text-2xl font-bold">{step.title}</h1>
        <p className="mt-4 text-lg text-slate-700">{step.instruction}</p>
        {step.materials.length > 0 && <p className="mt-4 text-sm text-slate-600"><b>Materials: </b>{step.materials.join(", ")}</p>}
        {step.warning && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><b>Warning: </b>{step.warning}</p>}
        {step.expectedObservation && <p className="mt-3 rounded-lg bg-mist p-3 text-sm"><b>Expected observation: </b>{step.expectedObservation}</p>}
      </div>
      <div className="border-y bg-slate-50 p-6 text-center">
        <p className="label">Independent step timer</p>
        <div className="mt-2 font-mono text-5xl font-bold">{formatDuration(seconds)}</div>
        {planned > 0 && <p className="mt-1 text-xs text-slate-500">Planned: {formatDuration(planned)}</p>}
        <div className="mt-5 flex justify-center gap-2"><button className="btn-primary" onClick={startTimer}><Play size={16} /> {log.timerStartedAt ? "Running" : "Start / resume"}</button>{log.timerStartedAt && <button className="btn-secondary" onClick={pauseTimer}><Pause size={16} /> Pause</button>}<button className="btn-secondary" onClick={() => updateLog({ timerSecondsElapsed: 0, timerStartedAt: undefined, timerPausedAt: undefined })}><RotateCcw size={16} /> Reset</button></div>
      </div>
      <div className="space-y-4 p-6">
        <label><span className="label">Notes</span><textarea className="field min-h-20" value={log.notes || ""} onChange={(event) => updateLog({ notes: event.target.value })} /></label>
        <label><span className="label">Actual observation</span><textarea className="field min-h-20" value={log.actualObservation || ""} onChange={(event) => updateLog({ actualObservation: event.target.value })} /></label>
        {(step.userInputFields || []).map((field) => <label key={field.id}><span className="label">{field.label}</span><input className="field" placeholder={field.placeholder} value={log.userInputs?.[field.id] || ""} onChange={(event) => updateLog({ userInputs: { ...log.userInputs, [field.id]: event.target.value } })} /></label>)}
        <div className="flex gap-3"><button className="btn-primary flex-1" onClick={() => finishStep()}><Check size={18} /> {isLastStep ? "Finish Experiment" : "Continue"}</button><button className="btn-secondary" onClick={() => finishStep(true)}><SkipForward size={18} /> Skip</button></div>
      </div>
    </div>
    <ExperimentChat run={currentRun} currentStep={step} currentStepIndex={index} currentTimerSeconds={seconds} />
  </div>;
}
