"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Plus, Play, Timer } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { createExperiment, loadActiveExperiments } from "@/lib/supabase/experiments";
import { ExperimentRun } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { useProtocols } from "@/lib/use-protocols";

export default function ActiveExperiments() {
  const { user, loading: authLoading } = useAuth();
  const { protocols, loading: protocolsLoading, usingCloud } = useProtocols();
  const [runs, setRuns] = useState<ExperimentRun[]>([]);
  const [selected, setSelected] = useState("");
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user) {
      setRuns([]);
      return;
    }
    setLoadingRuns(true);
    setError("");
    try {
      setRuns(await loadActiveExperiments(user.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load experiments.");
    } finally {
      setLoadingRuns(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  async function start() {
    if (!user) return setError("Login before running an experiment.");
    const protocol = protocols.find((item) => item.id === selected);
    if (!protocol) return;
    setError("");
    try {
      const run = await createExperiment(user.id, protocol);
      location.href = `/run/${run.id}`;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start experiment.");
    }
  }

  if (!authLoading && !user) {
    return <div className="card p-8 text-center"><Timer className="mx-auto text-slate-400" /><p className="mt-3 font-semibold">Login to run experiments.</p><p className="mt-1 text-sm text-slate-500">Experiment history now syncs to Supabase for your authenticated account.</p></div>;
  }

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="label">Active experiments</p>
          <h1 className="mt-1 text-3xl font-bold">Run experiments in parallel.</h1>
          <p className="mt-2 text-xs font-semibold text-slate-500">Protocol source: {usingCloud ? "Supabase cloud" : "browser localStorage"}. Experiment runs sync to Supabase.</p>
        </div>
        <div className="flex gap-2">
          <select className="field mt-0 min-w-48" value={selected} onChange={(event) => setSelected(event.target.value)} disabled={protocolsLoading || !user}>
            <option value="">{protocolsLoading ? "Loading protocols..." : "Choose protocol..."}</option>
            {protocols.map((protocol) => <option key={protocol.id} value={protocol.id}>{protocol.title}</option>)}
          </select>
          <button className="btn-primary" disabled={!selected || !user} onClick={start}><Plus size={17} /> Start run</button>
        </div>
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loadingRuns && <div className="card p-8 text-center text-sm text-slate-500">Loading experiments...</div>}

      {!loadingRuns && !runs.length ? (
        <div className="card py-14 text-center">
          <Timer className="mx-auto text-slate-400" />
          <p className="mt-3 font-semibold">No active experiments.</p>
          <p className="mt-1 text-sm text-slate-500">Start a run above; you can keep several active at once.</p>
        </div>
      ) : !loadingRuns && (
        <div className="grid gap-4 md:grid-cols-2">
          {runs.map((run) => {
            const step = run.protocolSteps[run.currentStepIndex || 0];
            return (
              <Link href={`/run/${run.id}`} key={run.id} className="card p-5 transition hover:border-moss">
                <div className="flex justify-between gap-2"><p className="font-bold">{run.protocolName}</p><span className="rounded-full bg-mist px-2 py-1 text-xs font-semibold text-moss">{run.status}</span></div>
                <p className="mt-3 text-sm text-slate-600">Current: {step?.title || "All steps complete"}</p>
                <p className="mt-3 text-xs text-slate-500">Started {formatDateTime(run.startedAt)}</p>
                <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-moss"><Play size={16} /> Open run</div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
