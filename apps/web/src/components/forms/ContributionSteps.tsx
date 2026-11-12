import { Icon } from "@/components/ui";

export const contributionSteps = [
  "Location",
  "Evidence",
  "Details",
  "Review",
] as const;

export function ContributionSteps({
  current,
  disabled,
  onBack,
}: {
  current: number;
  disabled: boolean;
  onBack: (step: number) => void;
}) {
  return (
    <nav aria-label="Contribution steps">
      <ol className="grid grid-cols-4 gap-2 sm:gap-5">
        {contributionSteps.map((name, index) => (
          <li key={name} aria-current={current === index ? "step" : undefined}>
            {index < current ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() => onBack(index)}
                aria-label={`Go back to ${name}`}
                className="flex min-h-12 w-full items-center gap-2 border-b-2 border-forest-600 py-3 text-left text-xs font-semibold text-forest-600 sm:text-sm"
              >
                <Icon name="check" className="h-4 w-4 shrink-0" />
                {name}
              </button>
            ) : (
              <span
                className={`flex min-h-12 items-center gap-2 border-b-2 py-3 text-xs sm:text-sm ${current === index ? "border-ink font-semibold text-ink" : "border-line text-muted"}`}
              >
                <span className="text-[11px] tabular-nums opacity-65">
                  0{index + 1}
                </span>
                {name}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
