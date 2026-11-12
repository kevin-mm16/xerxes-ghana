import type { ReactNode } from "react";

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function SectionHeader({ eyebrow, title, description, action }: SectionHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        {eyebrow ? (
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-forest-600">{eyebrow}</p>
        ) : null}
        <h1 className="font-serif text-4xl font-medium leading-tight tracking-tight text-ink md:text-5xl">
          {title}
        </h1>
        {description ? <p className="mt-3 max-w-2xl text-base leading-7 text-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
