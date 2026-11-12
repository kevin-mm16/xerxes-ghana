"use client";

import { useMemo, useState } from "react";
import type { Report } from "@/types";
import { Badge, Button, Icon, Input } from "@/components/ui";
import { formatDate } from "@/utils/format";

interface ReviewQueueTableProps {
  reports: Report[];
  selectedId: string;
  onSelect: (report: Report) => void;
}

const filters = [
  { id: "all", label: "All" },
  { id: "pending", label: "Needs review" },
  { id: "critical", label: "Critical" },
] as const;

export function ReviewQueueTable({
  reports,
  selectedId,
  onSelect,
}: ReviewQueueTableProps) {
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("all");
  const [search, setSearch] = useState("");
  const visibleReports = useMemo(() => {
    const query = search.trim().toLowerCase();
    return reports.filter((report) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "critical" && report.severity === "Critical") ||
        (filter === "pending" &&
          ["Pending", "Under Review"].includes(report.status));
      return (
        matchesFilter &&
        `${report.title} ${report.region} ${report.district}`
          .toLowerCase()
          .includes(query)
      );
    });
  }, [reports, filter, search]);

  return (
    <section
      id="review-queue"
      aria-labelledby="queue-heading"
      className="min-w-0 scroll-mt-6"
    >
      <header className="border-b border-[#d9ddd6] p-4">
        <div className="flex items-center justify-between gap-3">
          <h2
            id="queue-heading"
            tabIndex={-1}
            className="text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[#346c55]"
          >
            Review queue
          </h2>
          <span aria-live="polite" className="font-mono text-xs text-[#65706a]">
            {visibleReports.length} / {reports.length}
          </span>
        </div>
        <label className="relative mt-4 block">
          <span className="sr-only">Search sample reports</span>
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#65706a]"
          />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search title or area"
            className="min-w-0 pl-9"
          />
        </label>
        <div
          role="group"
          aria-label="Filter sample reports"
          className="mt-3 flex flex-wrap gap-1"
        >
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
              className={`min-h-9 rounded-[4px] px-3 text-xs font-medium transition-colors ${filter === item.id ? "bg-[#e5ece5] text-[#28513f]" : "text-[#65706a] hover:bg-[#f0f2ec] hover:text-[#172021]"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>
      <ul
        aria-label="Sample observations"
        className="divide-y divide-[#e4e7e0]"
      >
        {visibleReports.map((report) => (
          <li key={report.id}>
            <button
              type="button"
              onClick={() => onSelect(report)}
              aria-pressed={selectedId === report.id}
              aria-controls="review-workspace"
              className={`block w-full min-w-0 border-l-2 p-4 text-left transition-colors ${selectedId === report.id ? "border-[#346c55] bg-[#edf1e9]" : "border-transparent hover:bg-[#f5f6f0]"}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#65706a]">
                  {report.id}
                </span>
                <span
                  className={`text-[10px] font-medium ${report.severity === "Critical" ? "text-[#9e3c32]" : "text-[#65706a]"}`}
                >
                  {report.severity} severity
                </span>
              </div>
              <h3 className="mt-2 break-words text-sm font-semibold leading-5 text-[#172021]">
                {report.title}
              </h3>
              <p className="mt-1 break-words text-xs leading-5 text-[#65706a]">
                {report.district} / {report.region}
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <Badge
                  tone={
                    report.status === "Verified"
                      ? "green"
                      : report.status === "Escalated" ||
                          report.status === "Rejected"
                        ? "red"
                        : report.status === "Under Review"
                          ? "amber"
                          : "neutral"
                  }
                >
                  {report.status}
                </Badge>
                <span className="text-[10px] text-[#65706a]">
                  {formatDate(report.dateSubmitted)}
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>
      {visibleReports.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="text-sm font-medium">No matching samples</p>
          <p className="mt-2 text-xs leading-5 text-[#65706a]">
            Try another area or remove the filter.
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-4"
            onClick={() => {
              setSearch("");
              setFilter("all");
            }}
          >
            Clear filters
          </Button>
        </div>
      ) : null}
    </section>
  );
}
