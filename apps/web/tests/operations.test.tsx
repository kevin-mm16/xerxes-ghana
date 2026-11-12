import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModeratorDashboard } from "@/components/admin/ModeratorDashboard";
import { ModeratorLoginForm } from "@/components/admin/ModeratorLoginForm";
import { ModeratorLayout } from "@/components/layout/ModeratorLayout";
import * as api from "@/services/moderation";
import type {
  ModerationObservation,
  PublicationDraft,
  QueueObservation,
  ReviewerSession,
} from "@/types/moderation";

const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/services/moderation", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/services/moderation")>();
  return {
    ...original,
    getReviewerSession: vi.fn(),
    loginReviewer: vi.fn(),
    logoutReviewer: vi.fn(),
    getReviewQueue: vi.fn(),
    getReviewDetail: vi.fn(),
    assignReview: vi.fn(),
    saveReviewedLocation: vi.fn(),
    savePublicationDraft: vi.fn(),
    getPublicLocationPreview: vi.fn(),
    decideReview: vi.fn(),
    preparePublicMedia: vi.fn(),
    publishObservation: vi.fn(),
    withdrawObservation: vi.fn(),
  };
});
vi.mock("@/components/evidence/PublicLocationMap", () => ({
  PublicLocationMap: () => <div>Generalized public location preview</div>,
}));
vi.mock("next/dynamic", () => ({
  default:
    () =>
    ({ onPoint }: { onPoint: (point: [number, number]) => void }) => (
      <button onClick={() => onPoint([-1.7, 6.1])}>
        Choose reviewed activity point on map
      </button>
    ),
}));

