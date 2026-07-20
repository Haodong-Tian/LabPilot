"use client";

import Link from "next/link";
import { Loader2, Mail } from "lucide-react";
import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) throw new Error("Supabase is not configured.");
      const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (error) throw error;
      setMessage("Password reset email sent. Open the link in your email to set a new password.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send reset email.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="mx-auto max-w-md py-10"><section className="card p-6 sm:p-8"><p className="label">LabPilot account</p><h1 className="mt-1 text-2xl font-bold">Reset your password</h1><p className="mt-2 text-sm text-slate-600">Enter your email and we will send a secure reset link.</p><form className="mt-6 space-y-4" onSubmit={submit}><label className="block"><span className="label">Email</span><input className="field" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>{error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}{message && <p className="rounded-lg bg-mist p-3 text-sm text-moss">{message}</p>}<button className="btn-primary w-full" disabled={loading}>{loading ? <Loader2 className="animate-spin" size={16} /> : <Mail size={16} />} {loading ? "Sending..." : "Send reset email"}</button></form><p className="mt-5 text-sm text-slate-600"><Link className="text-moss underline" href="/login">Back to login</Link></p></section></main>;
}
