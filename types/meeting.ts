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
  createdAt?: string;
  updatedAt?: string;
}
