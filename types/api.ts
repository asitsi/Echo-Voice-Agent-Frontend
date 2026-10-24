import type { AuthUser } from "@/types/auth";

export interface AuthResponse {
  token?: string;
  accessToken?: string;
  message?: string;
  error?: string;
  user?: Partial<AuthUser>;
}

export interface UploadResponse {
  message: string;
  meetingId: string;
  error?: string;
}

export interface MeetingResponse {
  id?: string;
  status: string;
  transcript?: unknown;
  summary?: unknown;
  suggestedQuestions?: string[];
  createdAt?: string;
  updatedAt?: string;
  message?: string;
  error?: string;
}

export interface ChatHistoryEntry {
  role: "user" | "ai";
  text: string;
}

export interface ErrorPayload {
  error?: string;
  message?: string;
}

export interface StreamMeetingChatOptions {
  meetingId: string;
  token: string;
  question: string;
  history: ChatHistoryEntry[];
  onProgress: (answer: string) => void;
}
