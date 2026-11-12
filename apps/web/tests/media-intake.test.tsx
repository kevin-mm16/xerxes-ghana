import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReportSubmissionForm } from "@/components/forms/ReportSubmissionForm";
import { submitObservation } from "@/services/api";
import {
  createUploadIntent,
  getUploadStatus,
  uploadEvidence,
} from "@/services/uploads";

vi.mock("@/services/api", () => ({
  submitObservation: vi.fn(),
  checkCoverage: vi.fn(),
}));
vi.mock("@/services/uploads", async (original) => ({
  ...(await original<typeof import("@/services/uploads")>()),
  createUploadIntent: vi.fn(),
  getUploadStatus: vi.fn(),
  uploadEvidence: vi.fn(),
}));
const intent = {
  id: "a7218b1c-8d89-4d26-80dc-40f3f40546b5",
  uploadToken: "private-capability-test-token",
  uploadUrl: "/api/v1/uploads/a7218b1c-8d89-4d26-80dc-40f3f40546b5/content",
  expiresAt: new Date(Date.now() + 3600000).toISOString(),
  maxBytes: 50 * 1024 * 1024,
};
const media = {
  id: intent.id,
  processingStatus: "quarantined" as const,
  mediaKind: "video" as const,
};
const receipt = {
  id: "observation",
  status: "pending" as const,
  submittedAt: new Date().toISOString(),
  coverageState: "manual",
  media,
};

function fillContext() {
  fireEvent.change(screen.getByLabelText("Approximate area or landmark"), {
    target: { value: "Synthetic public landmark" },
  });
  fireEvent.change(screen.getByLabelText("What did you observe?"), {
    target: { value: "Synthetic test observation" },
  });
}
function selectVideo() {
  const file = new File(["synthetic test media"], "example.mp4", {
    type: "video/mp4",
  });
  fireEvent.change(screen.getByLabelText("Image or video (optional)"), {
    target: { files: [file] },
  });
  return file;
}

beforeEach(() => {
  vi.mocked(createUploadIntent).mockReset().mockResolvedValue(intent);
  vi.mocked(uploadEvidence).mockReset().mockResolvedValue(media);
  vi.mocked(getUploadStatus)
    .mockReset()
    .mockResolvedValue({ ...media, processingStatus: "review_ready" });
  vi.mocked(submitObservation).mockReset().mockResolvedValue(receipt);
});

describe("private media intake", () => {
  it("keeps file selection local and requires consent before any upload", async () => {
    render(<ReportSubmissionForm />);
    fillContext();
    selectVideo();
    expect(createUploadIntent).not.toHaveBeenCalled();
    expect(uploadEvidence).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Submit observation" }));
    await screen.findByText(
      "Agree to private storage and review before submitting.",
    );
    expect(createUploadIntent).not.toHaveBeenCalled();
    expect(submitObservation).not.toHaveBeenCalled();
  });

  it("rejects unsupported and oversized files before creating upload permissions", async () => {
    render(<ReportSubmissionForm />);
    fillContext();
    fireEvent.click(screen.getByRole("checkbox"));
    const large = new File(["synthetic"], "large.png", { type: "image/png" });
    Object.defineProperty(large, "size", { value: 10 * 1024 * 1024 + 1 });
    fireEvent.change(screen.getByLabelText("Image or video (optional)"), {
      target: { files: [large] },
    });
    await screen.findByText("Images must be 10 MB or smaller.");
    fireEvent.click(screen.getByRole("button", { name: "Submit observation" }));
    expect(createUploadIntent).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Image or video (optional)"), {
      target: {
        files: [new File(["x"], "document.svg", { type: "image/svg+xml" })],
      },
    });
    await screen.findByText("Choose a JPEG, PNG, WebP, MP4, or MOV file.");
    expect(createUploadIntent).not.toHaveBeenCalled();
  });

  it("does not submit observation metadata when file upload fails", async () => {
    vi.mocked(uploadEvidence).mockRejectedValueOnce(
      new Error("Upload connection failed"),
    );
    render(<ReportSubmissionForm />);
    fillContext();
    selectVideo();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Submit observation" }));
    await screen.findByText("Upload connection failed");
    expect(submitObservation).not.toHaveBeenCalled();
  });

  it("binds the upload to the observation and polls only its scoped processing status", async () => {
    render(<ReportSubmissionForm />);
    fillContext();
    const file = selectVideo();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Submit observation" }));
    await screen.findByText(
      "Your file has been processed and is ready for private review.",
    );
    expect(createUploadIntent).toHaveBeenCalledWith(file);
    expect(uploadEvidence).toHaveBeenCalledWith(
      intent,
      file,
      expect.any(Function),
    );
    expect(submitObservation).toHaveBeenCalledWith(
      expect.objectContaining({
        submissionId: expect.stringMatching(/^[0-9a-f-]{36}$/),
        media: { uploadId: intent.id, uploadToken: intent.uploadToken },
        consent: true,
      }),
    );
    expect(getUploadStatus).toHaveBeenCalledWith(
      intent,
      expect.any(AbortSignal),
    );
    expect(document.body.textContent).not.toContain(intent.uploadToken);
    expect(screen.queryByRole("video")).toBeNull();
  });

  it("retries metadata with the same submission ID and uploaded file permission", async () => {
    vi.mocked(submitObservation).mockRejectedValueOnce(
      new Error("Temporary service error"),
    );
    render(<ReportSubmissionForm />);
    fillContext();
    selectVideo();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Submit observation" }));
    await screen.findByText("Temporary service error");
    const first = vi.mocked(submitObservation).mock.calls[0][0];
    fireEvent.click(screen.getByRole("button", { name: "Submit observation" }));
    await screen.findByText("Saved for private review");
    expect(createUploadIntent).toHaveBeenCalledTimes(1);
    expect(uploadEvidence).toHaveBeenCalledTimes(1);
    expect(vi.mocked(submitObservation).mock.calls[1][0]).toEqual(first);
  });

  it("shows processing failure without implying the file is public", async () => {
    vi.mocked(getUploadStatus).mockResolvedValue({
      ...media,
      processingStatus: "failed",
      errorCode: "invalid_content",
    });
    render(<ReportSubmissionForm />);
    fillContext();
    selectVideo();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Submit observation" }));
    await waitFor(() =>
      expect(
        screen.getByTestId("media-processing-status").textContent,
      ).toContain("could not be prepared for review"),
    );
    expect(document.body.textContent).toContain("has not been published");
  });
});
