import { afterEach, expect, it, vi } from "vitest";
import { uploadEvidence, validateEvidenceFile } from "@/services/uploads";

const id = "a7218b1c-8d89-4d26-80dc-40f3f40546b5";
const intent = {
  id,
  uploadUrl: `/api/v1/uploads/${id}/content`,
  uploadToken: "private-test-token",
  expiresAt: new Date(Date.now() + 60000).toISOString(),
  maxBytes: 1000,
};

afterEach(() => vi.unstubAllGlobals());

it("sends binary file bytes with a scoped header and reports upload progress", async () => {
  const open = vi.fn(),
    header = vi.fn(),
    send = vi.fn();
  const status = { id, mediaKind: "video", processingStatus: "quarantined" };
  vi.stubGlobal(
    "XMLHttpRequest",
    class {
      status = 200;
      responseText = JSON.stringify(status);
      timeout = 0;
      upload = {
        onprogress: undefined as
          | undefined
          | ((event: {
              lengthComputable: boolean;
              loaded: number;
              total: number;
            }) => void),
      };
      onload?: () => void;
      open = open;
      setRequestHeader = header;
      send(file: File) {
        send(file);
        this.upload.onprogress?.({
          lengthComputable: true,
          loaded: 3,
          total: 6,
        });
        queueMicrotask(() => this.onload?.());
      }
    },
  );
  const file = new File(["bytes"], "test.mp4", { type: "video/mp4" });
  const progress = vi.fn();
  expect(await uploadEvidence(intent, file, progress)).toEqual(status);
  expect(open).toHaveBeenCalledWith("PUT", `/api/v1/uploads/${id}/content`);
  expect(header).toHaveBeenCalledWith(
    "Authorization",
    `Bearer ${intent.uploadToken}`,
  );
  expect(header).toHaveBeenCalledWith(
    "Content-Type",
    "application/octet-stream",
  );
  expect(send).toHaveBeenCalledWith(file);
  expect(progress.mock.calls.map(([value]) => value)).toEqual([50, 100]);
});

it("refuses to send private bytes or a capability to a different upload URL", async () => {
  const xhr = vi.fn();
  vi.stubGlobal("XMLHttpRequest", xhr);
  const file = new File(["bytes"], "test.mp4", { type: "video/mp4" });
  await expect(
    uploadEvidence(
      { ...intent, uploadUrl: "https://example.com/upload" },
      file,
      vi.fn(),
    ),
  ).rejects.toThrow("permission does not match");
  expect(xhr).not.toHaveBeenCalled();
});

it("accepts an allowed extension when browser MIME information is absent", () => {
  expect(validateEvidenceFile(new File(["bytes"], "photo.JPEG"))).toEqual({
    contentType: "image/jpeg",
    mediaKind: "image",
  });
  expect(() =>
    validateEvidenceFile(
      new File(["bytes"], "photo.png", { type: "text/html" }),
    ),
  ).toThrow("Choose a JPEG");
});
