import { ExperimentChatMessage, ExperimentRun, LabNotebookReport, Protocol, ProtocolStep } from "./types";

const KEYS = {
  protocols: "labpilot.protocols.v1",
  activeRuns: "labpilot.activeRuns.v1",
  completedRuns: "labpilot.completedRuns.v1",
  reports: "labpilot.reports.v1",
  importDrafts: "labpilot.importDrafts.v1",
  chats: "labpilot.experimentChats.v1",
} as const;

const LEGACY = {
  protocols: ["labpilot.v1.protocols", "labpilot.protocols"],
  runs: ["labpilot.v1.runs", "labpilot.runs"],
  reports: ["labpilot.v1.reports", "labpilot.reports"],
} as const;

const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

const sampleProtocols: Protocol[] = [{
  id: "sample-protein-assay",
  title: "Bradford Protein Assay",
  version: "1.0",
  description: "Determine total protein concentration using a microplate reader.",
  objective: "Quantify protein concentration in prepared lysate samples.",
  createdAt: now(),
  updatedAt: now(),
  steps: [
    { id: "prepare", title: "Prepare standards", instruction: "Prepare BSA standards from 0 to 1.5 mg/mL in duplicate.", materials: ["BSA standard", "PBS", "96-well plate"], expectedObservation: "A clear labelled standard series." },
    { id: "reagent", title: "Add Bradford reagent", instruction: "Add 200 uL Bradford reagent to each well. Mix gently without creating bubbles.", materials: ["Bradford reagent", "Pipette"], timerMinutes: 5, warning: "Wear gloves; reagent can stain skin and benches.", expectedObservation: "Samples begin turning blue." },
    { id: "read", title: "Read absorbance", instruction: "Measure absorbance at 595 nm and record results.", materials: ["Plate reader"], userInputFields: [{ id: "reader", label: "Plate reader ID", placeholder: "e.g. SpectraMax i3x" }] },
  ],
}];

type ReadResult<T> = { exists: boolean; valid: boolean; value?: T };

function readStored<T>(key: string): ReadResult<T> {
  if (typeof window === "undefined") return { exists: false, valid: false };
  const raw = localStorage.getItem(key);
  if (raw === null) return { exists: false, valid: false };
  try { return { exists: true, valid: true, value: JSON.parse(raw) as T }; }
  catch {
    console.warn(`LabPilot could not parse localStorage key "${key}". The original value was left untouched.`);
    return { exists: true, valid: false };
  }
}

function writeStored<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch (error) { console.error(`LabPilot could not save localStorage key "${key}".`, error); }
}

function firstLegacyArray<T>(keys: readonly string[]): T[] {
  for (const key of keys) {
    const result = readStored<unknown>(key);
    if (result.valid && Array.isArray(result.value)) return result.value as T[];
  }
  return [];
}

function getVersionedArray<T>(key: string, legacyKeys: readonly string[], fallback: T[] = []): T[] {
  const current = readStored<unknown>(key);
  if (current.valid && Array.isArray(current.value)) return current.value as T[];
  if (current.exists) return fallback;
  const legacy = firstLegacyArray<T>(legacyKeys);
  const initial = legacy.length ? legacy : fallback;
  writeStored(key, initial);
  return initial;
}

function normalizeRun(run: Partial<ExperimentRun>): ExperimentRun {
  const steps = Array.isArray(run.protocolSteps) ? run.protocolSteps : [];
  const legacyStatus = run.status as string | undefined;
  return {
    id: run.id || uid(),
    protocolId: run.protocolId || "",
    protocolName: run.protocolName || "Untitled protocol",
    protocolVersion: run.protocolVersion || "",
    protocolDescription: run.protocolDescription || "",
    protocolObjective: run.protocolObjective,
    protocolSteps: steps,
    startedAt: run.startedAt || now(),
    endedAt: run.endedAt,
    status: legacyStatus === "in_progress" ? "running" : run.status || "not_started",
    stepLogs: Array.isArray(run.stepLogs) ? run.stepLogs : steps.map((step) => ({ stepId: step.id, stepTitle: step.title, status: "not_started", plannedDurationSeconds: (step.timerMinutes || 0) * 60 })),
    notes: run.notes,
    deviations: run.deviations,
    currentStepIndex: run.currentStepIndex || 0,
    updatedAt: run.updatedAt || run.startedAt || now(),
    chatMessages: Array.isArray(run.chatMessages) ? run.chatMessages : [],
  };
}

function migrateRunsIfNeeded() {
  const active = readStored<unknown>(KEYS.activeRuns);
  const completed = readStored<unknown>(KEYS.completedRuns);
  if (active.exists || completed.exists) return;
  const legacy = firstLegacyArray<ExperimentRun>(LEGACY.runs).map(normalizeRun);
  writeStored(KEYS.activeRuns, legacy.filter((run) => !["completed", "aborted"].includes(run.status)));
  writeStored(KEYS.completedRuns, legacy.filter((run) => ["completed", "aborted"].includes(run.status)));
}

