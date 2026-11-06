interface AnonymousToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function AnonymousToggle({ checked, onChange }: AnonymousToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-4 rounded-2xl border border-line bg-[#fafbf9] p-4 text-left"
      aria-pressed={checked}
    >
      <span
        className={`relative h-7 w-12 rounded-full transition ${checked ? "bg-forest-600" : "bg-slate-300"}`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </span>
      <span>
        <span className="block font-bold text-ink">Report anonymously</span>
        <span className="mt-1 block text-sm text-muted">
          Anonymous reports do not require your name, phone number, or email.
        </span>
      </span>
    </button>
  );
}
