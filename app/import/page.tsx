"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Upload } from "lucide-react";
import { createId } from "@/lib/storage";
import { ProtocolDraft, ProtocolImportSource, ProtocolStep } from "@/lib/types";
import { useProtocols } from "@/lib/use-protocols";

const sources: Array<{ value: ProtocolImportSource; label: string; accept?: string }> = [
  { value: "text", label: "Paste text" },
  { value: "pdf", label: "PDF", accept: "application/pdf" },
  { value: "word", label: "Word document", accept: ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  { value: "image", label: "Image / photo", accept: "image/png,image/jpeg,image/webp" },
];

const maxBytes = 10 * 1024 * 1024;

function normalize(value: unknown, sourceType: ProtocolImportSource, sourceText?: string, sourceName?: string): ProtocolDraft {
  const input = (value && typeof value === "object" ? value : {}) as Partial<ProtocolDraft>;
  const time = new Date().toISOString();
  const steps = Array.isArray(input.steps) ? input.steps.map((entry): ProtocolStep => {
    const step = (entry && typeof entry === "object" ? entry : {}) as Partial<ProtocolStep>;
    return {
      id: createId(),
      title: step.title || "Needs review",
      instruction: step.instruction || "",
      materials: Array.isArray(step.materials) ? step.materials.filter((item): item is string => typeof item === "string") : [],
      timerMinutes: typeof step.timerMinutes === "number" ? step.timerMinutes : undefined,
      warning: step.warning,
      expectedObservation: step.expectedObservation,
      userInputFields: Array.isArray(step.userInputFields) ? step.userInputFields : [],
    };
  }) : [];

  return {
    id: createId(),
    title: input.title || "Imported protocol - needs review",
    description: input.description || "",
    version: input.version || "0.1",
    objective: input.objective || "",
    createdAt: time,
    updatedAt: time,
    steps,
    sourceType,
    sourceText,
    sourceName,
  };
}

export default function ImportProtocol() {
  const { saveProtocol, usingCloud } = useProtocols();
  const [type, setType] = useState<ProtocolImportSource>("text");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [extracted, setExtracted] = useState("");
  const [draft, setDraft] = useState<ProtocolDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const current = sources.find((source) => source.value === type);

  function chooseFile(chosen: File | null) {
    setError("");
    setFile(null);
    if (!chosen) return;
    if (chosen.size > maxBytes) return setError("File must be 10 MB or smaller.");
    const valid = type === "pdf" ? chosen.type === "application/pdf" : type === "word" ? chosen.name.toLowerCase().endsWith(".docx") : ["image/png", "image/jpeg", "image/webp"].includes(chosen.type);
    if (!valid) return setError("That file type does not match the selected import option.");
    setFile(chosen);
  }

  async function submit() {
    setLoading(true);
    setError("");
    try {
      let response: Response;
      if (type === "text") {
        response = await fetch("/api/ai/import-protocol", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, sourceType: type }) });
      } else {
        if (!file) throw new Error("Choose a file before importing.");
        const form = new FormData();
        form.append("file", file);
        response = await fetch("/api/ai/import-file", { method: "POST", body: form });
      }

      const data = await response.json() as { draft?: unknown; error?: string; extractedText?: string; sourceName?: string };
      if (!response.ok) throw new Error(data.error || "Import failed.");
      const sourceText = data.extractedText || text;
      setExtracted(sourceText);
      setDraft(normalize(data.draft, type, sourceText, data.sourceName || file?.name));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Import failed.");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    setError("");
    try {
      const saved = await saveProtocol({ ...draft, updatedAt: new Date().toISOString() });
      location.href = `/protocols/${saved.id}`;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save protocol.");
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <p className="label">AI protocol import</p>
      <h1 className="mt-1 text-3xl font-bold">Create a reviewable protocol draft.</h1>
      <p className="mt-2 text-slate-600">Files are processed in memory and are never saved. Review before saving.</p>
      <p className="mt-2 text-xs font-semibold text-slate-500">{usingCloud ? "Saving imported protocols to Supabase cloud." : "Saving imported protocols to browser localStorage."}</p>

      <div className="card mt-6 p-6">
        <div className="flex flex-wrap gap-2">
          {sources.map((source) => <button key={source.value} className={type === source.value ? "btn-primary" : "btn-secondary"} onClick={() => { setType(source.value); setFile(null); setError(""); }}>{source.label}</button>)}
        </div>
        {type === "text" ? (
          <textarea className="field mt-5 min-h-56" value={text} onChange={(event) => setText(event.target.value)} placeholder="Paste the protocol here..." />
        ) : (
          <label className="mt-5 block rounded-xl border border-dashed p-8 text-center">
            <Upload className="mx-auto text-slate-400" />
            <p className="mt-3 font-semibold">Upload {current?.label}</p>
            <p className="mt-1 text-sm text-slate-500">Accepted: {type === "pdf" ? "PDF" : type === "word" ? "DOCX" : "PNG, JPEG, or WebP"}; max 10 MB.</p>
            <input className="mt-4 block w-full text-sm" type="file" accept={current?.accept} onChange={(event) => chooseFile(event.target.files?.[0] || null)} />
            {file && <p className="mt-3 text-sm font-semibold text-moss">Selected: {file.name}</p>}
          </label>
        )}
        <button className="btn-primary mt-4" disabled={loading || (type === "text" ? !text.trim() : !file)} onClick={submit}><FileText size={16} /> {loading ? "Extracting and creating draft..." : "Create AI draft"}</button>
        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      </div>

      {extracted && <details className="card mt-5 p-5"><summary className="cursor-pointer font-semibold">Extracted text preview</summary><pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap text-sm text-slate-600">{extracted}</pre></details>}

      {draft && (
        <section className="card mt-6 p-6">
          <p className="label">Draft review</p>
          <label className="mt-4 block"><span className="label">Title</span><input className="field" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
          <label className="mt-4 block"><span className="label">Description</span><textarea className="field" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
          <p className="mt-5 font-semibold">{draft.steps.length} imported steps</p>
          <div className="mt-3 space-y-2">{draft.steps.map((step, index) => <div key={step.id} className="rounded-lg bg-slate-50 p-3"><b>{index + 1}. {step.title}</b><p className="mt-1 text-sm text-slate-600">{step.instruction || "No instruction extracted - needs review."}</p></div>)}</div>
          <div className="mt-5 flex gap-3"><button className="btn-primary" disabled={saving} onClick={save}>{saving ? "Saving..." : "Save to Protocol Library"}</button><Link className="btn-secondary" href="/">Cancel</Link></div>
        </section>
      )}
    </div>
  );
}
