"use client";

import { useId, useRef, useState, type DragEvent } from "react";
import { cn } from "@/utils/cn";
import { Icon } from "./Icon";

export function UploadZone({
  onFile,
  file,
  accept,
  error,
  disabled,
  onError,
  label = "Image or video (optional)",
}: {
  onFile: (file?: File) => void;
  file?: File;
  accept?: string;
  error?: string;
  disabled?: boolean;
  onError?: (message: string) => void;
  label?: string;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    if (event.dataTransfer.files.length > 1) {
      onError?.("Attach one image or video at a time.");
      return;
    }
    if (event.dataTransfer.files[0]) onFile(event.dataTransfer.files[0]);
  }
  return (
    <div
      role="group"
      aria-label="Evidence upload"
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={drop}
    >
      <label
        htmlFor={id}
        className={cn(
          "ui-upload-zone",
          dragging && "ui-upload-zone--dragging",
          disabled && "pointer-events-none opacity-50",
          error && "ui-upload-zone--error",
        )}
      >
        <input
          ref={input}
          id={id}
          type="file"
          aria-label={label}
          className="sr-only"
          accept={accept}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : `${id}-help`}
          onChange={(event) => onFile(event.target.files?.[0])}
        />
        <Icon name={file ? "file" : "upload"} className="h-7 w-7 text-muted" />
        <span className="mt-4 block text-base font-semibold">
          {file ? "Replace your attachment" : "Add an image or video"}
        </span>
        <span className="mt-2 block text-sm text-muted">
          Drop one file here, or{" "}
          <span className="font-semibold text-forest-600 underline underline-offset-4">
            choose a file
          </span>
        </span>
        <span id={`${id}-help`} className="mt-5 block text-[11px] text-muted">
          JPEG, PNG, WebP, MP4 or MOV
        </span>
      </label>
      {file && (
        <div className="mt-3 flex min-w-0 items-center gap-3 border border-line bg-white/50 px-4 py-3">
          <Icon
            name={file.type.startsWith("video/") ? "video" : "image"}
            className="h-4 w-4 text-muted"
          />
          <div className="min-w-0 flex-1">
            <p className="break-all text-sm font-medium">{file.name}</p>
            <p className="mt-1 font-mono text-[11px] text-muted">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              onFile();
              if (input.current) input.current.value = "";
            }}
            className="shrink-0 text-xs font-semibold underline underline-offset-4"
          >
            Remove file
          </button>
        </div>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="ui-field-error mt-2">
          {error}
        </p>
      )}
    </div>
  );
}
