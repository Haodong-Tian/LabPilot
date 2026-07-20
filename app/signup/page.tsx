"use client";

import Link from "next/link";
import { Eye, EyeOff, Loader2, UserPlus } from "lucide-react";
import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirmPassword) return setError("Passwords do not match.");
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) throw new Error("Supabase is not configured.");
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      if (data.session) window.location.href = "/";
      else setMessage("Account created. Check your email to confirm your signup before logging in.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create account.");
    } finally {
      setLoading(false);
    }
  }

  return <AuthShell title="Create your LabPilot account" subtitle="Sign up with email and password to sync protocols, experiments, and reports."><form className="space-y-4" onSubmit={submit}><label className="block"><span className="label">Email</span><input className="field" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label><PasswordField label="Password" value={password} onChange={setPassword} show={showPassword} onToggle={() => setShowPassword((value) => !value)} autoComplete="new-password" /><PasswordField label="Confirm password" value={confirmPassword} onChange={setConfirmPassword} show={showConfirm} onToggle={() => setShowConfirm((value) => !value)} autoComplete="new-password" />{error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}{message && <p className="rounded-lg bg-mist p-3 text-sm text-moss">{message}</p>}<button className="btn-primary w-full" disabled={loading}>{loading ? <Loader2 className="animate-spin" size={16} /> : <UserPlus size={16} />} {loading ? "Creating account..." : "Sign up"}</button></form><p className="mt-5 text-sm text-slate-600">Already have an account? <Link className="text-moss underline" href="/login">Login</Link></p></AuthShell>;
}

function PasswordField({ label, value, onChange, show, onToggle, autoComplete }: { label: string; value: string; onChange: (value: string) => void; show: boolean; onToggle: () => void; autoComplete: string }) {
  return <label className="block"><span className="label">{label}</span><span className="mt-1.5 flex rounded-lg border border-slate-300 bg-white focus-within:border-moss focus-within:ring-2 focus-within:ring-moss/15"><input className="w-full rounded-lg px-3 py-2 text-sm outline-none" type={show ? "text" : "password"} autoComplete={autoComplete} required value={value} onChange={(event) => onChange(event.target.value)} /><button className="px-3 text-slate-500" type="button" onClick={onToggle} aria-label={show ? "Hide password" : "Show password"}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button></span></label>;
}

function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return <main className="mx-auto max-w-md py-10"><section className="card p-6 sm:p-8"><p className="label">LabPilot account</p><h1 className="mt-1 text-2xl font-bold">{title}</h1>{subtitle && <p className="mt-2 text-sm text-slate-600">{subtitle}</p>}<div className="mt-6">{children}</div></section></main>;
}
