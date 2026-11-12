import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/utils/cn";

export type Tone = "neutral" | "green" | "gold" | "amber" | "red";
const badgeTones = {
  neutral: "ui-badge--neutral",
  green: "ui-badge--green",
  gold: "ui-badge--gold",
  amber: "ui-badge--amber",
  red: "ui-badge--red",
};
export function Badge({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span className={cn("ui-badge", badgeTones[tone], className)} {...props} />
  );
}
export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("ui-panel", className)} {...props} />;
}
export function SectionLabel({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("ui-section-label", className)} {...props} />;
}
export function Divider({ className }: { className?: string }) {
  return <hr className={cn("ui-divider", className)} />;
}
export function Toolbar({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div role="group" className={cn("ui-toolbar", className)} {...props} />
  );
}
export function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="ui-metric">
      <p className="ui-section-label">{label}</p>
      <p className="ui-metric-value">{value}</p>
      {hint && <p className="ui-field-help">{hint}</p>}
    </div>
  );
}