const id = "a7218b1c-8d89-4d26-80dc-40f3f40546b5";
const secondId = "a7218b1c-8d89-4d26-80dc-40f3f40546b6";
const identity: ReviewerSession = {
  authenticated: true,
  reviewer: {
    id: "reviewer-id",
    username: "synthetic-reviewer",
    role: "moderator",
  },
  csrfToken: "PRIVATE_CSRF_SENTINEL",
  expiresAt: new Date(Date.now() + 3600000).toISOString(),
};
function detail(
  overrides: Partial<ModerationObservation> = {},
): ModerationObservation {
  return {
    id,
    title: "Controlled private observation",
    submittedAt: "2026-01-01T10:00:00Z",
    observedAt: "2026-01-01",
    coverageState: "inside",
    coverageRegion: {
      id: "region-id",
      name: "Synthetic region",
      code: "GHA-TEST",
    },
    media: {
      id: "media-id",
      processingStatus: "review_ready",
      mediaKind: "video",
      mimeType: "video/mp4",
      filename: "synthetic.mp4",
      fileSize: 1024,
      sha256: "test-sha",
      duplicateCount: 0,
      reviewUrl: `/api/v1/moderation/observations/${id}/media/review`,
      thumbnailUrl: `/api/v1/moderation/observations/${id}/media/thumbnail`,
    },
    reviewStatus: "in_review",
    publicationStatus: "not_published",
    assignee: {
      id: identity.reviewer.id,
      username: identity.reviewer.username,
    },
    riskFlags: [],
    privateDescription: "PRIVATE_INTAKE_DESCRIPTION_SENTINEL",
    manualLocation: null,
    captureLocation: {
      latitude: 5.501234,
      longitude: -1.501234,
      accuracyMeters: 12,
      capturedAt: "2026-01-01T10:00:00Z",
      source: "browser-geolocation",
    },
    observationLocation: null,
    sanitizedTitle: "",
    sanitizedSummary: "",
    mediaDecision: "undecided",
    publicLocationPolicy: "grid",
    privacyChecklist: {
      summaryReviewed: false,
      locationReviewed: false,
      identifiersClear: false,
    },
    publicMedia: null,
    audit: [],
    ...overrides,
  };
}
function queueItem(value = detail()): QueueObservation {
  return {
    id: value.id,
    title: value.title,
    submittedAt: value.submittedAt,
    observedAt: value.observedAt,
    coverageState: value.coverageState,
    coverageRegion: value.coverageRegion,
    reviewStatus: value.reviewStatus,
    publicationStatus: value.publicationStatus,
    assignee: value.assignee,
    riskFlags: value.riskFlags,
    media: value.media
      ? {
          id: value.media.id,
          processingStatus: value.media.processingStatus,
          mediaKind: value.media.mediaKind,
        }
      : null,
  };
}
beforeEach(() => {
  router.replace.mockReset();
  vi.mocked(api.getReviewerSession).mockResolvedValue(
    structuredClone(identity),
  );
  vi.mocked(api.loginReviewer).mockResolvedValue(structuredClone(identity));
  vi.mocked(api.logoutReviewer).mockResolvedValue(undefined);
  vi.mocked(api.getReviewQueue).mockResolvedValue({
    items: [queueItem()],
    total: 1,
    hasMore: false,
  });
  vi.mocked(api.getReviewDetail).mockResolvedValue(detail());
  vi.mocked(api.assignReview).mockResolvedValue(detail());
  vi.mocked(api.saveReviewedLocation).mockResolvedValue(
    detail({
      observationLocation: {
        geometry: { type: "Point", coordinates: [-1.7, 6.1] },
        reviewedAt: "2026-01-02T10:00:00Z",
        reviewedBy: identity.reviewer.id,
      },
    }),
  );
  vi.mocked(api.savePublicationDraft).mockImplementation(
    async (_id, _csrf, draft) => detail({ ...draft }),
  );
  vi.mocked(api.preparePublicMedia).mockResolvedValue(
    detail({
      publicMedia: {
        id: "public-media-id",
        processingStatus: "ready",
        mediaKind: "video",
      },
    }),
  );
  vi.mocked(api.decideReview).mockResolvedValue(
    detail({ reviewStatus: "approved" }),
  );
  vi.mocked(api.publishObservation).mockResolvedValue(
    detail({ reviewStatus: "approved", publicationStatus: "published" }),
  );
  vi.mocked(api.withdrawObservation).mockResolvedValue(
    detail({
      reviewStatus: "approved",
      publicationStatus: "withdrawn",
      audit: [
        {
          id: "event-id",
          action: "withdrawn",
          reviewerId: identity.reviewer.id,
          createdAt: "2026-01-02T10:00:00Z",
          details: {},
        },
      ],
    }),
  );
});
async function openRecord() {
  await screen.findByRole("heading", { name: "Private review queue" });
  await userEvent.click(
    screen.getByRole("button", { name: /Controlled private observation/ }),
  );
  return screen.findByRole("heading", {
    name: "Controlled private observation",
    level: 2,
  });
}

