"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/utils/cn";
import { IconButton } from "./Button";

export function Popover({
  title,
  onClose,
  children,
  className,
  open = true,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  open?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const headingId = useId();
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        previous?.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="false"
      aria-labelledby={headingId}
      className={cn("ui-popover", className)}
    >
      <div className="ui-overlay-heading">
        <h2 id={headingId} className="text-sm font-semibold">
          {title}
        </h2>
        <IconButton
          icon="x"
          label={`Close ${title.toLowerCase()}`}
          onClick={onClose}
          size="sm"
        />
      </div>
      {children}
    </div>
  );
}
export function Sheet(props: Parameters<typeof Popover>[0]) {
  return <Popover {...props} className={cn("ui-sheet", props.className)} />;
}
export function Tooltip({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <span className="ui-tooltip" title={label}>
      {children}
    </span>
  );
}
export function Tabs({
  items,
  value,
  onChange,
  label = "Views",
}: {
  items: Array<{
    id: string;
    label: string;
    count?: number;
    disabled?: boolean;
  }>;
  value: string;
  onChange: (id: string) => void;
  label?: string;
}) {
  return (
    <div className="ui-tabs" role="group" aria-label={label}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          disabled={item.disabled}
          aria-pressed={value === item.id}
          className={cn("ui-tab", value === item.id && "ui-tab--active")}
          onClick={() => onChange(item.id)}
        >
          {item.label}
          {item.count !== undefined && (
            <span className="ui-tab-count">{item.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
