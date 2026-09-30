// History: today's impact numbers and the full log of who did what, when.
"use client";

import AppShell from "@/components/AppShell";
import HistoryTab from "@/components/HistoryTab";
import ImpactStrip from "@/components/ImpactStrip";
import { useControlRoom } from "@/components/useControlRoom";

export default function HistoryPage() {
  const data = useControlRoom();
  return (
    <AppShell data={data}>
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-3xl pb-10">
          <div className="space-y-4 px-5 pt-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">History</h1>
              <p className="text-slate-500">What happened today, and everything anyone did.</p>
            </div>
            {data.loaded && <ImpactStrip incidents={data.incidents} refreshKey={data.refreshKey} />}
          </div>
          <HistoryTab refreshKey={data.refreshKey} incidents={data.incidents} resources={data.resources} />
        </div>
      </div>
    </AppShell>
  );
}