export function getProtocols(): Protocol[] {
  const current = readStored<unknown>(KEYS.protocols);
  if (current.valid && Array.isArray(current.value)) return current.value as Protocol[];
  if (current.exists) return [];
  const legacy = firstLegacyArray<Protocol>(LEGACY.protocols);
  const initial = legacy.length ? legacy : sampleProtocols;
  writeStored(KEYS.protocols, initial);
  return initial;
}

export function saveProtocols(protocols: Protocol[]) { writeStored(KEYS.protocols, protocols); }
export function upsertProtocol(protocol: Protocol) { const all = getProtocols(); saveProtocols(all.some((item) => item.id === protocol.id) ? all.map((item) => item.id === protocol.id ? protocol : item) : [protocol, ...all]); }
export function deleteProtocol(id: string) { saveProtocols(getProtocols().filter((item) => item.id !== id)); }
export function newProtocol(): Protocol { const time = now(); return { id: uid(), title: "Untitled protocol", description: "", version: "0.1", createdAt: time, updatedAt: time, steps: [] }; }

export function getActiveRuns(): ExperimentRun[] { migrateRunsIfNeeded(); return getVersionedArray<ExperimentRun>(KEYS.activeRuns, []).map(normalizeRun); }
export function getCompletedRuns(): ExperimentRun[] { migrateRunsIfNeeded(); return getVersionedArray<ExperimentRun>(KEYS.completedRuns, []).map(normalizeRun); }
export function getRuns(): ExperimentRun[] { return [...getActiveRuns(), ...getCompletedRuns()]; }

export function upsertRun(run: ExperimentRun) {
  const normalized = normalizeRun({ ...run, updatedAt: now() });
  const active = getActiveRuns().filter((item) => item.id !== normalized.id);
  const completed = getCompletedRuns().filter((item) => item.id !== normalized.id);
  if (["completed", "aborted"].includes(normalized.status)) completed.unshift(normalized);
  else active.unshift(normalized);
  writeStored(KEYS.activeRuns, active);
  writeStored(KEYS.completedRuns, completed);
}

export function deleteRun(id: string) {
  writeStored(KEYS.activeRuns, getActiveRuns().filter((run) => run.id !== id));
  writeStored(KEYS.completedRuns, getCompletedRuns().filter((run) => run.id !== id));
}

export function createRun(protocol: Protocol): ExperimentRun {
  const time = now();
  return normalizeRun({ id: uid(), protocolId: protocol.id, protocolName: protocol.title, protocolVersion: protocol.version, protocolDescription: protocol.description, protocolObjective: protocol.objective, protocolSteps: protocol.steps, startedAt: time, updatedAt: time, status: "not_started", currentStepIndex: 0, stepLogs: protocol.steps.map((step: ProtocolStep) => ({ stepId: step.id, stepTitle: step.title, status: "not_started", plannedDurationSeconds: (step.timerMinutes || 0) * 60 })) });
}

export function getReports(): LabNotebookReport[] { return getVersionedArray<LabNotebookReport>(KEYS.reports, LEGACY.reports); }
export function upsertReport(report: LabNotebookReport) { const reports = getReports(); writeStored(KEYS.reports, reports.some((item) => item.id === report.id) ? reports.map((item) => item.id === report.id ? report : item) : [report, ...reports]); }
export function deleteReport(id: string) { writeStored(KEYS.reports, getReports().filter((report) => report.id !== id)); }

function migrateEmbeddedChats() {
  const current = readStored<unknown>(KEYS.chats);
  if (current.exists) return;
  const migrated = getRuns().flatMap((run) => (run.chatMessages || []).map((message) => ({ ...message, runId: run.id } as ExperimentChatMessage)));
  writeStored(KEYS.chats, migrated);
}

export function getExperimentChats(runId: string): ExperimentChatMessage[] {
  migrateEmbeddedChats();
  return getVersionedArray<ExperimentChatMessage>(KEYS.chats, []).filter((message) => message.runId === runId);
}

export function saveExperimentChats(runId: string, messages: ExperimentChatMessage[]) {
  migrateEmbeddedChats();
  const otherRuns = getVersionedArray<ExperimentChatMessage>(KEYS.chats, []).filter((message) => message.runId !== runId);
  writeStored(KEYS.chats, [...otherRuns, ...messages.map((message) => ({ ...message, runId }))]);
}

export function clearExperimentChats(runId: string) { saveExperimentChats(runId, []); }
export function createId() { return uid(); }
