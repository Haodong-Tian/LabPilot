"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, Play, Timer } from "lucide-react";
import { createRun, getActiveRuns, upsertRun } from "@/lib/storage";
import { ExperimentRun } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { useProtocols } from "@/lib/use-protocols";

export default function ActiveExperiments() {
  const { protocols, loading: protocolsLoading, usingCloud } = useProtocols();
  const [runs, setRuns] = useState<ExperimentRun[]>([]);
  const [selected, setSelected] = useState("");

  const load = () => setRuns(getActiveRuns());

  useEffect(() => {
    load();
  }, []);

  function start() {
    const protocol = protocols.find((item) => item.id === selected);
    if (!protocol) return;
    const run = createRun(protocol);
    upsertRun(run);
    location.href = `/run/${run.id}`;
  }

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="label">Active experiments</p>
          <h1 className="mt-1 text-3xl font-bold">Run experiments in parallel.</h1>
          <p className="mt-2 text-xs font-semibold text-slate-500">Protocol source: {usingCloud ? "Supabase cloud" : "browser localStorage"}. Experiment runs remain local in this phase.</p>
        </div>
        <div className="flex gap-2">
          <select className="field mt-0 min-w-48" value={selected} onChange={(event) => setSelected(event.target.value)} disabled={protocolsLoading}>
            <option value="">{protocolsLoading ? "Loading protocols..." : "Choose protocol..."}</option>
            {protocols.map((protocol) => <option key={protocol.id} value={protocol.id}>{protocol.title}</option>)}
          </select>
          <button className="btn-primary" disabled={!selected} onClick={start}><Plus size={17} /> Start run</button>
        </div>
      </div>

      {!runs.length ? (
        <div className="card py-14 text-center">
          <Timer className="mx-auto text-slate-400" />
          <p className="mt-3 font-semibold">No active experiments.</p>
          <p className="mt-1 text-sm text-slate-500">Start a run above; you can keep several active at once.</p>
        </div>
      ) : (
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
