import type {
  AuthResponse,
  ErrorPayload,
  MeetingResponse,
  StreamMeetingChatOptions,
  UploadResponse,
} from "@/types/api";

const configuredApiUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL;

if (!configuredApiUrl) {
  throw new Error("NEXT_PUBLIC_BACKEND_API_URL is not configured. Add it to .env.local or your deployment environment variables.");
}

const API_URL = configuredApiUrl.replace(/\/$/, "");
const COMPLETED_STATUSES = new Set(["completed", "complete", "processed", "ready"]);
const FAILED_STATUSES = new Set(["failed", "error"]);

export class EchoApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "EchoApiError";
  }
}

async function readJson<T extends ErrorPayload>(response: Response, fallbackMessage: string) {
  const result = await response.json().catch(() => null) as T | null;
  if (!response.ok) {
    throw new EchoApiError(result?.error ?? result?.message ?? `${fallbackMessage} with status ${response.status}`, response.status);
  }
  if (!result) throw new EchoApiError("The API returned an invalid response.", response.status);
  return result;
}

async function postAuth(path: string, payload: Record<string, string>) {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return readJson<AuthResponse>(response, "Authentication failed");
}

export const signup = (payload: { name: string; email: string; password: string }) => postAuth("/auth/signup", payload);

export const verifyOtp = (payload: { email: string; otp: string }) => postAuth("/auth/verify-otp", payload);

export const login = (payload: { email: string; password: string }) => postAuth("/auth/login", payload);

export const loginWithGoogle = (idToken: string) => postAuth("/auth/google", { idToken });

export async function uploadFile(file: File, token: string) {
  const body = new FormData();
  body.append("audio", file);
  const response = await fetch(`${API_URL}/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body,
  });
  return readJson<UploadResponse>(response, "Upload failed");
}

export async function getMeeting(meetingId: string, token: string) {
  const response = await fetch(`${API_URL}/meeting/${encodeURIComponent(meetingId)}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  return readJson<MeetingResponse>(response, "Meeting request failed");
}

export async function waitForMeeting(meetingId: string, token: string, maxAttempts = 120, intervalMs = 2500) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const meeting = await getMeeting(meetingId, token);
    const status = meeting.status.toLowerCase();

    if (COMPLETED_STATUSES.has(status)) return meeting;
    if (FAILED_STATUSES.has(status)) throw new Error("Meeting processing failed.");
    if (attempt < maxAttempts - 1) await new Promise((resolve) => window.setTimeout(resolve, intervalMs));
  }

  throw new Error("Meeting processing timed out.");
}

export async function streamMeetingChat({ meetingId, token, question, history, onProgress }: StreamMeetingChatOptions) {
  const response = await fetch(`${API_URL}/meeting/${encodeURIComponent(meetingId)}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Accept: "text/event-stream",
      "Cache-Control": "no-cache",
    },
    body: JSON.stringify({ question, history }),
  });

  if (!response.ok) {
    const responseText = await response.text().catch(() => "");
    let message = responseText;
    try {
      const payload = JSON.parse(responseText) as ErrorPayload;
      message = payload.error ?? payload.message ?? responseText;
    } catch { /* use the plain response */ }
    throw new EchoApiError(message || `Chat request failed with status ${response.status}`, response.status);
  }
  if (!response.body) throw new EchoApiError("The chat response did not include a readable stream.", response.status);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let answer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    answer += decoder.decode(value, { stream: true });
    onProgress(answer);
  }

  answer += decoder.decode();
  onProgress(answer);
  return answer;
}
