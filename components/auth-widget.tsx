"use client";

import Link from "next/link";
import { LogIn, LogOut } from "lucide-react";
import { useAuth } from "./auth-provider";

export function AuthWidget() {
  const { user, loading, configured, signOut } = useAuth();

  if (!configured) return <span className="hidden text-xs text-slate-400 lg:inline">Local mode</span>;
  if (loading) return <span className="text-xs text-slate-400">Checking session...</span>;

  if (!user) {
    return <Link className="btn-secondary px-3 py-2 text-xs" href="/login"><LogIn size={14} /> Login</Link>;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden max-w-40 truncate text-xs text-slate-500 sm:inline">{user.email}</span>
      <button className="btn-secondary px-3 py-2 text-xs" onClick={() => signOut()}><LogOut size={14} /> Logout</button>
    </div>
  );
}
