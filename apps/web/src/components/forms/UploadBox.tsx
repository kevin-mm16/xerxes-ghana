export type UploadState = "Idle" | "Uploading" | "Uploaded" | "Failed";

interface UploadBoxProps {
  state: UploadState;
  onSimulateUpload: () => void;
  onFail: () => void;
}

const stateText: Record<UploadState, string> = {
  Idle: "No file selected",
  Uploading: "Simulating private upload",
  Uploaded: "Evidence attached for private review",
  Failed: "Upload simulation failed",
};

export function UploadBox({ state, onSimulateUpload, onFail }: UploadBoxProps) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-[#cdd8cf] bg-[#fafbf9] p-6 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-forest-50 text-xl font-bold text-forest-800">
        UP
      </div>
      <p className="mt-3 font-semibold text-ink">Add image or video evidence</p>
      <p className="mt-1 text-sm text-muted">
        File storage is not connected yet. Use the controls below to preview upload states.
      </p>
      <p className="mt-3 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-muted">{stateText[state]}</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={onSimulateUpload}
          disabled={state === "Uploading"}
          className="rounded-xl bg-forest-600 px-4 py-2 text-sm font-bold text-white hover:bg-forest-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Preview upload
        </button>
        <button
          type="button"
          onClick={onFail}
          className="rounded-xl border border-line px-4 py-2 text-sm font-bold text-muted hover:bg-white"
        >
          Preview failure
        </button>
      </div>
    </div>
  );
}
