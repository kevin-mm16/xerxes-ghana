import type { UploadIntent, UploadStatus } from "@/types/api";
import { apiRequest } from "./api";

const imageLimit = 10 * 1024 * 1024;
const videoLimit = 50 * 1024 * 1024;
const fileTypes: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  mp4: "video/mp4",
  mov: "video/quicktime",
};

export function validateEvidenceFile(file: File) {
  const extension = file.name.split(".").at(-1)?.toLowerCase() ?? "";
  const expected = fileTypes[extension];
  if (!expected || (file.type && file.type !== expected)) {
    throw new Error("Choose a JPEG, PNG, WebP, MP4, or MOV file.");
  }
  if (!file.size) throw new Error("The selected file is empty.");
  const maximum = expected.startsWith("image/") ? imageLimit : videoLimit;
  if (file.size > maximum) {
    throw new Error(
      expected.startsWith("image/")
        ? "Images must be 10 MB or smaller."
        : "Videos must be 50 MB or smaller.",
    );
  }
  return {
    contentType: expected,
    mediaKind: expected.startsWith("image/")
      ? ("image" as const)
      : ("video" as const),
  };
}

export function createUploadIntent(file: File) {
  const { contentType } = validateEvidenceFile(file);
  return apiRequest<UploadIntent>("/uploads/intents", {
    method: "POST",
    body: JSON.stringify({
      filename: file.name,
      contentType,
      fileSize: file.size,
      consent: true,
    }),
  });
}

export function getUploadStatus(intent: UploadIntent, signal?: AbortSignal) {
  return apiRequest<UploadStatus>(`/uploads/${intent.id}`, {
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(12000)])
      : AbortSignal.timeout(12000),
    headers: { Authorization: `Bearer ${intent.uploadToken}` },
  });
}

export function uploadEvidence(
  intent: UploadIntent,
  file: File,
  onProgress: (percent: number) => void,
) {
  // Use only the known same-origin path. A server response must never redirect
  // this capability or private media to an arbitrary host.
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      intent.id,
    ) ||
    intent.uploadUrl !== `/api/v1/uploads/${intent.id}/content` ||
    file.size > intent.maxBytes
  ) {
    return Promise.reject(
      new Error(
        "The upload permission does not match this file. Please try again.",
      ),
    );
  }
  return new Promise<UploadStatus>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", intent.uploadUrl);
    request.timeout = 300000;
    request.setRequestHeader("Content-Type", "application/octet-stream");
    request.setRequestHeader("Authorization", `Bearer ${intent.uploadToken}`);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable)
        onProgress(
          Math.min(100, Math.round((event.loaded / event.total) * 100)),
        );
    };
    request.onerror = () =>
      reject(
        new Error(
          "The upload connection failed. Your file remains private; you can retry.",
        ),
      );
    request.ontimeout = () =>
      reject(new Error("The upload timed out. You can retry this submission."));
    request.onabort = () =>
      reject(
        new Error("The upload was interrupted. You can retry this submission."),
      );
    request.onload = () => {
      let body: UploadStatus & { detail?: string };
      try {
        body = JSON.parse(request.responseText);
      } catch {
        reject(
          new Error(
            "The upload service returned an invalid response. Please retry.",
          ),
        );
        return;
      }
      if (request.status < 200 || request.status >= 300) {
        reject(
          new Error(
            typeof body.detail === "string"
              ? body.detail
              : "The file could not be uploaded. Please retry.",
          ),
        );
        return;
      }
      if (body.id !== intent.id || !body.processingStatus) {
        reject(
          new Error(
            "The upload service returned an invalid receipt. Please retry.",
          ),
        );
        return;
      }
      onProgress(100);
      resolve(body);
    };
    request.send(file);
  });
}

export function mediaFailureMessage(status: UploadStatus) {
  if (
    status.errorCode === "tool_unavailable" ||
    status.errorCode === "processing_unavailable" ||
    status.errorCode === "processor_unavailable"
  ) {
    return "Your file is stored privately, but processing is unavailable. It has not been approved or published.";
  }
  return "Your file could not be prepared for review. The observation remains private and has not been published.";
}
