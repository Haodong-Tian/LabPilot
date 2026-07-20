import { ExperimentRun, Protocol, RunStatus } from "@/lib/types";
import { getSupabaseBrowserClient } from "./client";

type ExperimentRow = {
  id: string;
  user_id: string;
  protocol_id: string | null;
  status: string;
  current_step: number;
  run_data: Record<string, unknown> | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getClientOrThrow() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

function createStepLogs(protocol: Protocol): ExperimentRun["stepLogs"] {
  return protocol.steps.map((step) => ({
    stepId: step.id,
    stepTitle: step.title,
    status: "not_started",
    plannedDurationSeconds: (step.timerMinutes || 0) * 60,
  }));
}

export function newExperimentRunFromProtocol(protocol: Protocol): ExperimentRun {
  const time = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    protocolId: protocol.id,
    protocolName: protocol.title,
    protocolVersion: protocol.version,
    protocolDescription: protocol.description,
    protocolObjective: protocol.objective,
    protocolSteps: protocol.steps,
    startedAt: time,
    updatedAt: time,
    status: "not_started",
    currentStepIndex: 0,
    stepLogs: createStepLogs(protocol),
  };
}

function normalizeRun(row: ExperimentRow): ExperimentRun {
  const runData = (row.run_data || {}) as Partial<ExperimentRun>;
  return {
    id: row.id,
    protocolId: row.protocol_id || runData.protocolId || "",
    protocolName: runData.protocolName || "Untitled protocol",
    protocolVersion: runData.protocolVersion || "",
    protocolDescription: runData.protocolDescription || "",
    protocolObjective: runData.protocolObjective,
    protocolSteps: Array.isArray(runData.protocolSteps) ? runData.protocolSteps : [],
    startedAt: row.started_at || runData.startedAt || row.created_at,
    endedAt: row.completed_at || runData.endedAt,
    status: row.status as RunStatus,
    stepLogs: Array.isArray(runData.stepLogs) ? runData.stepLogs : [],
    notes: runData.notes,
    deviations: runData.deviations,
    currentStepIndex: row.current_step ?? runData.currentStepIndex ?? 0,
    updatedAt: row.updated_at || runData.updatedAt,
    chatMessages: Array.isArray(runData.chatMessages) ? runData.chatMessages : [],
  };
}

function experimentPayload(userId: string, run: ExperimentRun) {
  return {
    user_id: userId,
    protocol_id: uuidPattern.test(run.protocolId) ? run.protocolId : null,
    status: run.status,
    current_step: run.currentStepIndex || 0,
    run_data: run,
    started_at: run.startedAt,
    completed_at: run.endedAt || null,
  } as Record<string, unknown>;
}

export async function createExperiment(userId: string, protocol: Protocol): Promise<ExperimentRun> {
  const supabase = getClientOrThrow();
  const draft = newExperimentRunFromProtocol(protocol);
  const { data, error } = await supabase
    .from("experiments")
    .insert({ id: draft.id, ...experimentPayload(userId, draft) })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return normalizeRun(data as ExperimentRow);
}

export async function createExperimentFromRun(userId: string, run: ExperimentRun): Promise<ExperimentRun> {
  const supabase = getClientOrThrow();
  const { data, error } = await supabase
    .from("experiments")
    .upsert({ id: uuidPattern.test(run.id) ? run.id : crypto.randomUUID(), ...experimentPayload(userId, run) }, { onConflict: "id" })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return normalizeRun(data as ExperimentRow);
}

export async function loadExperiments(userId: string): Promise<ExperimentRun[]> {
  const supabase = getClientOrThrow();
  const { data, error } = await supabase
    .from("experiments")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return ((data || []) as ExperimentRow[]).map(normalizeRun);
}

export async function loadActiveExperiments(userId: string): Promise<ExperimentRun[]> {
  const runs = await loadExperiments(userId);
  return runs.filter((run) => !["completed", "aborted"].includes(run.status));
}

export async function loadExperiment(userId: string, id: string): Promise<ExperimentRun | null> {
  const supabase = getClientOrThrow();
  const { data, error } = await supabase
    .from("experiments")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? normalizeRun(data as ExperimentRow) : null;
}

export async function updateExperiment(userId: string, run: ExperimentRun): Promise<ExperimentRun> {
  const supabase = getClientOrThrow();
  const { data, error } = await supabase
    .from("experiments")
    .update(experimentPayload(userId, run))
    .eq("id", run.id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return normalizeRun(data as ExperimentRow);
}
