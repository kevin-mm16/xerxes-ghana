interface AuditTrailProps {
  items: string[];
  exampleItems?: string[];
}

export function AuditTrail({ items, exampleItems = [] }: AuditTrailProps) {
  return (
    <section
      id="session-activity"
      aria-labelledby="activity-heading"
      className="scroll-mt-6 border-t border-[#d9ddd6] px-5 py-5"
    >
      <h3 id="activity-heading" className="text-sm font-semibold">
        Session activity
      </h3>
      <p className="mt-1 text-xs leading-5 text-[#65706a]">
        Local demo actions only. This is not a persistent audit log.
      </p>
      {items.length ? (
        <ol className="mt-4 space-y-3">
          {items.map((item, index) => (
            <li
              key={`${index}-${item}`}
              className="flex gap-3 text-xs leading-5 text-[#48564e]"
            >
              <span className="font-mono text-[10px] text-[#65706a]">
                {String(items.length - index).padStart(2, "0")}
              </span>
              <p>{item}</p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 text-xs text-[#65706a]">
          No demo decisions in this session.
        </p>
      )}
      {exampleItems.length ? (
        <details className="mt-5 border-t border-[#e4e7e0] pt-4 text-xs text-[#65706a]">
          <summary className="cursor-pointer font-medium">
            Example audit sequence
          </summary>
          <ol className="mt-3 list-inside list-decimal space-y-2 leading-5">
            {exampleItems.map((item) => (
              <li key={item}>
                {item}{" "}
                <span className="text-[10px] uppercase tracking-wide">
                  / sample
                </span>
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </section>
  );
}
