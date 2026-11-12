import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EvidenceFeedPage } from "@/views/EvidenceFeedPage";
import { ReportDetailsPage } from "@/views/ReportDetailsPage";
import { AboutSafetyPage } from "@/views/AboutSafetyPage";
import { useMapFeatures } from "@/hooks/useMapFeatures";
import type { IntelligenceFeature } from "@/types/intelligence";

const { publicMap } = vi.hoisted(() => ({ publicMap: vi.fn() }));
vi.mock("@/hooks/useMapFeatures", () => ({ useMapFeatures: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));
vi.mock("@/components/evidence/PublicLocationMap", () => ({
  PublicLocationMap: (props: unknown) => {
    publicMap(props);
    return <div>Generalized map preview</div>;
  },
}));

const id = "b205be00-95f7-4ce7-b81d-98e2819975fa";
const geometry = {
  type: "Point" as const,
  coordinates: [-2.1, 5.5] as [number, number],
};
const feature: IntelligenceFeature = {
  id,
  type: "citizen_observation",
  geometry,
  observedAt: "2026-11-04T12:00:00Z",
  properties: {
    layer: "observations",
    title: "Reviewed river observation",
    source: "XERSXES",
    status: "Verified",
    observationId: id,
    publicLabel: "Generalized river area",
    summary: "Reviewed public context.",
  },
};
const record = {
  id,
  title: feature.properties.title,
  description: "Reviewed public context.",
  observedAt: "2026-11-04T12:00:00Z",
  status: "approved",
  publicLocation: geometry,
  publicLabel: "Generalized river area",
  precisionLevel: "generalized area",
  captureLocation: { latitude: 5.123456789, longitude: -2.987654321 },
  originalIntake: "PRIVATE_INTAKE_SENTINEL",
  storageKey: "PRIVATE_STORAGE_SENTINEL",
  mediaUrl: "https://private.invalid/private-original.jpg",
};

beforeEach(() => {
  vi.mocked(useMapFeatures).mockReturnValue({
    features: [],
    loading: false,
    error: "",
    truncated: false,
    retry: vi.fn(),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("public evidence surfaces", () => {
  it("shows a calm empty state without fake media or observation counts", () => {
    const { container } = render(<EvidenceFeedPage />);
    expect(useMapFeatures).toHaveBeenCalledWith("observations");
    expect(
      screen.getByRole("heading", { name: "No public records yet" }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: /Contribute an observation/ })
        .getAttribute("href"),
    ).toBe("/report");
    expect(container.querySelector("img, video")).toBeNull();
  });

  it("renders dated, reviewed public records and excludes other layers or unreviewed rows", () => {
    vi.mocked(useMapFeatures).mockReturnValue({
      features: [
        feature,
        {
          ...feature,
          id: "private",
          properties: {
            ...feature.properties,
            title: "Unreviewed sentinel",
            status: undefined,
          },
        },
        {
          ...feature,
          id: "coverage",
          properties: {
            ...feature.properties,
            layer: "coverage",
            title: "Coverage sentinel",
          },
        },
      ],
      loading: false,
      error: "",
      truncated: false,
      retry: vi.fn(),
    });
    render(<EvidenceFeedPage />);
    expect(screen.getByText("4 Nov 2026")).toBeTruthy();
    expect(screen.getByText("Human reviewed")).toBeTruthy();
    expect(screen.getByText("Generalized river area")).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: /Open reviewed record:/ })
        .getAttribute("href"),
    ).toBe(`/reports/${id}`);
    expect(screen.queryByText("Unreviewed sentinel")).toBeNull();
    expect(screen.queryByText("Coverage sentinel")).toBeNull();
  });

  it("provides loading and retry states for the feed", async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    vi.mocked(useMapFeatures).mockReturnValue({
      features: [],
      loading: true,
      error: "",
      truncated: false,
      retry,
    });
    const { rerender } = render(<EvidenceFeedPage />);
    expect(
      screen.getByRole("status", { name: "Loading reviewed observations" }),
    ).toBeTruthy();
    vi.mocked(useMapFeatures).mockReturnValue({
      features: [],
      loading: false,
      error: "service unavailable",
      truncated: false,
      retry,
    });
    rerender(<EvidenceFeedPage />);
    expect(screen.getByRole("alert").textContent).toContain(
      "temporarily unavailable",
    );
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("renders only the public record contract and passes only generalized geometry to the map", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({ ok: true, status: 200, json: async () => record }),
    );
    const { container } = render(await ReportDetailsPage({ reportId: id }));
    expect(screen.getByRole("heading", { name: record.title })).toBeTruthy();
    expect(screen.getByText("Approved public summary")).toBeTruthy();
    expect(publicMap).toHaveBeenCalledWith({
      geometry,
      label: record.publicLabel,
    });
    expect(container.textContent).not.toContain("5.123456789");
    expect(container.textContent).not.toContain("PRIVATE_INTAKE_SENTINEL");
    expect(container.textContent).not.toContain("PRIVATE_STORAGE_SENTINEL");
    expect(container.innerHTML).not.toContain("private-original.jpg");
    expect(container.querySelector("img, video")).toBeNull();
  });

  it("keeps unknown and private records unavailable", async () => {
    const request = vi.fn();
    vi.stubGlobal("fetch", request);
    await expect(
      ReportDetailsPage({ reportId: "not-a-record" }),
    ).rejects.toThrow("NOT_FOUND");
    expect(request).not.toHaveBeenCalled();
    request.mockResolvedValue({ ok: false, status: 404 });
    await expect(ReportDetailsPage({ reportId: id })).rejects.toThrow(
      "NOT_FOUND",
    );
    request.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ...record, status: "pending" }),
    });
    await expect(ReportDetailsPage({ reportId: id })).rejects.toThrow(
      "NOT_FOUND",
    );
  });

  it("returns a useful public-record failure state on connection or response errors", async () => {
    const request = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", request);
    const { rerender } = render(await ReportDetailsPage({ reportId: id }));
    expect(
      screen.getByRole("heading", { name: "Record temporarily unavailable" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Try again" }).getAttribute("href"),
    ).toBe(`/reports/${id}`);
    request.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error("invalid JSON");
      },
    });
    rerender(await ReportDetailsPage({ reportId: id }));
    expect(
      screen.getByRole("heading", { name: "Record temporarily unavailable" }),
    ).toBeTruthy();
  });

  it("explains actual imagery, boundary and private-media limitations", () => {
    render(<AboutSafetyPage />);
    expect(
      screen.getByRole("heading", {
        name: "Imagery is context, not a live feed.",
      }),
    ).toBeTruthy();
    expect(screen.getByText(/representing 2007/)).toBeTruthy();
    expect(
      screen.getByText(/Original files are stored privately/),
    ).toBeTruthy();
    expect(screen.queryByText(/does not upload media/)).toBeNull();
  });
});
