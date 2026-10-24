"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  ArrowUp,
  Bot,
  Check,
  Clipboard,
  Clock3,
  FileText,
  Hash,
  Mic2,
  Search,
  Sparkles,
  Square,
  Volume2,
  X,
} from "lucide-react";
import { useSpeech } from "@/hooks/use-speech";
import type { ChatMessage, MeetingRecord } from "@/types/meeting";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ??
  "https://nursery-tell-julie-transcription.trycloudflare.com/api"
).replace(/\/$/, "");

interface TranscriptLine {
  id: string;
  speaker: string;
  initials: string;
  timestamp?: string;
  text: string;
  color: "violet" | "blue" | "orange";
}

interface BrowserSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;
type UnknownRecord = Record<string, unknown>;

const starters = ["What is this meeting about?", "What are the key takeaways?", "What should happen next?"];
const colors: TranscriptLine["color"][] = ["violet", "blue", "orange"];

function formatSeconds(value: number) {
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function asText(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function normalizeTranscript(value: unknown): TranscriptLine[] {
  if (!value) return [];

  if (typeof value === "string") {
    const content = value.trim();
    if (!content) return [];
    if (content.startsWith("[") || content.startsWith("{")) {
      try { return normalizeTranscript(JSON.parse(content)); } catch { /* use plain transcript */ }
    }
    return content.split(/\n{2,}|\r?\n/).filter(Boolean).map((text, index) => ({
      id: `transcript-${index}`,
      speaker: "Transcript",
      initials: "T",
      text: text.trim(),
      color: colors[index % colors.length],
    }));
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index): TranscriptLine[] => {
      if (typeof item === "string") {
        return [{ id: `line-${index}`, speaker: "Transcript", initials: "T", text: item, color: colors[index % colors.length] }];
      }
      if (!item || typeof item !== "object") return [];
      const record = item as UnknownRecord;
      const text = asText(record, ["text", "content", "transcript"]);
      if (!text) return [];
      const speaker = asText(record, ["speaker", "speakerName", "name"]) || "Transcript";
      const rawTime = record.timestamp ?? record.startTime ?? record.start;
      const timestamp = typeof rawTime === "number" ? formatSeconds(rawTime) : typeof rawTime === "string" ? rawTime : undefined;
      const initials = speaker === "Transcript" ? "T" : speaker.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
      return [{ id: String(record.id ?? `line-${index}`), speaker, initials, timestamp, text, color: colors[index % colors.length] }];
    });
  }

  if (typeof value === "object") {
    const record = value as UnknownRecord;
    if (Array.isArray(record.segments)) return normalizeTranscript(record.segments);
    const text = asText(record, ["text", "content", "transcript"]);
    return text ? normalizeTranscript(text) : [];
  }

  return [];
}

function normalizeSummary(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (!value || typeof value !== "object") return "";
  const record = value as UnknownRecord;
  return asText(record, ["summary", "overview", "text", "content"]);
}

function formatMeetingDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function removeThinkingContent(value: string) {
  return value
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<think>[\s\S]*$/gi, "")
    .trim();
}

function isInsideThinkingBlock(value: string) {
  const lastOpenTag = value.toLowerCase().lastIndexOf("<think>");
  const lastCloseTag = value.toLowerCase().lastIndexOf("</think>");
  return lastOpenTag > lastCloseTag;
}

