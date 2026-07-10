"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronUp, Plus, Save, Trash2 } from "lucide-react";
import { createId } from "@/lib/storage";
import { Protocol, ProtocolStep } from "@/lib/types";
import { useProtocols } from "@/lib/use-protocols";

const blankStep = (): ProtocolStep => ({ id: createId(), title: "New step", instruction: "", materials: [], userInputFields: [] });

export default function ProtocolEditor({ params }: { params: Promise<{ id: string }> }) {
  const { protocols, loading, error, usingCloud, saveProtocol } = useProtocols();
  const [protocolId, setProtocolId] = useState("");
  const [protocol, setProtocol] = useState<Protocol | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    params.then(({ id }) => setProtocolId(id));
  }, [params]);

  useEffect(() => {
    if (!protocolId || loading) return;
    setProtocol(protocols.find((item) => item.id === protocolId) || null);
  }, [loading, protocolId, protocols]);

  if (loading) return <div className="card p-8 text-sm text-slate-500">Loading protocol...</div>;
  if (!protocol) return <div className="card p-8">Protocol not found. <Link className="text-moss underline" href="/">Return to library</Link></div>;

  const currentProtocol = protocol;
  const update = (patch: Partial<Protocol>) => setProtocol({ ...currentProtocol, ...patch });
  const setStep = (index: number, patch: Partial<ProtocolStep>) => update({ steps: currentProtocol.steps.map((step, current) => current === index ? { ...step, ...patch } : step) });

  async function save() {
    setSaveError("");
    try {
      const savedProtocol = await saveProtocol({ ...currentProtocol, updatedAt: new Date().toISOString() });
      setProtocol(savedProtocol);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : "Could not save protocol.");
    }
  }

  function move(index: number, direction: -1 | 1) {
    const steps = [...currentProtocol.steps];
    [steps[index], steps[index + direction]] = [steps[index + direction], steps[index]];
    update({ steps });
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="btn-secondary"><ArrowLeft size={16} /> Library</Link>
        <button onClick={save} className="btn-primary"><Save size={16} />{saved ? "Saved" : "Save protocol"}</button>
      </div>

      {(error || saveError) && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error || saveError}</p>}
      <p className="mb-3 text-xs font-semibold text-slate-500">{usingCloud ? "Editing cloud protocol" : "Editing local protocol"}</p>

      <section className="card p-5 sm:p-6">
        <p className="label">Protocol details</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_150px]">
          <label><span className="label">Title</span><input className="field" value={currentProtocol.title} onChange={(event) => update({ title: event.target.value })} /></label>
          <label><span className="label">Version</span><input className="field" value={currentProtocol.version} onChange={(event) => update({ version: event.target.value })} /></label>
        </div>
        <label className="mt-4 block"><span className="label">Description</span><textarea className="field min-h-20" value={currentProtocol.description} onChange={(event) => update({ description: event.target.value })} /></label>
        <label className="mt-4 block"><span className="label">Objective</span><input className="field" placeholder="What is this experiment intended to determine?" value={currentProtocol.objective || ""} onChange={(event) => update({ objective: event.target.value })} /></label>
      </section>

      <div className="mt-8 flex items-center justify-between">
        <div><p className="label">Procedure</p><h2 className="text-xl font-bold">Protocol steps</h2></div>
        <button className="btn-secondary" onClick={() => update({ steps: [...currentProtocol.steps, blankStep()] })}><Plus size={16} /> Add step</button>
      </div>

      <div className="mt-4 space-y-4">
        {currentProtocol.steps.map((step, index) => (
          <StepCard
            key={step.id}
            step={step}
            index={index}
            total={currentProtocol.steps.length}
            onChange={(patch) => setStep(index, patch)}
            onRemove={() => update({ steps: currentProtocol.steps.filter((_, current) => current !== index) })}
            onMove={(direction) => move(index, direction)}
          />
        ))}
      </div>
    </div>
  );
}

function StepCard({ step, index, total, onChange, onRemove, onMove }: { step: ProtocolStep; index: number; total: number; onChange: (patch: Partial<ProtocolStep>) => void; onRemove: () => void; onMove: (direction: -1 | 1) => void }) {
  const inputs = step.userInputFields || [];
  return (
    <article className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="rounded-lg bg-mist px-2.5 py-1 text-xs font-bold text-moss">STEP {index + 1}</span>
        <div className="flex gap-1">
          <button className="btn-secondary p-2" disabled={!index} onClick={() => onMove(-1)}><ChevronUp size={16} /></button>
          <button className="btn-secondary p-2" disabled={index === total - 1} onClick={() => onMove(1)}><ChevronDown size={16} /></button>
          <button className="btn-danger p-2" onClick={onRemove}><Trash2 size={16} /></button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label><span className="label">Step title</span><input className="field" value={step.title} onChange={(event) => onChange({ title: event.target.value })} /></label>
        <label><span className="label">Timer (minutes)</span><input className="field" type="number" min="0" placeholder="Optional" value={step.timerMinutes ?? ""} onChange={(event) => onChange({ timerMinutes: event.target.value ? Number(event.target.value) : undefined })} /></label>
      </div>
      <label className="mt-4 block"><span className="label">Instruction</span><textarea className="field min-h-20" value={step.instruction} onChange={(event) => onChange({ instruction: event.target.value })} /></label>
      <label className="mt-4 block"><span className="label">Materials (one per line)</span><textarea className="field" value={step.materials.join("\n")} onChange={(event) => onChange({ materials: event.target.value.split("\n").filter(Boolean) })} /></label>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label><span className="label">Warning</span><input className="field" value={step.warning || ""} onChange={(event) => onChange({ warning: event.target.value })} /></label>
        <label><span className="label">Expected observation</span><input className="field" value={step.expectedObservation || ""} onChange={(event) => onChange({ expectedObservation: event.target.value })} /></label>
      </div>
      <div className="mt-4 rounded-lg bg-slate-50 p-3">
        <div className="flex items-center justify-between"><span className="label">User input fields</span><button className="text-xs font-semibold text-moss" onClick={() => onChange({ userInputFields: [...inputs, { id: createId(), label: "New field", placeholder: "" }] })}>+ Add field</button></div>
        {inputs.map((field, inputIndex) => (
          <div className="mt-2 flex gap-2" key={field.id}>
            <input className="field mt-0" placeholder="Label" value={field.label} onChange={(event) => onChange({ userInputFields: inputs.map((item, current) => current === inputIndex ? { ...item, label: event.target.value } : item) })} />
            <input className="field mt-0" placeholder="Placeholder" value={field.placeholder || ""} onChange={(event) => onChange({ userInputFields: inputs.map((item, current) => current === inputIndex ? { ...item, placeholder: event.target.value } : item) })} />
            <button className="btn-danger px-3" onClick={() => onChange({ userInputFields: inputs.filter((_, current) => current !== inputIndex) })}><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
    </article>
  );
}
