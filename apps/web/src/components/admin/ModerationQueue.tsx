"use client";

import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  EmptyState,
  Icon,
  Input,
  SectionLabel,
} from "@/components/ui";
import type { QueueObservation } from "@/types/moderation";
import { formatDate } from "@/utils/format";

export function ModerationQueue({
  items,
  total,
  selectedId,
  busy,
  hasMore,
  onSelect,
  onMore,
}: {
  items: QueueObservation[];
  total: number;
  selectedId?: string;
  busy: boolean;
  hasMore: boolean;
  onSelect: (id: string) => void;
  onMore: () => void;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const filtered = useMemo(
    () =>
      items.filter(
        (item) =>
          (status === "all" || item.reviewStatus === status) &&
          [item.title, item.id, item.coverageRegion?.name]
            .join(" ")
            .toLowerCase()
            .includes(search.trim().toLowerCase()),
      ),
    [items, search, status],
  );
  return (
    <section
      id="review-queue"
      aria-labelledby="queue-heading"
      className="min-w-0"
    >
      <div className="border-b border-line p-4">
        <div className="flex items-center justify-between gap-3">
          <h2
            id="queue-heading"
            tabIndex={-1}
            className="text-sm font-semibold"
          >
            Private review queue
          </h2>
          <span className="font-mono text-[10px] text-muted">
            {items.length} / {total}
          </span>
        </div>
        <label className="relative mt-4 block">
          <span className="sr-only">Search loaded observations</span>
          <Icon
            name="search"
            className="absolute left-3 top-3 h-4 w-4 text-muted"
          />
          <Input
            type="search"
            className="pl-9"
            placeholder="Search title, area or identifier"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <div
          className="mt-3 flex flex-wrap gap-1"
          role="group"
          aria-label="Filter loaded review queue"
        >
          {[
            ["all", "All"],
            ["pending", "Pending"],
            ["in_review", "In review"],
            ["approved", "Approved"],
          ].map(([id, label]) => (
            <Button
              key={id}
              size="sm"
              variant="ghost"
              aria-pressed={status === id}
              onClick={() => setStatus(id)}
              className={
                status === id ? "bg-forest-50 text-forest-800" : "text-muted"
              }
            >
              {label}
            </Button>
          ))}
        </div>
        <p className="mt-3 text-[10px] leading-5 text-muted">
          Search and status filters apply to loaded records.
        </p>
      </div>
      {!filtered.length ? (
        <EmptyState
          title={
            items.length
              ? "No matching observations"
              : "No private observations"
          }
          description={
            items.length
              ? "Try a different search or review state."
              : "New citizen submissions will appear here for authorized review."
          }
        />
      ) : (
        <ul className="divide-y divide-line">
          {filtered.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                disabled={busy}
                onClick={() => onSelect(item.id)}
                aria-pressed={selectedId === item.id}
                className={`block w-full border-l-2 p-4 text-left transition hover:bg-forest-50 disabled:opacity-60 ${selectedId === item.id ? "border-forest-600 bg-forest-50" : "border-transparent"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <SectionLabel className="break-all font-mono text-[9px]">
                    {item.id.slice(0, 8)}
                  </SectionLabel>
                  <Badge
                    tone={
                      item.publicationStatus === "published"
                        ? "green"
                        : item.reviewStatus === "rejected"
                          ? "red"
                          : "neutral"
                    }
                  >
                    {item.publicationStatus === "published"
                      ? "Published"
                      : item.reviewStatus.replaceAll("_", " ")}
                  </Badge>
                </div>
                <h3 className="mt-3 break-words text-sm font-semibold leading-6">
                  {item.title || "Untitled private observation"}
                </h3>
                <p className="mt-1 text-xs text-muted">
                  {item.coverageRegion?.name ?? "Coverage needs review"}
                </p>
                <div className="mt-3 flex flex-wrap justify-between gap-2 text-[10px] text-muted">
                  <span>Submitted {formatDate(item.submittedAt)}</span>
                  <span>
                    {item.media
                      ? `${item.media.mediaKind} · ${item.media.processingStatus.replaceAll("_", " ")}`
                      : "Text only"}
                  </span>
                </div>
                <p className="mt-2 text-[10px] text-muted">
                  {item.assignee
                    ? `Assigned to ${item.assignee.username}`
                    : "Unassigned"}
                </p>
                {item.riskFlags.length > 0 && (
                  <p className="mt-2 text-[10px] leading-5 text-warning">
                    {item.riskFlags
                      .map((flag) => flag.replaceAll("_", " "))
                      .join(" · ")}
                  </p>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {hasMore && (
        <div className="border-t border-line p-4">
          <Button
            size="sm"
            variant="secondary"
            onClick={onMore}
            disabled={busy}
          >
            Load more observations
          </Button>
        </div>
      )}
    </section>
  );
}
