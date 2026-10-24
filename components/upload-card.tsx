"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { ArrowRight, ArrowUp, Check, FileUp, LoaderCircle, LockKeyhole, UploadCloud, X } from "lucide-react";
import type { MeetingStatus } from "@/types/meeting";

const ACCEPTED_FILE_TYPES = "audio/*,video/*,.pdf,.txt,.md,.csv";
const ACCEPTED_EXTENSIONS = [".pdf", ".txt", ".md", ".csv"];
const MAX_FILE_SIZE = 500 * 1024 * 1024;

const isSupportedFile = (file: File) => {
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  return file.type.startsWith("audio/") || file.type.startsWith("video/") || ACCEPTED_EXTENSIONS.includes(extension);
};

export function UploadCard({ authenticated, onSignIn, onUpload }: { authenticated: boolean; onSignIn: () => void; onUpload: (file: File) => Promise<void> }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<MeetingStatus>("ready");
  const [error, setError] = useState("");

  const selectFile = (next?: File) => {
    if (!authenticated) {
      onSignIn();
      return;
    }
    if (!next) return;
    if (!isSupportedFile(next)) {
      setFile(null);
      setStatus("ready");
      setError("Choose an audio, video, PDF, TXT, MD, or CSV file.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (next.size > MAX_FILE_SIZE) {
      setFile(null);
      setStatus("ready");
      setError("The selected file is larger than 500 MB.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setFile(next);
    setStatus("ready");
    setError("");
  };

  const change = (event: ChangeEvent<HTMLInputElement>) => selectFile(event.target.files?.[0]);
  const drop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (!authenticated) return onSignIn();
    selectFile(event.dataTransfer.files?.[0]);
  };

  const startUpload = async () => {
    if (!authenticated) return onSignIn();
    if (!file) return inputRef.current?.click();
    setStatus("uploading");
    setError("");
    try {
      await onUpload(file);
      setStatus("complete");
    } catch (uploadError) {
      setStatus("error");
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed. Please try again.");
    }
  };

  return (
    <section className="upload-card">
      <div className="upload-copy">
        <span className="eyebrow"><span /> New source</span>
        <h2>Turn conversation<br />into <em>clarity.</em></h2>
        <p>Upload meeting media or a document and let Echo capture every idea, decision, and next step.</p>
        <div className="trust-row">
          <span><Check size={13} /> Secure upload</span>
          <span><Check size={13} /> AI processing</span>
          <span><Check size={13} /> Meeting chat</span>
        </div>
      </div>

      <div
        className={`drop-zone ${dragging ? "dragging" : ""} ${file ? "has-file" : ""} ${!authenticated ? "locked" : ""}`}
        onDragEnter={() => authenticated && setDragging(true)}
        onDragLeave={() => setDragging(false)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={drop}
      >
        <input ref={inputRef} type="file" accept={ACCEPTED_FILE_TYPES} onChange={change} disabled={!authenticated} hidden />
        {!authenticated ? (
          <>
            <span className="upload-orb locked-orb"><LockKeyhole size={24} strokeWidth={1.7} /></span>
            <strong>Sign in to upload</strong>
            <p>Your files and meeting insights stay connected to your secure account.</p>
            <small>JWT-protected uploads · private by default</small>
          </>
        ) : !file ? (
          <>
            <span className="upload-orb"><UploadCloud size={27} strokeWidth={1.7} /></span>
            <strong>Drop your file here</strong>
            <p>or <button onClick={() => inputRef.current?.click()}>browse files</button> from your computer</p>
            <small className={error ? "file-error" : ""}>{error || "Audio, video, PDF, TXT, MD, CSV · up to 500 MB"}</small>
          </>
        ) : (
          <>
            <span className={`upload-orb ${status === "complete" ? "complete" : ""}`}>
              {status === "uploading" ? <LoaderCircle className="spin" size={27} /> : status === "complete" ? <Check size={27} /> : <FileUp size={27} />}
            </span>
            <strong>{status === "complete" ? "Ready to explore" : status === "error" ? "Couldn’t upload file" : file.name}</strong>
            <p>{status === "uploading" ? "Securely uploading your file…" : status === "complete" ? "Your content is ready below." : status === "error" ? error : `${(file.size / 1024 / 1024).toFixed(1)} MB · ready to upload`}</p>
            {(status === "ready" || status === "error") && <button className="remove-file" onClick={() => setFile(null)} aria-label="Remove file"><X size={15} /></button>}
          </>
        )}
        <button className="upload-action" onClick={startUpload} disabled={authenticated && (status === "uploading" || status === "complete")}>
          {!authenticated ? "Sign in to continue" : status === "uploading" ? "Uploading…" : status === "complete" ? "Uploaded" : status === "error" ? "Try again" : file ? "Start processing" : "Choose a file"}
          {!authenticated ? <ArrowRight size={16} /> : status === "complete" ? <Check size={16} /> : <ArrowUp size={16} />}
        </button>
      </div>
    </section>
  );
}
