"use client";

import { useMemo, useState } from "react";
import type { Report, ReportStatus } from "@/types";
import { AuditTrail } from "@/components/admin/AuditTrail";
import { DashboardStats } from "@/components/admin/DashboardStats";
import { PriorityQueue } from "@/components/admin/PriorityQueue";
import { ReviewQueueTable } from "@/components/admin/ReviewQueueTable";
import { VerificationChecklist } from "@/components/admin/VerificationChecklist";
import { CoordinateMapPreview } from "@/components/map/BrowserMaps";
import { SafetyNotice } from "@/components/ui/SafetyNotice";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  dashboardStats,
  auditTrail,
  verificationChecklist,
} from "@/data/mockDashboard";
import { mockReports } from "@/data/mockReports";

export function ModeratorDashboard() {
  const [reports, setReports] = useState<Report[]>(mockReports);
  const [selectedId, setSelectedId] = useState(
    mockReports[1]?.id ?? mockReports[0]?.id,
  );

  const selectedReport = useMemo(
    () => reports.find((report) => report.id === selectedId) ?? reports[0],
    [reports, selectedId],
  );

  const changeStatus = (reportId: string, status: ReportStatus) => {
    setReports((current) =>
      current.map((report) =>
        report.id === reportId ? { ...report, status } : report,
      ),
    );
    setSelectedId(reportId);
  };

  return (
    <>
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-earth">
              Moderator workspace
            </p>
            <h1 className="mt-3 font-serif text-4xl font-medium leading-tight text-slate-950">
              Review and verification dashboard
            </h1>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">
              Private moderator workspace for triage, verification, assignment,
              duplicate detection, and escalation workflows.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-card">
            <span className="font-bold text-slate-950">
              Demo workspace (not connected to live intake):
            </span>{" "}
            XERSXES Western Review Desk
          </div>
        </div>

        <SafetyNotice title="Moderator data warning" tone="admin">
          Raw media, exact coordinates, and internal verification notes are
          private moderator-only data. Do not export, screenshot, or share
          outside authorized channels.
        </SafetyNotice>

        <DashboardStats stats={dashboardStats} />

        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <ReviewQueueTable
              reports={reports}
              onSelect={(report) => setSelectedId(report.id)}
              onStatusChange={changeStatus}
            />
          </div>

          <div className="space-y-6">
            <PriorityQueue
              reports={reports}
              onSelect={(report) => setSelectedId(report.id)}
            />
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold">Report review panel</h2>
                  <p className="mt-1 text-sm text-slate-500">Selected report</p>
                </div>
                <StatusBadge status={selectedReport.status} compact />
              </div>
              <h3 className="mt-4 text-lg font-bold leading-snug">
                {selectedReport.title}
              </h3>
              <div className="mt-4">
                <CoordinateMapPreview
                  coordinates={
                    selectedReport.exactCoordinatesPrivate ??
                    selectedReport.publicCoordinatesApproximate
                  }
                  label={selectedReport.approximateLocationLabel}
                  severity={selectedReport.severity}
                  zoom={11}
                  heightClass="h-52"
                  title="Private coordinate map"
                />
              </div>
              <dl className="mt-4 grid gap-3 text-sm text-slate-700">
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                    Public location
                  </dt>
                  <dd className="mt-1">
                    {selectedReport.approximateLocationLabel}
                  </dd>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                  <dt className="text-xs font-bold uppercase tracking-[0.12em] text-red-700">
                    Private exact coordinates
                  </dt>
                  <dd className="mt-1 font-mono text-sm text-red-950">
                    {selectedReport.exactCoordinatesPrivate
                      ? `${selectedReport.exactCoordinatesPrivate.lat}, ${selectedReport.exactCoordinatesPrivate.lng}`
                      : "Not captured"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                    Duplicate detection
                  </dt>
                  <dd className="mt-1">
                    Placeholder checks nearby reports and similar media hashes.
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                    Escalation
                  </dt>
                  <dd className="mt-1">
                    Placeholder decision record for authority handoff.
                  </dd>
                </div>
              </dl>
            </section>
            <VerificationChecklist items={verificationChecklist} />
            <AuditTrail items={auditTrail} />
          </div>
        </div>
      </div>
    </>
  );
}
