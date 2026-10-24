import type { TranscriptLine } from "@/types/meeting";

type UnknownRecord = Record<string, unknown>;

const transcriptColors: TranscriptLine["color"][] = ["violet", "blue", "orange"];

function formatSeconds(value: number) {
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function firstTextValue(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export function normalizeTranscript(value: unknown): TranscriptLine[] {
  if (!value) return [];

  if (typeof value === "string") {
    const content = value.trim();
    if (!content) return [];
    if (content.startsWith("[") || content.startsWith("{")) {
      try {
        return normalizeTranscript(JSON.parse(content));
      } catch { /* treat invalid JSON as a plain transcript */ }
    }
    return content.split(/\n{2,}|\r?\n/).filter(Boolean).map((text, index) => ({
      id: `transcript-${index}`,
      speaker: "Transcript",
      initials: "T",
      text: text.trim(),
      color: transcriptColors[index % transcriptColors.length],
    }));
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index): TranscriptLine[] => {
      if (typeof item === "string") {
        return [{ id: `line-${index}`, speaker: "Transcript", initials: "T", text: item, color: transcriptColors[index % transcriptColors.length] }];
      }
      if (!item || typeof item !== "object") return [];

      const record = item as UnknownRecord;
      const text = firstTextValue(record, ["text", "content", "transcript"]);
      if (!text) return [];

      const speaker = firstTextValue(record, ["speaker", "speakerName", "name"]) || "Transcript";
      const rawTime = record.timestamp ?? record.startTime ?? record.start;
      const timestamp = typeof rawTime === "number" ? formatSeconds(rawTime) : typeof rawTime === "string" ? rawTime : undefined;
      const initials = speaker === "Transcript" ? "T" : speaker.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

      return [{ id: String(record.id ?? `line-${index}`), speaker, initials, timestamp, text, color: transcriptColors[index % transcriptColors.length] }];
    });
  }

  if (typeof value === "object") {
    const record = value as UnknownRecord;
    if (Array.isArray(record.segments)) return normalizeTranscript(record.segments);
    const text = firstTextValue(record, ["text", "content", "transcript"]);
    return text ? normalizeTranscript(text) : [];
  }

  return [];
}

export function normalizeSummary(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (!value || typeof value !== "object") return "";
  return firstTextValue(value as UnknownRecord, ["summary", "overview", "text", "content"]);
}

export function normalizeSuggestedQuestions(value: unknown): string[] {
  let candidate = value;

  if (typeof candidate === "string") {
    const serialized = candidate;
    try {
      candidate = JSON.parse(serialized);
    } catch {
      const text = serialized.trim();
      candidate = text ? [text] : [];
    }
  }

  if (!Array.isArray(candidate)) return [];

  return candidate.flatMap((item) => {
    if (typeof item === "string") return item.trim() ? [item.trim()] : [];
    if (!item || typeof item !== "object") return [];

    const record = item as UnknownRecord;
    const question = firstTextValue(record, ["question", "text", "content"]);
    return question ? [question] : [];
  }).slice(0, 6);
}

export function formatMeetingDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

export function removeThinkingContent(value: string) {
  return value.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/<think>[\s\S]*$/gi, "").trim();
}

export function isInsideThinkingBlock(value: string) {
  const normalized = value.toLowerCase();
  return normalized.lastIndexOf("<think>") > normalized.lastIndexOf("</think>");
}

export function markdownToSpeech(value: string) {
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
