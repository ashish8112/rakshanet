"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "@/components/api";
import { Button, ErrorNote } from "@/components/ui";
import { ThemeButton } from "@/components/theme";
import { VideoDialog } from "@/components/AppShell";

function LoginForm() {
  const params = useSearchParams();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const res = await signIn(name, password);
    if (res.ok) {
      const next = params.get("next");
      window.location.href = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
      return;
    }
    setError(res.error?.message ?? "Could not sign in.");
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-slate-700">Your name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          autoComplete="name"
          placeholder="e.g. Priya"
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-slate-700">Control room password</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          placeholder="Ask your supervisor"
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        />
      </label>
      <ErrorNote message={error} />
      <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!name.trim()}>
        Sign in
      </Button>
    </form>
  );
}

export default function LoginPage() {
  const [showVideo, setShowVideo] = useState(false);
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-slate-50 to-blue-50 px-4 py-10">
      <ThemeButton className="absolute right-4 top-4" />
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-2xl text-white shadow-lg shadow-blue-200">
            🛡️
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">RakshaNet</h1>
          <p className="mt-1 text-slate-500">Bengaluru emergency control room</p>
        </div>

        <div className="rounded-3xl bg-white p-7 shadow-xl shadow-slate-200/60 ring-1 ring-slate-200">
          <h2 className="mb-1 text-lg font-semibold text-slate-900">Sign in to start your shift</h2>
          <p className="mb-6 text-sm text-slate-500">Only control room staff can open the dashboard.</p>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          AI suggests plans. You approve every decision.
        </p>
        <p className="mt-3 text-center">
          <button type="button" onClick={() => setShowVideo(true)} className="text-sm font-medium text-blue-700 underline underline-offset-4 hover:text-blue-800">
            ▶ Watch the demo video
          </button>
        </p>
        {showVideo && <VideoDialog onClose={() => setShowVideo(false)} />}
      </div>
    </main>
  );
}
