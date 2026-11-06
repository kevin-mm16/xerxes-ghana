interface AuditTrailProps {
  items: string[];
}

export function AuditTrail({ items }: AuditTrailProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <h2 className="font-bold">Audit trail</h2>
      <div className="mt-4 space-y-3">
        {items.map((item, index) => (
          <div key={item} className="flex gap-3 text-sm">
            <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-slate-400" />
            <div>
              <p className="font-semibold text-slate-800">{item}</p>
              <p className="text-xs text-slate-500">Mock event {index + 1}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
