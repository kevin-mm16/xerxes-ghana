"use client";

export function MapSourceStatus({
  label,
  provider,
  timelineVisible,
  children,
}: {
  label: string;
  provider: string;
  timelineVisible?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      role="status"
      data-provider={provider}
      className={`absolute left-3 z-[450] max-w-[calc(100%-6rem)] border border-white/10 bg-[#172021]/90 px-2.5 py-1.5 text-[10px] leading-relaxed text-white/80 sm:max-w-[430px] ${timelineVisible ? "bottom-20" : "bottom-7"}`}
    >
      {label}
      {children}
    </div>
  );
}
