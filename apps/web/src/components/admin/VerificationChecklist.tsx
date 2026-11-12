interface VerificationChecklistProps {
  items: string[];
}

export function VerificationChecklist({ items }: VerificationChecklistProps) {
  return (
    <section
      id="review-checklist"
      aria-labelledby="checklist-heading"
      className="scroll-mt-6 border-t border-[#d9ddd6] px-5 py-5"
    >
      <h3 id="checklist-heading" className="text-sm font-semibold">
        Review checklist
      </h3>
      <p className="mt-1 text-xs leading-5 text-[#65706a]">
        Practice only. Checks do not validate evidence or save to the server.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <label
            key={item}
            className="flex cursor-pointer items-start gap-2.5 text-xs leading-5 text-[#48564e]"
          >
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 rounded-sm accent-[#346c55]"
            />
            {item}
          </label>
        ))}
      </div>
    </section>
  );
}
