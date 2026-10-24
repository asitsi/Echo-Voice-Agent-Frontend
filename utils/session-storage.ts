import type { AuthUser } from "@/types/auth";
import type { MeetingHistoryItem } from "@/types/meeting";
import type { StoredSession } from "@/types/storage";

const AUTH_TOKEN_KEY = "echo-auth-token";
const AUTH_USER_KEY = "echo-auth-user";
const meetingHistoryKey = (email: string) => `echo-meeting-history:${email.toLowerCase()}`;

export function readSession(): StoredSession | null {
  const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
  const savedUser = window.localStorage.getItem(AUTH_USER_KEY);
  if (!token || !savedUser) return null;

  try {
    return { token, user: JSON.parse(savedUser) as AuthUser };
  } catch {
    clearSession();
    return null;
  }
}

export function saveSession(token: string, user: AuthUser) {
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.localStorage.removeItem(AUTH_USER_KEY);
}

export function readMeetingHistory(email: string): MeetingHistoryItem[] {
  const key = meetingHistoryKey(email);
  try {
    const savedHistory = window.localStorage.getItem(key);
    return savedHistory ? JSON.parse(savedHistory) as MeetingHistoryItem[] : [];
  } catch {
    window.localStorage.removeItem(key);
    return [];
  }
}

export function saveMeetingHistory(email: string, history: MeetingHistoryItem[]) {
  window.localStorage.setItem(meetingHistoryKey(email), JSON.stringify(history));
}
