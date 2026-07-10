"use client";

import { useCallback, useEffect, useState } from "react";
import { createCloudProtocol, deleteCloudProtocol, loadCloudProtocols, upsertCloudProtocol } from "@/lib/supabase/protocols";
import { Protocol } from "@/lib/types";
import { deleteProtocol, getProtocols, newProtocol, upsertProtocol } from "./storage";
import { useAuth } from "@/components/auth-provider";

export function useProtocols() {
  const { user, loading: authLoading, configured } = useAuth();
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const usingCloud = Boolean(configured && user);

  const refresh = useCallback(async () => {
    setError("");
    if (authLoading) return;
    setLoading(true);
    try {
      if (user) setProtocols(await loadCloudProtocols(user.id));
      else setProtocols(getProtocols());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load protocols.");
      setProtocols(user ? [] : getProtocols());
    } finally {
      setLoading(false);
    }
  }, [authLoading, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createProtocol = useCallback(async () => {
    const protocol = newProtocol();
    if (!user) {
      upsertProtocol(protocol);
      setProtocols(getProtocols());
      return protocol;
    }
    const saved = await createCloudProtocol(user.id, protocol);
    setProtocols((current) => [saved, ...current]);
    return saved;
  }, [user]);

  const saveProtocol = useCallback(async (protocol: Protocol) => {
    const next = { ...protocol, updatedAt: new Date().toISOString() };
    if (!user) {
      upsertProtocol(next);
      setProtocols(getProtocols());
      return next;
    }
    const saved = await upsertCloudProtocol(user.id, next);
    setProtocols((current) => current.some((item) => item.id === saved.id) ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current]);
    return saved;
  }, [user]);

  const removeProtocol = useCallback(async (id: string) => {
    if (!user) {
      deleteProtocol(id);
      setProtocols(getProtocols());
      return;
    }
    await deleteCloudProtocol(user.id, id);
    setProtocols((current) => current.filter((item) => item.id !== id));
  }, [user]);

  const importLocalProtocols = useCallback(async () => {
    if (!user) return 0;
    const localProtocols = getProtocols();
    let count = 0;
    for (const protocol of localProtocols) {
      await createCloudProtocol(user.id, protocol);
      count += 1;
    }
    await refresh();
    return count;
  }, [refresh, user]);

  return { protocols, loading: loading || authLoading, error, usingCloud, refresh, createProtocol, saveProtocol, removeProtocol, importLocalProtocols };
}