describe("authenticated operations", () => {
  it("signs in through the server and does not offer demo access", async () => {
    const user = userEvent.setup();
    render(<ModeratorLoginForm />);
    await user.type(screen.getByLabelText(/Username/), "synthetic-reviewer");
    await user.type(
      screen.getByLabelText(/Password/),
      "synthetic test password",
    );
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(api.loginReviewer).toHaveBeenCalledWith(
      "synthetic-reviewer",
      "synthetic test password",
    );
    expect(router.replace).toHaveBeenCalledWith("/moderator/dashboard");
    expect(screen.queryByRole("link", { name: /demo/i })).toBeNull();
  });
  it("shows denied login and clears password instead of faking a session", async () => {
    vi.mocked(api.loginReviewer).mockRejectedValue(
      new api.ReviewerRequestError("Invalid credentials", 401),
    );
    const user = userEvent.setup();
    render(<ModeratorLoginForm />);
    await user.type(screen.getByLabelText(/Username/), "synthetic-reviewer");
    await user.type(screen.getByLabelText(/Password/), "incorrect");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Invalid credentials")).toBeTruthy();
    expect((screen.getByLabelText(/Password/) as HTMLInputElement).value).toBe(
      "",
    );
    expect(router.replace).not.toHaveBeenCalled();
  });
  it("redirects unauthenticated visitors before fetching private queue or detail", async () => {
    vi.mocked(api.getReviewerSession).mockRejectedValue(
      new api.ReviewerRequestError("Reviewer authentication is required", 401),
    );
    render(<ModeratorDashboard />);
    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith("/moderator/login"),
    );
    expect(api.getReviewQueue).not.toHaveBeenCalled();
    expect(api.getReviewDetail).not.toHaveBeenCalled();
    expect(
      screen.queryByText("PRIVATE_INTAKE_DESCRIPTION_SENTINEL"),
    ).toBeNull();
  });
  it("loads real queue data but only loads sensitive detail on an explicit open", async () => {
    render(<ModeratorDashboard />);
    await screen.findByRole("heading", { name: "Private review queue" });
    expect(screen.getByText("Select an observation")).toBeTruthy();
    expect(api.getReviewDetail).not.toHaveBeenCalled();
    expect(
      screen.queryByText("PRIVATE_INTAKE_DESCRIPTION_SENTINEL"),
    ).toBeNull();
    expect(screen.queryByText(/5\.501234/)).toBeNull();
    const heading = await openRecord();
    expect(api.getReviewDetail).toHaveBeenCalledWith(
      id,
      expect.any(AbortSignal),
    );
    expect(
      screen.getByText("PRIVATE_INTAKE_DESCRIPTION_SENTINEL"),
    ).toBeTruthy();
    expect(heading).toBe(document.activeElement);
    expect(
      screen.queryByText("Choose reviewed activity point on map"),
    ).toBeNull();
  });
  it("keeps capture context separate and saves only a deliberate reviewed point", async () => {
    const user = userEvent.setup();
    render(<ModeratorDashboard />);
    await openRecord();
    expect(
      (screen.getByLabelText(/Activity latitude/) as HTMLInputElement).value,
    ).toBe("");
    expect(
      (screen.getByLabelText(/Activity longitude/) as HTMLInputElement).value,
    ).toBe("");
    await user.click(
      screen.getByRole("button", { name: "Open private location map" }),
    );
    await user.click(
      screen.getByRole("button", {
        name: "Choose reviewed activity point on map",
      }),
    );
    await user.type(
      screen.getByLabelText(/Location review reason/),
      "Synthetic activity position reviewed from the evidence.",
    );
    await user.click(
      screen.getByRole("button", { name: "Save reviewed location" }),
    );
    expect(api.saveReviewedLocation).toHaveBeenCalledWith(
      id,
      identity.csrfToken,
      -1.7,
      6.1,
      "Synthetic activity position reviewed from the evidence.",
    );
    expect(api.publishObservation).not.toHaveBeenCalled();
  });
  it("requires saved privacy certification before preparing a distinct public derivative", async () => {
    const user = userEvent.setup();
    render(<ModeratorDashboard />);
    await openRecord();
    expect(
      screen
        .getByRole("button", { name: "Prepare public derivative" })
        .hasAttribute("disabled"),
    ).toBe(true);
    await user.type(
      screen.getByLabelText(/Sanitized public title/),
      "Sanitized public record",
    );
    await user.type(
      screen.getByLabelText(/Sanitized public summary/),
      "Safe public evidence summary.",
    );
    await user.selectOptions(
      screen.getByLabelText(/Public media decision/),
      "publish",
    );
    for (const checkbox of screen.getAllByRole("checkbox"))
      await user.click(checkbox);
    await user.click(screen.getByRole("button", { name: "Save public draft" }));
    const expected: PublicationDraft = {
      sanitizedTitle: "Sanitized public record",
      sanitizedSummary: "Safe public evidence summary.",
      mediaDecision: "publish",
      publicLocationPolicy: "grid",
      privacyChecklist: {
        summaryReviewed: true,
        locationReviewed: true,
        identifiersClear: true,
      },
    };
    expect(api.savePublicationDraft).toHaveBeenCalledWith(
      id,
      identity.csrfToken,
      expected,
    );
    await user.click(
      screen.getByRole("button", { name: "Prepare public derivative" }),
    );
    expect(api.preparePublicMedia).toHaveBeenCalledWith(id, identity.csrfToken);
    expect(api.publishObservation).not.toHaveBeenCalled();
  });
  it("keeps approval and publication as separate server actions", async () => {
    const user = userEvent.setup();
    render(<ModeratorDashboard />);
    await openRecord();
    expect(
      screen
        .getByRole("button", { name: "Publish observation" })
        .hasAttribute("disabled"),
    ).toBe(true);
    await user.click(
      screen.getByRole("button", { name: "Approve observation" }),
    );
    expect(api.decideReview).toHaveBeenCalledWith(
      id,
      identity.csrfToken,
      "approve",
      undefined,
    );
    expect(api.publishObservation).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", { name: "Publish observation" }),
    );
    expect(api.publishObservation).toHaveBeenCalledWith(id, identity.csrfToken);
    expect(
      await screen.findByRole("link", { name: /Open public record/ }),
    ).toBeTruthy();
  });
  it("withdraws a real publication while retaining private detail and durable events", async () => {
    vi.mocked(api.getReviewDetail).mockResolvedValue(
      detail({ reviewStatus: "approved", publicationStatus: "published" }),
    );
    const user = userEvent.setup();
    render(<ModeratorDashboard />);
    await openRecord();
    await user.click(
      screen.getByRole("button", { name: "Withdraw publication" }),
    );
    expect(api.withdrawObservation).toHaveBeenCalledWith(
      id,
      identity.csrfToken,
      undefined,
    );
    expect(
      screen.getByText("PRIVATE_INTAKE_DESCRIPTION_SENTINEL"),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Durable review activity" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("link", { name: /Open public record/ }),
    ).toBeNull();
  });
  it("does not transfer unsaved privacy checks to another observation", async () => {
    const second = detail({
      id: secondId,
      title: "Another controlled observation",
    });
    vi.mocked(api.getReviewQueue).mockResolvedValue({
      items: [queueItem(), queueItem(second)],
      total: 2,
      hasMore: false,
    });
    vi.mocked(api.getReviewDetail).mockImplementation(async (requested) =>
      requested === secondId ? second : detail(),
    );
    const user = userEvent.setup();
    render(<ModeratorDashboard />);
    await openRecord();
    await user.click(screen.getAllByRole("checkbox")[0]);
    expect(
      (screen.getAllByRole("checkbox")[0] as HTMLInputElement).checked,
    ).toBe(true);
    await user.click(
      screen.getByRole("button", { name: /Another controlled observation/ }),
    );
    await screen.findByRole("heading", {
      name: "Another controlled observation",
      level: 2,
    });
    expect(
      (screen.getAllByRole("checkbox")[0] as HTMLInputElement).checked,
    ).toBe(false);
  });
  it("never loads arbitrary media URLs or exposes an unprovided original link", async () => {
    vi.mocked(api.getReviewDetail).mockResolvedValue(
      detail({
        media: {
          ...detail().media!,
          reviewUrl: "https://untrusted.invalid/private",
          originalUrl: "/private/object-key",
        },
      }),
    );
    const { container } = render(<ModeratorDashboard />);
    await openRecord();
    expect(
      screen.queryByRole("button", { name: "Open private review media" }),
    ).toBeNull();
    expect(screen.queryByText(/Download private original/)).toBeNull();
    expect(container.querySelector("video")).toBeNull();
  });
  it("logs out through the authenticated API with its in-memory CSRF token", async () => {
    const user = userEvent.setup();
    render(<ModeratorDashboard />);
    await screen.findByRole("heading", { name: "Private review queue" });
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(api.logoutReviewer).toHaveBeenCalledWith(identity.csrfToken);
    expect(router.replace).toHaveBeenCalledWith("/moderator/login");
  });
  it("removes demo chrome from the real operations layout", () => {
    render(
      <ModeratorLayout>
        <p>Protected child placeholder</p>
      </ModeratorLayout>,
    );
    expect(screen.getByText("Private workspace")).toBeTruthy();
    expect(screen.queryByText("DEMO")).toBeNull();
    expect(
      within(screen.getByRole("navigation", { name: "Operations" }))
        .getByRole("link", { name: "Public draft" })
        .getAttribute("href"),
    ).toBe("#publication-draft");
  });
});
