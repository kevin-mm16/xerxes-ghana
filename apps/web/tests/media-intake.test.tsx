import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  fireEvent.click(screen.getByRole("button", { name: "Continue to evidence" }));
}
function reviewObservation() {
  fireEvent.click(screen.getByRole("button", { name: "Continue to details" }));
  fireEvent.change(
    screen.getByRole("textbox", { name: "What did you observe?" }),
    {
      target: { value: "Synthetic test observation" },
    },
  );
  fireEvent.click(screen.getByRole("button", { name: "Continue to review" }));
}
function selectVideo() {
  const file = new File(["synthetic test media"], "example.mp4", {
    type: "video/mp4",
  });
  fireEvent.change(screen.getByLabelText(/Image or video \(optional\)/), {
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
    reviewObservation();
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
    const large = new File(["synthetic"], "large.png", { type: "image/png" });
    Object.defineProperty(large, "size", { value: 10 * 1024 * 1024 + 1 });
    fireEvent.change(screen.getByLabelText(/Image or video \(optional\)/), {
      target: { files: [large] },
    });
    await screen.findByText("Images must be 10 MB or smaller.");
    fireEvent.click(
      screen.getByRole("button", { name: "Continue to details" }),
    );
    expect(
      screen.getByRole("heading", { name: "Add supporting evidence" }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Choose a supported file or remove the attachment to continue.",
      ),
    ).toBeTruthy();
    expect(document.activeElement).toHaveProperty("id", "contribution-error");
    expect(createUploadIntent).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/Image or video \(optional\)/), {
      target: {
        files: [new File(["x"], "document.svg", { type: "image/svg+xml" })],
      },
    });
    await screen.findByText("Choose a JPEG, PNG, WebP, MP4, or MOV file.");
    expect(createUploadIntent).not.toHaveBeenCalled();
  });

  it("keeps a chosen file through back navigation and supports removing it without uploading", async () => {
    const user = userEvent.setup();
    render(<ReportSubmissionForm />);
    fillContext();
    const file = new File(["synthetic image"], "river.png", {
      type: "image/png",
    });
    await user.upload(
      screen.getByLabelText(/Image or video \(optional\)/),
      file,
    );
    expect(screen.getByText("river.png")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Continue to details" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("river.png")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Remove file" }));
    expect(screen.queryByText("river.png")).toBeNull();
    expect(createUploadIntent).not.toHaveBeenCalled();
    expect(uploadEvidence).not.toHaveBeenCalled();
  });

  it("accepts a single dropped file locally and rejects a multiple-file drop", async () => {
    render(<ReportSubmissionForm />);
    fillContext();
    const file = new File(["synthetic image"], "river.png", {
      type: "image/png",
    });
    const dropZone = screen.getByText("Add an image or video");
    fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });
    expect(screen.getByText("river.png")).toBeTruthy();
    fireEvent.drop(screen.getByText("Replace your attachment"), {
      dataTransfer: { files: [file, file] },
    });
    await screen.findByText("Attach one image or video at a time.");
    expect(createUploadIntent).not.toHaveBeenCalled();
    expect(uploadEvidence).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Remove file" }));
    expect(
      screen.queryByText("Attach one image or video at a time."),
    ).toBeNull();
  });

  it("does not submit observation metadata when file upload fails", async () => {
    vi.mocked(uploadEvidence).mockRejectedValueOnce(
      new Error("Upload connection failed"),
    );
    render(<ReportSubmissionForm />);
    fillContext();
    selectVideo();
    reviewObservation();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Submit observation" }));
    await screen.findByText("Upload connection failed");
    expect(submitObservation).not.toHaveBeenCalled();
  });

  it("shows transfer progress and prevents repeated submission while an upload is active", async () => {
    let finishUpload!: (status: typeof media) => void;
    vi.mocked(uploadEvidence).mockImplementation(
      (_intent, _file, onProgress) => {
        onProgress(37);
        return new Promise((resolve) => {
          finishUpload = resolve;
        });
      },
    );
    render(<ReportSubmissionForm />);
    fillContext();
    selectVideo();
    reviewObservation();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Submit observation" }));
    expect(
      await screen.findByRole("progressbar", {
        name: "Private upload progress",
      }),
    ).toHaveProperty("value", 37);
    expect(screen.getByRole("button", { name: "Submitting…" })).toHaveProperty(
      "disabled",
      true,
    );
    expect(screen.getByRole("button", { name: "Back" })).toHaveProperty(
      "disabled",
      true,
    );
    expect(submitObservation).not.toHaveBeenCalled();
    await act(async () => finishUpload(media));
    await screen.findByText("Saved for private review");
    expect(uploadEvidence).toHaveBeenCalledTimes(1);
  });

  it("binds the upload to the observation and polls only its scoped processing status", async () => {
    render(<ReportSubmissionForm />);
    fillContext();
    const file = selectVideo();
    reviewObservation();
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
    reviewObservation();
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
    reviewObservation();
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
