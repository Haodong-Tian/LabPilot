"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { Copy, Heart, Pencil, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { createExperimentReport, deleteExperimentReport, loadExperimentReports, updateExperimentReport } from "@/lib/supabase/experiment-reports";
import { migrateLocalReportsToCloud } from "@/lib/supabase/legacy-migration";
import { LabNotebookReport } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

export default function ReportsPage() {
  return <Suspense fallback={<div className="card p-8 text-center text-sm text-slate-500">Loading reports...</div>}><ReportsContent /></Suspense>;
}

function ReportsContent() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const requestedReportId = searchParams.get("report");
  const [reports, setReports] = useState<LabNotebookReport[]>([]);
  const [selected, setSelected] = useState<LabNotebookReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [migrationMessage, setMigrationMessage] = useState("");

  const refresh = useCallback(async () => {
    if (!user) {
      setReports([]);
      setSelected(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const loaded = await loadExperimentReports(user.id);
      setReports(loaded);
      setSelected((current) => loaded.find((report) => report.id === requestedReportId) || loaded.find((report) => report.id === current?.id) || loaded[0] || null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load reports.");
    } finally {
      setLoading(false);
    }
  }, [requestedReportId, user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    migrateLocalReportsToCloud(user.id)
      .then((result) => {
        if (!active) return;
        if (result.migrated) setMigrationMessage(`Imported ${result.migrated} local report${result.migrated === 1 ? "" : "s"} to Supabase.`);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not migrate local reports.");
      })
      .finally(() => {
        if (active) refresh();
      });

    return () => {
      active = false;
    };
  }, [authLoading, refresh, user]);

  async function rename(report: LabNotebookReport) {
    if (!user) return;
    const title = prompt("Report title", report.title);
    if (!title?.trim()) return;
    const next = await updateExperimentReport(user.id, { ...report, title: title.trim(), updatedAt: new Date().toISOString() });
    setSelected(next);
    await refresh();
  }

  async function remove(report: LabNotebookReport) {
    if (!user || !confirm(`Delete "${report.title}"?`)) return;
    await deleteExperimentReport(user.id, report.id);
    const next = reports.filter((item) => item.id !== report.id);
    setReports(next);
    setSelected(next[0] || null);
  }

  async function duplicate(report: LabNotebookReport) {
    if (!user) return;
    const next = await createExperimentReport(user.id, { ...report, id: crypto.randomUUID(), title: `${report.title} (copy)`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    setSelected(next);
    await refresh();
  }

  async function favorite(report: LabNotebookReport) {
    if (!user) return;
    const next = await updateExperimentReport(user.id, { ...report, isFavorite: !report.isFavorite, updatedAt: new Date().toISOString() });
    setSelected(next);
    await refresh();
  }

  if (!authLoading && !user) {
    return <div><div className="mb-8"><p className="label">Experiment reports</p><h1 className="mt-1 text-3xl font-bold">Lab notebook archive</h1></div><div className="card py-16 text-center"><p className="font-semibold">Login to view reports.</p><p className="mt-1 text-sm text-slate-500">Experiment reports now sync to Supabase for your authenticated account.</p></div></div>;
  }

  return <div><div className="mb-8"><p className="label">Experiment reports</p><h1 className="mt-1 text-3xl font-bold">Lab notebook archive</h1></div>{error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}{migrationMessage && <p className="mb-4 rounded-lg bg-mist p-3 text-sm text-moss">{migrationMessage}</p>}{loading ? <div className="card p-8 text-center text-sm text-slate-500">Loading reports...</div> : !reports.length ? <div className="card py-16 text-center"><p className="font-semibold">No reports yet.</p><p className="mt-1 text-sm text-slate-500">Complete an experiment to add its notebook report here.</p></div> : <div className="grid gap-5 lg:grid-cols-[320px_1fr]"><aside className="space-y-2">{reports.map((report) => <button key={report.id} onClick={() => setSelected(report)} className={`card w-full p-4 text-left ${selected?.id === report.id ? "border-moss ring-1 ring-moss" : ""}`}><p className="font-semibold">{report.isFavorite && "* "}{report.title}</p><p className="mt-1 text-xs text-slate-500">{formatDateTime(report.updatedAt)}</p></button>)}</aside>{selected && <section className="card overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b p-5"><div><p className="label">Report details</p><h2 className="text-xl font-bold">{selected.title}</h2></div><div className="flex flex-wrap gap-2"><button className="btn-secondary" onClick={() => navigator.clipboard.writeText(selected.markdown)}><Copy size={16} /> Copy</button><button className="btn-secondary" onClick={() => favorite(selected)}><Heart size={16} fill={selected.isFavorite ? "currentColor" : "none"} /></button><button className="btn-secondary" onClick={() => rename(selected)}><Pencil size={16} /> Rename</button><button className="btn-danger" onClick={() => remove(selected)}><Trash2 size={16} /> Delete</button></div></div><pre className="max-h-[700px] overflow-auto whitespace-pre-wrap p-5 font-mono text-sm leading-6">{selected.markdown}</pre><div className="border-t p-4"><button className="btn-secondary" onClick={() => duplicate(selected)}>Duplicate report</button></div></section>}</div>}</div>;
}
