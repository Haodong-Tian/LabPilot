import { LabNotebookReport } from "@/lib/types";
import { getSupabaseBrowserClient } from "./client";

type ReportRow = {
  id: string;
  user_id: string;
  experiment_id: string;
  title: string;
  markdown: string;
  favorite: boolean;
  created_at: string;
  updated_at: string;
};

function getClientOrThrow() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

function toReport(row: ReportRow): LabNotebookReport {
  return {
    id: row.id,
    title: row.title,
    experimentRunId: row.experiment_id,
    protocolId: "",
    protocolTitle: "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    markdown: row.markdown,
    isFavorite: row.favorite,
  };
}

export async function loadExperimentReports(userId: string): Promise<LabNotebookReport[]> {
  const supabase = getClientOrThrow();
  const { data, error } = await supabase
    .from("experiment_reports")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return ((data || []) as ReportRow[]).map(toReport);
}

export async function findReportByExperiment(userId: string, experimentId: string): Promise<LabNotebookReport | null> {
  const supabase = getClientOrThrow();
  const { data, error } = await supabase
    .from("experiment_reports")
    .select("*")
    .eq("user_id", userId)
    .eq("experiment_id", experimentId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? toReport(data as ReportRow) : null;
}

export async function createExperimentReport(userId: string, report: LabNotebookReport): Promise<LabNotebookReport> {
  const supabase = getClientOrThrow();
  const { data, error } = await supabase
    .from("experiment_reports")
    .insert({
      user_id: userId,
      experiment_id: report.experimentRunId,
      title: report.title,
      markdown: report.markdown,
      favorite: Boolean(report.isFavorite),
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return toReport(data as ReportRow);
}

export async function updateExperimentReport(userId: string, report: LabNotebookReport): Promise<LabNotebookReport> {
  const supabase = getClientOrThrow();
  const { data, error } = await supabase
    .from("experiment_reports")
    .update({
      title: report.title,
      markdown: report.markdown,
      favorite: Boolean(report.isFavorite),
    })
    .eq("id", report.id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return toReport(data as ReportRow);
}

export async function deleteExperimentReport(userId: string, id: string): Promise<void> {
  const supabase = getClientOrThrow();
  const { error } = await supabase.from("experiment_reports").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
}
