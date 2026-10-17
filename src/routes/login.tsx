import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Mail, ShieldCheck, UserRound } from "lucide-react";
import { btnPrimary } from "@/components/dalala/chrome";
import { authEnabled, signIn, signInWithEmail, signUpWithEmail } from "@/lib/auth/client";
import { dict } from "@/lib/i18n";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — BULTUM COMPANY" }] }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const copy = dict("en");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "signup") {
        if (name.trim().length < 2) throw new Error("Please enter your name.");
        if (password.length < 8) throw new Error("Password must be at least 8 characters.");
        await signUpWithEmail(name.trim(), email.trim(), password);
      } else {
        await signInWithEmail(email.trim(), password);
      }
      await navigate({ to: "/$locale", params: { locale: "en" }, replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setError("");
    setGoogleBusy(true);
    try {
      await signIn("google", { callbackURL: "/en", errorCallbackURL: "/login" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
      setGoogleBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-5 safe-top safe-bottom">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-md flex-col justify-center">
        <Link to="/" className="mb-5 inline-flex w-fit items-center gap-2 text-sm font-bold text-muted">
          <ArrowLeft className="size-4" /> Back
        </Link>

        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_20px_70px_rgba(15,23,42,.10)]">
          <div className="bg-[linear-gradient(135deg,#071a33,#0b3b69_58%,#f3b700)] px-6 pb-8 pt-7 text-white">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white p-2 shadow-lg"><img src="/icons/bultum-logo.svg" alt="BULTUM COMPANY — Cars & Machinery" className="h-16 w-16 rounded-xl object-contain" /></div>
              <div>
                <p className="text-2xl font-black tracking-tight">BULTUM COMPANY</p>
                <p className="text-sm font-semibold text-white/80">Cars & Machinery</p>
              </div>
            </div>
            <div className="mt-8">
              <p className="text-xs font-black uppercase tracking-[.22em] text-[#ffd33d]">Secure account</p>
              <h1 className="mt-2 font-display text-4xl font-bold">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
              <p className="mt-2 text-sm leading-6 text-white/75">Buy, sell, save listings and manage your vehicle or machinery inventory from one account.</p>
            </div>
          </div>

          <div className="p-5 sm:p-7">
            <div className="mb-5 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
              <button type="button" onClick={() => { setMode("signin"); setError(""); }} className={mode === "signin" ? "min-h-11 rounded-xl bg-white text-sm font-black shadow-sm" : "min-h-11 rounded-xl text-sm font-bold text-slate-500"}>Sign in</button>
              <button type="button" onClick={() => { setMode("signup"); setError(""); }} className={mode === "signup" ? "min-h-11 rounded-xl bg-white text-sm font-black shadow-sm" : "min-h-11 rounded-xl text-sm font-bold text-slate-500"}>Create account</button>
            </div>

            <button type="button" disabled={!authEnabled || googleBusy} onClick={google} className="flex min-h-12 w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-900 shadow-sm transition hover:border-slate-300 disabled:opacity-60">
              <GoogleIcon /> {googleBusy ? "Connecting to Google…" : "Continue with Google"}
            </button>

            <div className="my-5 flex items-center gap-3 text-xs font-bold text-slate-400"><span className="h-px flex-1 bg-slate-200" /><span>OR EMAIL</span><span className="h-px flex-1 bg-slate-200" /></div>

            <form onSubmit={submit} className="space-y-4">
              {mode === "signup" ? <label className="field"><span>Full name</span><span className="relative"><UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="pl-10" required /></span></label> : null}
              <label className="field"><span>Email address</span><span className="relative"><Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="pl-10" required /></span></label>
              <label className="field"><span>Password</span><span className="relative"><input type={showPassword ? "text" : "password"} autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" className="pr-12" required /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((v) => !v)} className="absolute right-2 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-xl text-slate-500">{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></span></label>

              {error ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div> : null}

              <button disabled={busy || !authEnabled} className={`${btnPrimary} w-full rounded-2xl bg-[#0b5cab] text-base font-black hover:bg-[#084b8e] disabled:opacity-60`} type="submit">
                {busy ? "Please wait…" : mode === "signin" ? "Sign in to BULTUM" : "Create BULTUM account"}
              </button>
            </form>

            <div className="mt-5 grid gap-2 text-xs text-slate-500">
              <div className="flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald" /> Your account stays with you across phone and web.</div>
              <div className="flex items-center gap-2"><ShieldCheck className="size-4 text-emerald" /> Passwords are handled by BULTUM's server-side authentication.</div>
            </div>
          </div>
        </section>

        <p className="mt-5 text-center text-xs text-slate-500">By continuing, you agree to use BULTUM COMPANY responsibly when buying or selling vehicles and machinery.</p>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true"><path fill="#4285F4" d="M21.35 12.23c0-.72-.06-1.41-.18-2.08H12v3.94h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.25Z"/><path fill="#34A853" d="M12 21.72c2.63 0 4.84-.87 6.45-2.35l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.53A9.75 9.75 0 0 0 12 21.72Z"/><path fill="#FBBC05" d="M6.54 13.81A5.86 5.86 0 0 1 6.23 12c0-.63.11-1.24.31-1.81V7.66H3.3A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.06 1.05 4.34l3.24-2.53Z"/><path fill="#EA4335" d="M12 6.16c1.43 0 2.71.49 3.72 1.46l2.79-2.79C16.84 3.16 14.63 2.28 12 2.28a9.75 9.75 0 0 0-8.7 5.38l3.24 2.53c.77-2.31 2.92-4.03 5.46-4.03Z"/></svg>;
}
