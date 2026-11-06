import type { VerificationEvent } from "@/types";
import { cn } from "@/utils/cn";
import { formatDate } from "@/utils/format";

interface VerificationTimelineProps {
  events: VerificationEvent[];
}

const eventClasses = {
  complete: "bg-forest-600",
  current: "bg-warning",
  pending: "bg-slate-300",
};

export function VerificationTimeline({ events }: VerificationTimelineProps) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-card">
      <h2 className="text-lg font-bold">Verification timeline</h2>
      <div className="mt-5 space-y-4">
        {events.map((event) => (
          <div key={event.id} className="flex gap-3">
            <span className={cn("mt-1.5 h-3 w-3 shrink-0 rounded-full", eventClasses[event.status])} />
            <div>
              <div className="flex flex-wrap items-baseline gap-2">
                <h3 className="font-semibold">{event.label}</h3>
                <span className="text-xs text-faint">{formatDate(event.date)}</span>
              </div>
              <p className="mt-1 text-sm leading-6 text-muted">{event.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
