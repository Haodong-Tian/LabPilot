"use client";

import { Cloud, LogOut, Mail } from "lucide-react";
import { FormEvent, useState } from "react";
import { useAuth } from "./auth-provider";

export function AuthWidget() {
  const { user, loading, error, configured, signInWithEmail, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!configured) return <span className="hidden text-xs text-slate-400 lg:inline">Local mode</span>;
  if (loading) return <span className="text-xs text-slate-400">Checking sync...</span>;

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden max-w-40 truncate text-xs text-slate-500 sm:inline"><Cloud className="mr-1 inline" size={13} />{user.email}</span>
        <button className="btn-secondary px-3 py-2 text-xs" onClick={() => signOut()}><LogOut size={14} /> Logout</button>
      </div>
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setSent(false);
    try {
      await signInWithEmail(email.trim());
      setSent(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="flex items-center gap-2" onSubmit={submit}>
      <input className="field mt-0 w-32 py-2 text-xs sm:w-44" type="email" placeholder="Email for cloud sync" value={email} onChange={(event) => setEmail(event.target.value)} />
      <button className="btn-secondary px-3 py-2 text-xs" disabled={busy}><Mail size={14} /> {busy ? "Sending..." : "Login"}</button>
      {(sent || error) && <span className={error ? "max-w-44 truncate text-xs text-red-600" : "max-w-44 truncate text-xs text-moss"}>{error || "Check your email."}</span>}
    </form>
  );
}