function markdownToSpeech(value: string) {
  return value
    .replace(/```[\w-]*\n?/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/^\s*(?:#{1,6}|>|[-+*]|\d+\.)\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function MeetingWorkspace({ meeting, token, onRequireAuth, onToast }: { meeting: MeetingRecord; token: string | null; onRequireAuth: () => void; onToast: (message: string) => void }) {
  const transcript = useMemo(() => normalizeTranscript(meeting.transcript), [meeting.transcript]);
  const summary = useMemo(() => normalizeSummary(meeting.summary), [meeting.summary]);
  const [tab, setTab] = useState<"summary" | "transcript">(summary ? "summary" : "transcript");
  const [query, setQuery] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { speak, stop, speaking } = useSpeech();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "welcome", role: "assistant", content: "This meeting is ready. Ask me anything grounded in its transcript.", includeInHistory: false },
  ]);

  useEffect(() => {
    setTab(summary ? "summary" : "transcript");
    setQuery("");
    setStreamingMessageId(null);
    setMessages([{ id: `welcome-${meeting.id}`, role: "assistant", content: "This meeting is ready. Ask me anything grounded in its transcript.", includeInHistory: false }]);
  }, [meeting.id, summary]);

  const filtered = useMemo(() => transcript.filter((line) => `${line.speaker} ${line.text}`.toLowerCase().includes(query.toLowerCase())), [query, transcript]);
  const createdAt = formatMeetingDate(meeting.createdAt);
  const status = meeting.status.toLowerCase().replace(/_/g, " ");

  const send = async (event?: FormEvent, preset?: string) => {
    event?.preventDefault();
    const question = (preset ?? input).trim();
    if (!question || loading) return;
    if (!token) {
      onRequireAuth();
      onToast("Sign in before asking Echo");
      return;
    }

    const history = messages
      .filter((message) => message.includeInHistory)
      .slice(-20)
      .map(({ role, content }) => ({
        role: role === "assistant" ? "ai" : "user",
        text: content,
      }));

    const userMessageId = crypto.randomUUID();
    const assistantMessageId = crypto.randomUUID();
    setInput("");
    setStreamingMessageId(assistantMessageId);
    setMessages((current) => [
      ...current,
      { id: userMessageId, role: "user", content: question, includeInHistory: true },
      { id: assistantMessageId, role: "assistant", content: "", includeInHistory: true },
    ]);
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/meeting/${encodeURIComponent(meeting.id)}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "Accept": "text/event-stream", "Cache-Control": "no-cache" },
        body: JSON.stringify({ question, history }),
      });
      if (!response.ok) {
        if (response.status === 401) onRequireAuth();
        const errorText = await response.text().catch(() => "");
        throw new Error(errorText || `Chat request failed with status ${response.status}`);
      }
      if (!response.body) throw new Error("The chat response did not include a readable stream.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let answer = "";

      const updateStreamedAnswer = (text: string) => {
        setMessages((current) => current.map((message) => (
          message.id === assistantMessageId ? { ...message, content: text } : message
        )));
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        const displayText = removeThinkingContent(answer);
        updateStreamedAnswer(isInsideThinkingBlock(answer) ? "Thinking..." : displayText || "Thinking...");
      }

      answer += decoder.decode();
      const finalCleanAnswer = removeThinkingContent(answer);
      if (!finalCleanAnswer) throw new Error("The AI returned an empty response.");
      updateStreamedAnswer(finalCleanAnswer);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown API error";
      setMessages((current) => current.map((chatMessage) => (
        chatMessage.id === assistantMessageId
          ? { ...chatMessage, content: `I couldn’t complete that request: ${message}`, includeInHistory: false }
          : chatMessage
      )));
    } finally {
      setStreamingMessageId(null);
      setLoading(false);
    }
  };

  const copyCurrent = async () => {
    const content = tab === "summary" ? summary : transcript.map((line) => `${line.speaker}: ${line.text}`).join("\n\n");
    if (!content) return;
    await navigator.clipboard.writeText(content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  const jumpToTranscript = (timestamp?: string) => {
    setTab("transcript");
    setQuery("");
    if (timestamp) onToast(`Showing source at ${timestamp}`);
  };

  const startVoiceInput = () => {
    const speechWindow = window as typeof window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) return onToast("Voice input is not supported in this browser");
    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event) => setInput(event.results[0][0].transcript);
    recognition.onerror = () => onToast("I couldn’t hear that. Please try again.");
    recognition.onend = () => setRecognizing(false);
    setRecognizing(true);
    recognition.start();
  };

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
              {summary && <button className={tab === "summary" ? "active" : ""} onClick={() => setTab("summary")}><Sparkles size={14} /> Summary</button>}
              <button className={tab === "transcript" ? "active" : ""} onClick={() => setTab("transcript")}>Transcript</button>
            </div>
            {tab === "transcript" && transcript.length > 0 && <label className="search-box"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search transcript" /></label>}
            <button className="copy-btn" onClick={copyCurrent} disabled={tab === "summary" ? !summary : !transcript.length}>{copied ? <Check size={14} /> : <Clipboard size={14} />}{copied ? "Copied" : "Copy"}</button>
          </div>

          {tab === "summary" && summary ? (
            <div className="summary-content dynamic-summary">
              <span className="summary-kicker">AI summary</span>
              <p className="lead">{summary}</p>
            </div>
          ) : (
            <div className="transcript-list">
              {filtered.map((line) => (
                <article className="transcript-line" key={line.id}>
                  <span className={`avatar ${line.color}`}>{line.initials}</span>
                  <div>
                    <div className="speaker-row"><strong>{line.speaker}</strong>{line.timestamp && <span>{line.timestamp}</span>}</div>
                    <p>{line.text}</p>
                  </div>
                </article>
              ))}
              {!transcript.length && <div className="empty-search">The API completed this meeting without returning transcript content.</div>}
              {transcript.length > 0 && !filtered.length && <div className="empty-search">No transcript text matches “{query}”.</div>}
            </div>
          )}
        </div>

        <aside className="chat-panel">
          <div className="chat-header">
            <div><span className="echo-avatar"><Bot size={17} /></span><span><strong>Ask Echo</strong><small><i /> Connected to this meeting</small></span></div>
            <button onClick={() => { stop(); setStreamingMessageId(null); setMessages([{ id: crypto.randomUUID(), role: "assistant", content: "Chat cleared. What would you like to know?", includeInHistory: false }]); }} disabled={loading} aria-label="Clear chat" title="Clear chat"><X size={16} /></button>
          </div>
          <div className="chat-messages">
            {messages.map((message) => (
              <div key={message.id} className={`message ${message.role}`}>
                {message.role === "assistant" && <span className="message-mark"><Sparkles size={12} /></span>}
                <div>
                  {message.content ? message.role === "assistant" ? <div className="message-markdown"><ReactMarkdown>{message.content}</ReactMarkdown></div> : <p>{message.content}</p> : message.id === streamingMessageId ? <div className="thinking"><i /><i /><i /></div> : null}
                  {message.role === "assistant" && message.content && message.includeInHistory && <div className="message-actions">{message.sources?.slice(0, 2).map((source) => <button key={source} onClick={() => jumpToTranscript(source)}>{source}</button>)}<button onClick={() => speaking ? stop() : speak(markdownToSpeech(message.content))} aria-label={speaking ? "Stop reading" : "Read aloud"}>{speaking ? <Square size={12} fill="currentColor" /> : <Volume2 size={14} />}</button></div>}
                </div>
              </div>
            ))}
          </div>

          {messages.length === 1 && <div className="suggestions">{starters.map((starter) => <button key={starter} onClick={() => send(undefined, starter)}>{starter}<ArrowUp size={13} /></button>)}</div>}

          <form className="chat-input" onSubmit={(event) => send(event)}>
            <input ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask about this meeting…" />
            <button type="button" className={`voice-input ${recognizing ? "is-listening" : ""}`} onClick={startVoiceInput} aria-label="Voice input"><Mic2 size={16} /></button>
            <button type="submit" className="send-btn" disabled={!input.trim() || loading} aria-label="Send message"><ArrowUp size={16} /></button>
          </form>
          <div className="chat-disclaimer">Echo can make mistakes. Check important details.</div>
        </aside>
      </div>
    </section>
  );
}
