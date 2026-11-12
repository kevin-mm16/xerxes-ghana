interface FilterChipProps {
  label: string;
  value?: string;
  onRemove?: () => void;
}

export function FilterChip({ label, value, onRemove }: FilterChipProps) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-forest-50 bg-forest-50 px-3 py-1.5 text-xs font-semibold text-forest-800">
      <span>
        {label}
        {value ? `: ${value}` : null}
      </span>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="rounded-full px-1 text-forest-800 hover:bg-white"
          aria-label={`Remove ${label} filter`}
        >
          x
        </button>
      ) : null}
    </span>
  );
}
