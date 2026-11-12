interface VerificationChecklistProps {
  items: string[];
}

export function VerificationChecklist({ items }: VerificationChecklistProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <h2 className="font-bold">Verification checklist</h2>
      <div className="mt-4 space-y-3">
        {items.map((item, index) => (
          <label key={item} className="flex items-center gap-3 text-sm text-slate-700">
            <input type="checkbox" defaultChecked={index < 3} className="h-4 w-4 accent-forest-600" />
            {item}
          </label>
        ))}
      </div>
    </section>
  );
}
