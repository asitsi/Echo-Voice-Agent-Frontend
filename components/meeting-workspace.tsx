"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Clipboard, Clock3, FileText, Hash, Mic2, Search, Sparkles } from "lucide-react";
import { MeetingChatPanel } from "@/components/meeting-chat-panel";
import type { MeetingWorkspaceProps } from "@/types/ui";
import { formatMeetingDate, normalizeSummary, normalizeTranscript } from "@/utils/meeting-content";

export function MeetingWorkspace({ meeting, token, onRequireAuth, onToast }: MeetingWorkspaceProps) {
  const transcript = useMemo(() => normalizeTranscript(meeting.transcript), [meeting.transcript]);
  const summary = useMemo(() => normalizeSummary(meeting.summary), [meeting.summary]);
  const [activeTab, setActiveTab] = useState<"summary" | "transcript">(summary ? "summary" : "transcript");
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);

  const filteredTranscript = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return transcript.filter((line) => `${line.speaker} ${line.text}`.toLowerCase().includes(query));
  }, [searchQuery, transcript]);

  useEffect(() => {
    setActiveTab(summary ? "summary" : "transcript");
    setSearchQuery("");
  }, [meeting.id, summary]);

  const copyActiveContent = async () => {
    const content = activeTab === "summary"
      ? summary
      : transcript.map((line) => `${line.speaker}: ${line.text}`).join("\n\n");
    if (!content) return;

    await navigator.clipboard.writeText(content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  const showTranscriptSource = (source?: string) => {
    setActiveTab("transcript");
    setSearchQuery("");
    if (source) onToast(`Showing source at ${source}`);
  };

  const createdAt = formatMeetingDate(meeting.createdAt);
  const status = meeting.status.toLowerCase().replace(/_/g, " ");
  const canCopy = activeTab === "summary" ? Boolean(summary) : transcript.length > 0;

  return (
    <section className="workspace" id="workspace">
      <div className="meeting-heading">
        <div className="meeting-icon"><Mic2 size={20} /></div>
        <div>
          <div className="meeting-title-row">
            <h2>{meeting.title}</h2>
            <span className="status-pill"><i /> {status}</span>
          </div>
          <div className="meeting-meta">
            {createdAt && <span><Clock3 size={13} /> {createdAt}</span>}
            <span><Hash size={13} /> {meeting.id.slice(0, 8)}</span>
            <span><FileText size={13} /> {transcript.length ? `${transcript.length} transcript ${transcript.length === 1 ? "section" : "sections"}` : "Transcript unavailable"}</span>
          </div>
        </div>
      </div>

      <div className="workspace-grid">
        <div className="notes-panel">
          <div className="panel-toolbar">
            <div className="tabs">
              {summary && <button className={activeTab === "summary" ? "active" : ""} onClick={() => setActiveTab("summary")}><Sparkles size={14} /> Summary</button>}
              <button className={activeTab === "transcript" ? "active" : ""} onClick={() => setActiveTab("transcript")}>Transcript</button>
            </div>

            {activeTab === "transcript" && transcript.length > 0 && (
              <label className="search-box">
                <Search size={14} />
                <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search transcript" />
              </label>
            )}

            <button className="copy-btn" onClick={copyActiveContent} disabled={!canCopy}>
              {copied ? <Check size={14} /> : <Clipboard size={14} />}{copied ? "Copied" : "Copy"}
            </button>
          </div>

          {activeTab === "summary" && summary ? (
            <div className="summary-content dynamic-summary">
              <span className="summary-kicker">AI summary</span>
              <p className="lead">{summary}</p>
            </div>
          ) : (
            <div className="transcript-list">
              {filteredTranscript.map((line) => (
                <article className="transcript-line" key={line.id}>
                  <span className={`avatar ${line.color}`}>{line.initials}</span>
                  <div>
                    <div className="speaker-row"><strong>{line.speaker}</strong>{line.timestamp && <span>{line.timestamp}</span>}</div>
                    <p>{line.text}</p>
                  </div>
                </article>
              ))}
              {!transcript.length && <div className="empty-search">The API completed this meeting without returning transcript content.</div>}
              {transcript.length > 0 && !filteredTranscript.length && <div className="empty-search">No transcript text matches “{searchQuery}”.</div>}
            </div>
          )}
        </div>

        <MeetingChatPanel
          meetingId={meeting.id}
          token={token}
          suggestedQuestions={meeting.suggestedQuestions ?? []}
          onRequireAuth={onRequireAuth}
          onToast={onToast}
          onSelectSource={showTranscriptSource}
        />
      </div>
    </section>
  );
}
