"use client";

import Link from "next/link";
import { useState } from "react";
import { CloudUpload, Copy, FilePenLine, Plus, Trash2 } from "lucide-react";
import { HomeQuoteRotator } from "@/components/home-quote-rotator";
import { useProtocols } from "@/lib/use-protocols";
import { Protocol } from "@/lib/types";

export default function ProtocolLibrary() {
  const { protocols, loading, error, usingCloud, createProtocol, saveProtocol, removeProtocol, importLocalProtocols } = useProtocols();
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");

  async function create() {
    const protocol = await createProtocol();
    location.href = `/protocols/${protocol.id}`;
  }

  async function remove(id: string) {
    if (!confirm("Delete this protocol? This cannot be undone.")) return;
    await removeProtocol(id);
  }

  async function duplicate(protocol: Protocol) {
    await saveProtocol({
      ...protocol,
      id: crypto.randomUUID(),
      title: `${protocol.title} (copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  async function importLocal() {
    setImporting(true);
    setImportMessage("");
    try {
      const count = await importLocalProtocols();
      setImportMessage(count ? `Imported ${count} local protocol${count === 1 ? "" : "s"} to cloud.` : "No local protocols to import.");
    } catch (cause) {
      setImportMessage(cause instanceof Error ? cause.message : "Could not import local protocols.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="label">Protocol library</p>
          <HomeQuoteRotator />
          <p className="mt-2 text-slate-600">Create structured protocols that stay useful at the bench.</p>
          <p className="mt-2 text-xs font-semibold text-slate-500">{usingCloud ? "Cloud sync: Supabase protocols" : "Local mode: browser localStorage"}</p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <button onClick={create} className="btn-primary min-h-11" disabled={loading}><Plus size={18} /> New protocol</button>
          {usingCloud && <button onClick={importLocal} className="btn-secondary text-xs" disabled={importing}><CloudUpload size={15} /> {importing ? "Importing..." : "Import local protocols to cloud"}</button>}
        </div>
      </div>

      {(error || importMessage) && <p className={error ? "mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" : "mb-4 rounded-lg bg-mist p-3 text-sm text-moss"}>{error || importMessage}</p>}
      {loading && <div className="card p-8 text-center text-sm text-slate-500">Loading protocols...</div>}

      {!loading && <div className="grid gap-4 md:grid-cols-2">
        {protocols.map((protocol) => (
          <article key={protocol.id} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="label">Version {protocol.version}</p>
                <h2 className="mt-1 text-lg font-bold">{protocol.title}</h2>
              </div>
              <span className="rounded-full bg-mist px-2.5 py-1 text-xs font-semibold text-moss">{protocol.steps.length} steps</span>
            </div>
            <p className="mt-3 min-h-10 text-sm leading-5 text-slate-600">{protocol.description || "No description yet."}</p>
            <div className="mt-5 flex gap-2 border-t pt-4">
              <Link className="btn-secondary flex-1" href={`/protocols/${protocol.id}`}><FilePenLine size={16} /> Edit</Link>
              <button className="btn-secondary px-3" title="Duplicate" onClick={() => duplicate(protocol)}><Copy size={16} /></button>
              <button className="btn-danger px-3" title="Delete" onClick={() => remove(protocol.id)}><Trash2 size={16} /></button>
            </div>
          </article>
        ))}
      </div>}

      {!loading && !protocols.length && <div className="card py-16 text-center"><p className="font-semibold">No protocols yet</p><p className="mt-1 text-sm text-slate-500">Start with a blank protocol and shape it around your experiment.</p></div>}
    </div>
  );
}
