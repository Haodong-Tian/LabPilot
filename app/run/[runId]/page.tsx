"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, Pause, Play, RotateCcw, SkipForward, Square } from "lucide-react";
import { ExperimentChat } from "@/components/experiment-chat";
import { getReports, getRuns, upsertReport, upsertRun } from "@/lib/storage";
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
  const [run, setRun] = useState<ExperimentRun | null>(null);
  const [clock, setClock] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setClock(Date.now());
    params.then(({ runId }) => setRun(getRuns().find((item) => item.id === runId) || null));
  }, [params]);

  useEffect(() => {
    const id = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!mounted) return <div className="card p-8 text-sm text-slate-500">Loading experiment...</div>;
  if (!run) return <div className="card p-8">Run not found. <Link className="text-moss underline" href="/run">Back to active experiments</Link></div>;

  const index = run.currentStepIndex || 0;
  const step = run.protocolSteps[index];
  const log = run.stepLogs[index];
  if (!step || !log) return <div className="card p-8">This run has no current step. <Link className="text-moss underline" href="/run">Back to active experiments</Link></div>;

  const seconds = elapsed(log, clock);
  const planned = log.plannedDurationSeconds || 0;
  const isLastStep = index === run.stepLogs.length - 1;
  const persist = (next: ExperimentRun) => { setRun(next); upsertRun(next); };
  const updateLog = (patch: Partial<StepRunLog>) => persist({ ...run, updatedAt: new Date().toISOString(), stepLogs: run.stepLogs.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) });

  const startTimer = () => {
    const time = new Date().toISOString();
    persist({ ...run, status: "running", updatedAt: time, stepLogs: run.stepLogs.map((item, itemIndex) => itemIndex === index ? { ...item, status: "in_progress", startedAt: item.startedAt || time, timerStartedAt: time } : item) });
  };

  const pauseTimer = () => {
    const time = new Date().toISOString();
    persist({ ...run, status: "paused", updatedAt: time, stepLogs: run.stepLogs.map((item, itemIndex) => itemIndex === index ? { ...item, status: "paused", timerSecondsElapsed: elapsed(item, Date.now()), timerStartedAt: undefined, timerPausedAt: time } : item) });
  };

  const finishStep = (skip = false) => {
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
      ...run,
      stepLogs: run.stepLogs.map((item, itemIndex) => itemIndex === index ? completedLog : item),
      currentStepIndex: isLastStep ? index : index + 1,
      status: isLastStep ? "completed" : "running",
      endedAt: isLastStep ? time : undefined,
      updatedAt: time,
    };
    persist(next);
    if (isLastStep) {
      let report = getReports().find((item) => item.experimentRunId === run.id);
      if (!report) { report = reportFromRun(next); upsertReport(report); }
      router.push(`/logs?report=${report.id}`);
    }
  };

  const abort = () => {
    if (confirm("Abort this experiment run?")) persist({ ...run, status: "aborted", endedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  };

  return <div className="mx-auto max-w-4xl">
    <div className="mb-5 flex items-center justify-between"><Link className="btn-secondary" href="/run">Active experiments</Link><button className="btn-danger" onClick={abort}><Square size={16} /> Abort run</button></div>
    <div className="card overflow-hidden">
      <div className="p-6">
        <p className="label">{run.protocolName} - Step {index + 1}/{run.protocolSteps.length}</p>
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
    <ExperimentChat run={run} currentStep={step} currentStepIndex={index} currentTimerSeconds={seconds} />
  </div>;
}
