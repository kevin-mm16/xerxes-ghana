"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DashboardStat, Report, ReportStatus } from "@/types";
import { AuditTrail } from "@/components/admin/AuditTrail";
import { DashboardStats } from "@/components/admin/DashboardStats";
import { ReviewQueueTable } from "@/components/admin/ReviewQueueTable";
import { VerificationChecklist } from "@/components/admin/VerificationChecklist";
import { CoordinateMapPreview } from "@/components/map/BrowserMaps";
import { Badge, Button, Icon } from "@/components/ui";
import { auditTrail, verificationChecklist } from "@/data/mockDashboard";
import { mockReports } from "@/data/mockReports";
import { formatCoordinates, formatDate } from "@/utils/format";

export function ModeratorDashboard() {
  const [reports, setReports] = useState<Report[]>(mockReports);
  const [selectedId, setSelectedId] = useState(
    mockReports[1]?.id ?? mockReports[0]?.id,
  );
  const [mobileView, setMobileView] = useState<"queue" | "review">("queue");
  const [feedback, setFeedback] = useState("");
  const [sessionEvents, setSessionEvents] = useState<string[]>([]);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const decisionFeedback = useRef<HTMLParagraphElement>(null);
  const focusReview = useRef(false);
  const focusQueue = useRef(false);
  const selectedReport = useMemo(
    () => reports.find((report) => report.id === selectedId) ?? reports[0],
    [reports, selectedId],
  );

  useEffect(() => {
    if (focusReview.current) {
      reviewHeading.current?.focus();
      focusReview.current = false;
    }
    if (focusQueue.current) {
      document.getElementById("queue-heading")?.focus();
      focusQueue.current = false;
    }
  }, [selectedId, mobileView]);

  useEffect(() => {
    if (feedback) decisionFeedback.current?.focus();
  }, [feedback]);

  const stats: DashboardStat[] = [
    {
      label: "Sample reports",
      value: String(reports.length),
      detail: "",
      tone: "neutral",
    },
    {
      label: "Needs review",
      value: String(
        reports.filter((report) =>
          ["Pending", "Under Review"].includes(report.status),
        ).length,
      ),
      detail: "",
      tone: "warning",
    },
    {
      label: "Verified / demo",
      value: String(
        reports.filter((report) => report.status === "Verified").length,
      ),
      detail: "",
      tone: "success",
    },
    {
      label: "Escalated / demo",
      value: String(
        reports.filter((report) => report.status === "Escalated").length,
      ),
      detail: "",
      tone: "critical",
    },
  ];

  const selectReport = (report: Report) => {
    focusReview.current = true;
    setSelectedId(report.id);
    setMobileView("review");
    setFeedback("");
  };

  const changeStatus = (status: ReportStatus) => {
    if (selectedReport.status === status) return;
    setReports((current) =>
      current.map((report) =>
        report.id === selectedId ? { ...report, status } : report,
      ),
    );
    setFeedback(
      `Demo status changed to ${status}. This change lasts for this session; nothing was published or sent.`,
    );
    setSessionEvents((current) => [
      `${selectedReport.id}: ${selectedReport.status} to ${status} (demo).`,
      ...current,
    ]);
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1600px] px-4 py-6 sm:px-6 lg:px-7">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#65706a]">
            Operations / Ghana
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#172021]">
            Observation review
          </h1>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-[#65706a]">
            Synthetic queue for testing the review workflow. Live submissions
            and private media are not connected.
          </p>
        </div>
        <Badge tone="amber">DEMO WORKSPACE</Badge>
      </header>

      <DashboardStats stats={stats} />

      <div
        role="group"
        aria-label="Workspace view"
        className="mb-4 mt-5 grid grid-cols-2 gap-1 rounded-[5px] border border-[#d9ddd6] bg-[#e9ece5] p-1 lg:hidden"
      >
        <button
          type="button"
          aria-pressed={mobileView === "queue"}
          onClick={() => {
            focusQueue.current = true;
            setMobileView("queue");
          }}
          className={`min-h-10 rounded-[4px] px-3 text-xs font-semibold ${mobileView === "queue" ? "bg-[#fbfcf8] text-[#172021]" : "text-[#65706a]"}`}
        >
          Queue ({reports.length})
        </button>
        <button
          type="button"
          aria-pressed={mobileView === "review"}
          onClick={() => {
            focusReview.current = true;
            setMobileView("review");
          }}
          className={`min-h-10 rounded-[4px] px-3 text-xs font-semibold ${mobileView === "review" ? "bg-[#fbfcf8] text-[#172021]" : "text-[#65706a]"}`}
        >
          Review sample
        </button>
      </div>

      <div className="min-w-0 overflow-hidden rounded-[6px] border border-[#d9ddd6] bg-[#fbfcf8] lg:mt-6 lg:grid lg:grid-cols-[minmax(250px,0.8fr)_minmax(0,1.4fr)]">
        <div
          className={`min-w-0 lg:block lg:border-r lg:border-[#d9ddd6] ${mobileView === "queue" ? "block" : "hidden"}`}
        >
          <ReviewQueueTable
            reports={reports}
            selectedId={selectedId}
            onSelect={selectReport}
          />
        </div>
        <section
          id="review-workspace"
          aria-labelledby="review-heading"
          className={`min-w-0 scroll-mt-6 lg:block ${mobileView === "review" ? "block" : "hidden"}`}
        >
          <div className="border-b border-[#d9ddd6] px-5 py-4">
            <Button
              variant="ghost"
              size="sm"
              className="mb-3 -ml-2 lg:hidden"
              onClick={() => {
                focusQueue.current = true;
                setMobileView("queue");
              }}
            >
              <Icon name="arrow-left" className="h-4 w-4" />
              Back to queue
            </Button>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#65706a]">
                {selectedReport.id} / synthetic observation
              </span>
              <Badge
                tone={
                  selectedReport.status === "Verified"
                    ? "green"
                    : selectedReport.status === "Escalated" ||
                        selectedReport.status === "Rejected"
                      ? "red"
                      : "neutral"
                }
              >
                {selectedReport.status} / demo
              </Badge>
            </div>
            <h2
              id="review-heading"
              ref={reviewHeading}
              tabIndex={-1}
              className="mt-3 break-words text-lg font-semibold leading-6 tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-[#346c55]"
            >
              {selectedReport.title}
            </h2>
            <p className="mt-2 text-xs leading-5 text-[#65706a]">
              {selectedReport.approximateLocationLabel} /{" "}
              {selectedReport.region}
            </p>
          </div>

          <div className="px-5 py-5">
            <div className="flex min-h-32 flex-col items-center justify-center rounded-[4px] border border-dashed border-[#c9d0c7] bg-[#f0f2ec] px-5 py-6 text-center">
              <Icon name="file" className="h-5 w-5 text-[#65706a]" />
              <p className="mt-3 text-xs font-semibold text-[#48564e]">
                No live media in this workspace
              </p>
              <p className="mt-1 max-w-sm text-xs leading-5 text-[#65706a]">
                This sample references {selectedReport.mediaType.toLowerCase()}{" "}
                evidence. Uploaded files are not connected to this demo.
              </p>
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 text-xs">
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-[#65706a]">
                  Observed / sample
                </dt>
                <dd className="mt-1.5 font-medium">
                  {formatDate(selectedReport.dateObserved)}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-[#65706a]">
                  Severity / sample
                </dt>
                <dd
                  className={`mt-1.5 font-medium ${selectedReport.severity === "Critical" ? "text-[#9e3c32]" : ""}`}
                >
                  {selectedReport.severity}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-[10px] uppercase tracking-wider text-[#65706a]">
                  Sample assignment
                </dt>
                <dd className="mt-1.5 break-words font-medium">
                  {selectedReport.assignedModerator ?? "Unassigned"}
                </dd>
              </div>
            </dl>

            <h3 className="mb-2 mt-6 text-xs font-semibold">Sample summary</h3>
            <p className="text-xs leading-6 text-[#48564e]">
              {selectedReport.description}
            </p>

            <div className="mb-3 mt-6 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-semibold">
                Synthetic location preview
              </h3>
              <Badge tone="neutral">DEMO POINT</Badge>
            </div>
            <CoordinateMapPreview
              key={`${selectedReport.id}-${mobileView}`}
              coordinates={
                selectedReport.exactCoordinatesPrivate ??
                selectedReport.publicCoordinatesApproximate
              }
              label={selectedReport.approximateLocationLabel}
              severity={selectedReport.severity}
              zoom={11}
              heightClass="h-44 sm:h-52"
              showAttribution
              title="Synthetic sample point"
            />
            <p className="mt-3 font-mono text-[11px] text-[#48564e]">
              {formatCoordinates(
                (
                  selectedReport.exactCoordinatesPrivate ??
                  selectedReport.publicCoordinatesApproximate
                ).lat,
                (
                  selectedReport.exactCoordinatesPrivate ??
                  selectedReport.publicCoordinatesApproximate
                ).lng,
              )}
            </p>
            <p className="mt-1 text-[11px] leading-5 text-[#65706a]">
              Fixture coordinates only. Live capture locations remain private
              and are not loaded here.
            </p>
          </div>

          <VerificationChecklist
            key={selectedReport.id}
            items={verificationChecklist}
          />

          <section
            aria-labelledby="decision-heading"
            className="border-t border-[#d9ddd6] bg-[#f4f5ef] px-5 py-5"
          >
            <h3 id="decision-heading" className="text-sm font-semibold">
              Demo decision
            </h3>
            <p className="mt-1 text-xs leading-5 text-[#65706a]">
              Rehearse a status change. No real verification, publication,
              assignment or authority handoff occurs.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => changeStatus("Verified")}
                disabled={selectedReport.status === "Verified"}
              >
                Mark verified
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => changeStatus("Under Review")}
                disabled={selectedReport.status === "Under Review"}
              >
                Start review
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => changeStatus("Rejected")}
                disabled={selectedReport.status === "Rejected"}
              >
                Reject
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => changeStatus("Escalated")}
                disabled={selectedReport.status === "Escalated"}
              >
                Escalate
              </Button>
            </div>
            {feedback ? (
              <p
                ref={decisionFeedback}
                tabIndex={-1}
                role="status"
                className="mt-4 border-l-2 border-[#346c55] pl-3 text-xs leading-5 text-[#28513f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#346c55]"
              >
                {feedback}
              </p>
            ) : null}
          </section>

          <AuditTrail items={sessionEvents} exampleItems={auditTrail} />
        </section>
      </div>
      <p className="mt-4 text-[10px] leading-5 text-[#65706a]">
        Demo state resets on reload. Authentication, live intake review and
        persistent decisions are not connected.
      </p>
    </div>
  );
}
