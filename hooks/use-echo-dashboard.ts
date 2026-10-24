"use client";

import { useEffect, useState } from "react";
import { EchoApiError, getMeeting, uploadFile, waitForMeeting } from "@/services/echo-api";
import type { MeetingResponse } from "@/types/api";
import type { AuthUser } from "@/types/auth";
import type { MeetingHistoryItem, MeetingRecord } from "@/types/meeting";
import { clearSession, readMeetingHistory, readSession, saveMeetingHistory, saveSession } from "@/utils/session-storage";
import { normalizeSuggestedQuestions } from "@/utils/meeting-content";

const scrollToWorkspace = () => {
  window.setTimeout(() => document.querySelector("#workspace")?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
};

function toMeetingRecord(meeting: MeetingResponse, id: string, title: string, createdAt?: string): MeetingRecord {
  const payload = meeting as MeetingResponse & { suggested_questions?: unknown };

  return {
    id: meeting.id ?? id,
    title,
    status: meeting.status,
    transcript: meeting.transcript,
    summary: meeting.summary,
    suggestedQuestions: normalizeSuggestedQuestions(payload.suggestedQuestions ?? payload.suggested_questions),
    createdAt: meeting.createdAt ?? createdAt,
    updatedAt: meeting.updatedAt,
  };
}

export function useEchoDashboard(showToast: (message: string) => void) {
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [activeMeeting, setActiveMeeting] = useState<MeetingRecord | null>(null);
  const [meetingHistory, setMeetingHistory] = useState<MeetingHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState<string | null>(null);

  useEffect(() => {
    const session = readSession();
    if (!session) return;
    setToken(session.token);
    setCurrentUser(session.user);
    setMeetingHistory(readMeetingHistory(session.user.email));
  }, []);

  const authenticate = (jwt: string, user: AuthUser) => {
    saveSession(jwt, user);
    setToken(jwt);
    setCurrentUser(user);
    setMeetingHistory(readMeetingHistory(user.email));
    setAuthOpen(false);
    showToast(`Welcome${user.name ? `, ${user.name.split(" ")[0]}` : ""}`);
  };

  const signOut = () => {
    clearSession();
    setToken(null);
    setCurrentUser(null);
    setActiveMeeting(null);
    setMeetingHistory([]);
    setAuthOpen(false);
    showToast("You’ve been signed out");
  };

  const requestWithSession = async <T,>(request: Promise<T>) => {
    try {
      return await request;
    } catch (error) {
      if (error instanceof EchoApiError && error.status === 401) {
        signOut();
        setAuthOpen(true);
        throw new Error("Your session expired. Sign in again.");
      }
      throw error;
    }
  };

  const startNewMeeting = () => {
    if (!token) {
      setAuthOpen(true);
      return;
    }
    setActiveMeeting(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const addMeetingToHistory = (meeting: MeetingRecord) => {
    if (!currentUser?.email) return;

    const item: MeetingHistoryItem = {
      id: meeting.id,
      title: meeting.title,
      createdAt: meeting.createdAt ?? new Date().toISOString(),
    };

    setMeetingHistory((current) => {
      const updated = [item, ...current.filter((entry) => entry.id !== item.id)].slice(0, 20);
      saveMeetingHistory(currentUser.email, updated);
      return updated;
    });
  };

  const uploadMeeting = async (file: File) => {
    if (!token) {
      setAuthOpen(true);
      throw new Error("Sign in before uploading a meeting.");
    }

    setActiveMeeting(null);
    const upload = await requestWithSession(uploadFile(file, token));
    showToast(upload.message || "Processing started");

    const processedMeeting = await requestWithSession(waitForMeeting(upload.meetingId, token));
    const title = file.name.replace(/\.[^.]+$/, "");
    const meeting = toMeetingRecord(processedMeeting, upload.meetingId, title);

    setActiveMeeting(meeting);
    addMeetingToHistory(meeting);
    showToast("Your meeting is ready");
    scrollToWorkspace();
  };

  const openMeeting = async (item: MeetingHistoryItem) => {
    if (!token) {
      setAuthOpen(true);
      return;
    }

    setHistoryLoading(item.id);
    try {
      const response = await requestWithSession(getMeeting(item.id, token));
      setActiveMeeting(toMeetingRecord(response, item.id, item.title, item.createdAt));
      showToast(`Opened ${item.title}`);
      scrollToWorkspace();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Couldn’t open that meeting");
    } finally {
      setHistoryLoading(null);
    }
  };

  return {
    token,
    currentUser,
    authOpen,
    activeMeeting,
    meetingHistory,
    historyLoading,
    openAuth: () => setAuthOpen(true),
    closeAuth: () => setAuthOpen(false),
    authenticate,
    signOut,
    startNewMeeting,
    uploadMeeting,
    openMeeting,
  };
}
