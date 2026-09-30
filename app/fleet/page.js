// Fleet: every vehicle grouped by job and type, crew radio updates, add or remove units, hospitals and shelters.
"use client";

import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import UnitsTab from "@/components/UnitsTab";
import { useControlRoom } from "@/components/useControlRoom";

export default function FleetPage() {
  const data = useControlRoom();
  const router = useRouter();
  return (
    <AppShell data={data}>
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-3xl pb-10">
          <div className="px-5 pt-6">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fleet</h1>
            <p className="text-slate-500">Every ambulance, fire truck and rescue team, and where they are needed.</p>
          </div>
          {!data.loaded ? <p className="px-5 py-10 text-center text-sm text-slate-400">Loading the fleet…</p> : <UnitsTab resources={data.resources} incidents={data.incidents} onChanged={data.load}
            onUnitSaved={data.saveUnit} onUnitRemoved={data.dropUnit}
            // A vehicle broke down on a job: go back to the control room and watch the AI find a replacement.
            onAskAI={({ resourceId }) => router.push(`/?replan=${resourceId}`)} />}
        </div>
      </div>
    </AppShell>
  );
}
