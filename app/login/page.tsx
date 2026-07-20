"use client";

import Link from "next/link";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  return <Suspense fallback={<AuthShell title="Login to LabPilot"><p className="text-sm text-slate-500">Loading...</p></AuthShell>}><LoginForm /></Suspense>;
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(searchParams.get("error") || "");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) throw new Error("Supabase is not configured.");
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      window.location.href = searchParams.get("next") || "/";
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Login to LabPilot" subtitle="Use your email and password to open your synced lab workspace.">
      <form className="space-y-4" onSubmit={submit}>
        <label className="block"><span className="label">Email</span><input className="field" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <PasswordField label="Password" value={password} onChange={setPassword} show={showPassword} onToggle={() => setShowPassword((value) => !value)} autoComplete="current-password" />
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button className="btn-primary w-full" disabled={loading}>{loading ? <Loader2 className="animate-spin" size={16} /> : <LogIn size={16} />} {loading ? "Logging in..." : "Login"}</button>
      </form>
      <div className="mt-5 flex flex-wrap justify-between gap-3 text-sm"><Link className="text-moss underline" href="/signup">Create an account</Link><Link className="text-moss underline" href="/forgot-password">Forgot password?</Link></div>
    </AuthShell>
  );
}

function PasswordField({ label, value, onChange, show, onToggle, autoComplete }: { label: string; value: string; onChange: (value: string) => void; show: boolean; onToggle: () => void; autoComplete: string }) {
  return <label className="block"><span className="label">{label}</span><span className="mt-1.5 flex rounded-lg border border-slate-300 bg-white focus-within:border-moss focus-within:ring-2 focus-within:ring-moss/15"><input className="w-full rounded-lg px-3 py-2 text-sm outline-none" type={show ? "text" : "password"} autoComplete={autoComplete} required value={value} onChange={(event) => onChange(event.target.value)} /><button className="px-3 text-slate-500" type="button" onClick={onToggle} aria-label={show ? "Hide password" : "Show password"}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button></span></label>;
}

function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return <main className="mx-auto max-w-md py-10"><section className="card p-6 sm:p-8"><p className="label">LabPilot account</p><h1 className="mt-1 text-2xl font-bold">{title}</h1>{subtitle && <p className="mt-2 text-sm text-slate-600">{subtitle}</p>}<div className="mt-6">{children}</div></section></main>;
}
