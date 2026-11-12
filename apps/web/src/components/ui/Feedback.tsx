import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/utils/cn";
import { Icon } from "./Icon";
import type { Tone } from "./Surface";
const alertTones = {
  neutral: "ui-alert--neutral",
  green: "ui-alert--green",
  gold: "ui-alert--gold",
  amber: "ui-alert--amber",
  red: "ui-alert--red",
};

export function Alert({
  tone = "neutral",
  title,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { tone?: Tone }) {
  return (
    <div
      className={cn("ui-alert", alertTones[tone], className)}
      role={tone === "red" ? "alert" : undefined}
      {...props}
    >
      <Icon
        name={
          tone === "green"
            ? "check"
            : tone === "red" || tone === "amber"
              ? "alert"
              : "info"
        }
        className="mt-0.5 h-4 w-4"
      />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        <div className="leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
export function EmptyState({
  title,
  description,
  children,
  icon = "file",
}: {
  title: string;
  description: string;
  children?: ReactNode;
  icon?: string;
}) {
  return (
    <div className="ui-empty">
      <Icon name={icon} className="mb-5 h-8 w-8 text-faint" />
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-3 max-w-md text-sm leading-7 text-muted">
        {description}
      </p>
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}
export function Skeleton({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("ui-skeleton", className)}
      {...props}
    />
  );
}
export function Progress({
  value,
  label = "Progress",
}: {
  value?: number;
  label?: string;
}) {
  return (
    <div className="ui-progress-wrap">
      <div className="mb-2 flex justify-between gap-4 text-xs text-muted">
        <span>{label}</span>
        {value !== undefined && (
          <span className="font-mono tabular-nums">{Math.round(value)}%</span>
        )}
      </div>
      <progress
        max="100"
        value={value}
        aria-label={label}
        className="ui-progress"
      />
    </div>
  );
}
