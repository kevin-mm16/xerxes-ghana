"use client";

import { useEffect, useRef } from "react";
import { IconButton } from "@/components/ui";

export function MapPanel({
  title,
  id,
  onClose,
  children,
}: {
  title: string;
  id: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = panel.current;
    element?.focus();
    function outside(event: PointerEvent) {
      if (!panel.current?.contains(event.target as Node)) onClose();
    }
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("pointerdown", outside);
      if (
        document.activeElement === document.body ||
        element?.contains(document.activeElement)
      )
        previous?.focus();
    };
  }, [onClose]);
  return (
    <section
      ref={panel}
      role="dialog"
      aria-labelledby={`${id}-title`}
      id={id}
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
        if (event.key === "Tab") {
          const items = panel.current?.querySelectorAll<HTMLElement>(
            'button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], [tabindex="0"]',
          );
          const first = items?.[0];
          const last = items?.[items.length - 1];
          if (!first || !last) return;
          if (
            event.shiftKey &&
            (document.activeElement === first ||
              document.activeElement === panel.current)
          ) {
            event.preventDefault();
            last.focus();
          } else if (
            !event.shiftKey &&
            (document.activeElement === last ||
              document.activeElement === panel.current)
          ) {
            event.preventDefault();
            first.focus();
          }
        }
      }}
      className="absolute bottom-3 left-3 right-3 z-[640] max-h-[62dvh] overflow-y-auto rounded-md border border-line bg-paper p-4 shadow-lift outline-none sm:bottom-auto sm:right-auto sm:top-16 sm:max-h-[calc(100%-7rem)] sm:w-80"
    >
      <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
        <h2 id={`${id}-title`} className="text-sm font-semibold text-ink">
          {title}
        </h2>
        <IconButton
          icon="x"
          label={`Close ${title.toLowerCase()}`}
          variant="ghost"
          size="sm"
          onClick={onClose}
        />
      </div>
      {children}
    </section>
  );
}
