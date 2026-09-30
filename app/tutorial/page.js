// Public tutorial page (no sign-in needed): the video with an English or Hindi voice-over.
"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ThemeButton } from "@/components/theme";

// The player remembers the chosen language in the browser, so it is only drawn there.
const TutorialPlayer = dynamic(() => import("@/components/TutorialPlayer"), {
  ssr: false,
  loading: () => <div className="aspect-video w-full bg-slate-900" />,
});

export default function TutorialPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-blue-700">🛡️ RakshaNet</p>
            <h1 className="text-2xl font-bold text-slate-900">How to use RakshaNet — video tutorial</h1>
            <p className="text-slate-600">5 minutes · voice in English or हिंदी</p>
          </div>
          <ThemeButton />
        </div>
        <div className="overflow-hidden rounded-3xl bg-white shadow-xl">
          <TutorialPlayer autoPlay={false} />
        </div>
        <p className="mt-5 text-center text-slate-600">
          Work in the control room?{" "}
          <Link href="/login" className="font-semibold text-blue-700 hover:underline">
            Sign in →
          </Link>
        </p>
      </div>
    </main>
  );
}
