"use client";

import Link from "next/link";
import { Eye, EyeOff, Loader2, Save } from "lucide-react";
import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
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
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMessage("Password updated. Redirecting...");
      setTimeout(() => { window.location.href = "/"; }, 900);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update password. Open the reset link again and try once more.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="mx-auto max-w-md py-10"><section className="card p-6 sm:p-8"><p className="label">LabPilot account</p><h1 className="mt-1 text-2xl font-bold">Choose a new password</h1><p className="mt-2 text-sm text-slate-600">Use the recovery link from your email, then set a new password here.</p><form className="mt-6 space-y-4" onSubmit={submit}><PasswordField label="New password" value={password} onChange={setPassword} show={showPassword} onToggle={() => setShowPassword((value) => !value)} /><PasswordField label="Confirm new password" value={confirmPassword} onChange={setConfirmPassword} show={showConfirm} onToggle={() => setShowConfirm((value) => !value)} />{error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}{message && <p className="rounded-lg bg-mist p-3 text-sm text-moss">{message}</p>}<button className="btn-primary w-full" disabled={loading}>{loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} {loading ? "Saving..." : "Update password"}</button></form><p className="mt-5 text-sm text-slate-600"><Link className="text-moss underline" href="/login">Back to login</Link></p></section></main>;
}

function PasswordField({ label, value, onChange, show, onToggle }: { label: string; value: string; onChange: (value: string) => void; show: boolean; onToggle: () => void }) {
  return <label className="block"><span className="label">{label}</span><span className="mt-1.5 flex rounded-lg border border-slate-300 bg-white focus-within:border-moss focus-within:ring-2 focus-within:ring-moss/15"><input className="w-full rounded-lg px-3 py-2 text-sm outline-none" type={show ? "text" : "password"} autoComplete="new-password" required value={value} onChange={(event) => onChange(event.target.value)} /><button className="px-3 text-slate-500" type="button" onClick={onToggle} aria-label={show ? "Hide password" : "Show password"}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button></span></label>;
}
