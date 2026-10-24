export type MeetingStatus = "ready" | "uploading" | "processing" | "complete" | "error";

export interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  sources?: string[];
  includeInHistory?: boolean;
}

export interface MeetingRecord {
  id: string;
  title: string;
  status: string;
  transcript?: unknown;
  summary?: unknown;
  suggestedQuestions?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface MeetingHistoryItem {
  id: string;
  title: string;
  createdAt: string;
}

export interface TranscriptLine {
  id: string;
  speaker: string;
  initials: string;
  timestamp?: string;
  text: string;
  color: "violet" | "blue" | "orange";
}
