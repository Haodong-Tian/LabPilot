import { Protocol } from "@/lib/types";
import { getSupabaseBrowserClient } from "./client";

type ProtocolRow = {
  id: string;
  user_id: string;
  title: string | null;
  description: string | null;
  version: string | null;
  data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getClientOrThrow() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

function toProtocol(row: ProtocolRow): Protocol {
  const data = row.data || {};
  return {
    id: row.id,
    title: row.title || "Untitled protocol",
    description: row.description || "",
    version: row.version || "0.1",
    objective: typeof data.objective === "string" ? data.objective : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    steps: Array.isArray(data.steps) ? data.steps as Protocol["steps"] : [],
  };
}

function protocolData(protocol: Protocol) {
  return {
    objective: protocol.objective || "",
    steps: protocol.steps,
  };
}

function protocolPayload(userId: string, protocol: Protocol) {
  return {
    user_id: userId,
    title: protocol.title,
    description: protocol.description,
    version: protocol.version,
    data: protocolData(protocol),
  } as Record<string, unknown>;
}

export async function loadCloudProtocols(userId: string): Promise<Protocol[]> {
  const supabase = getClientOrThrow();
  const { data, error } = await supabase
    .from("protocols")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return ((data || []) as ProtocolRow[]).map(toProtocol);
}

export async function createCloudProtocol(userId: string, protocol: Protocol): Promise<Protocol> {
  const supabase = getClientOrThrow();
  const { data, error } = await supabase
    .from("protocols")
    .insert(uuidPattern.test(protocol.id) ? { id: protocol.id, ...protocolPayload(userId, protocol) } : protocolPayload(userId, protocol))
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return toProtocol(data as ProtocolRow);
}

export async function updateCloudProtocol(userId: string, protocol: Protocol): Promise<Protocol> {
  const supabase = getClientOrThrow();
  const { data, error } = await supabase
    .from("protocols")
    .update({
      title: protocol.title,
      description: protocol.description,
      version: protocol.version,
      data: protocolData(protocol),
      updated_at: new Date().toISOString(),
    })
    .eq("id", protocol.id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return toProtocol(data as ProtocolRow);
}

export async function upsertCloudProtocol(userId: string, protocol: Protocol): Promise<Protocol> {
  if (!uuidPattern.test(protocol.id)) return createCloudProtocol(userId, protocol);
  const supabase = getClientOrThrow();
  const { data, error } = await supabase
    .from("protocols")
    .upsert({ id: protocol.id, ...protocolPayload(userId, protocol), updated_at: new Date().toISOString() }, { onConflict: "id" })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return toProtocol(data as ProtocolRow);
}

export async function deleteCloudProtocol(userId: string, id: string): Promise<void> {
  const supabase = getClientOrThrow();
  const { error } = await supabase.from("protocols").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
}
