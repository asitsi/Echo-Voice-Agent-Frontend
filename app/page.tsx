"use client";

import { useEffect, useState } from "react";
import { ChevronDown, FileAudio, History, LoaderCircle, LogOut, Plus, Sparkles } from "lucide-react";
import { UploadCard } from "@/components/upload-card";
import { MeetingWorkspace } from "@/components/meeting-workspace";
import { AuthModal, type AuthUser } from "@/components/auth-modal";
import { BrandMark } from "@/components/brand-mark";
import type { MeetingRecord } from "@/types/meeting";

const API_URL = (process.env.NEXT_PUBLIC_API_URL)?.replace(/\/$/, "");

interface UploadResponse {
  message: string;
  meetingId: string;
  error?: string;
}

interface MeetingResponse {
  id?: string;
  status: string;
  transcript?: unknown;
  summary?: unknown;
  createdAt?: string;
  updatedAt?: string;
  message?: string;
  error?: string;
}

interface MeetingHistoryItem {
  id: string;
  title: string;
  createdAt: string;
}

const meetingHistoryKey = (email: string) => `echo-meeting-history:${email.toLowerCase()}`;

const readMeetingHistory = (email: string) => {
  try {
    const saved = window.localStorage.getItem(meetingHistoryKey(email));
    return saved ? (JSON.parse(saved) as MeetingHistoryItem[]) : [];
  } catch {
    window.localStorage.removeItem(meetingHistoryKey(email));
    return [];
  }
};

export default function Home() {
  const [toast, setToast] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [meetingHistory, setMeetingHistory] = useState<MeetingHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState<string | null>(null);
  const [activeMeeting, setActiveMeeting] = useState<MeetingRecord | null>(null);
  const [meetingReady, setMeetingReady] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [dateLabel, setDateLabel] = useState("");
  const [greeting, setGreeting] = useState("Welcome");

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  useEffect(() => {
    const savedToken = window.localStorage.getItem("echo-auth-token");
    const savedUser = window.localStorage.getItem("echo-auth-user");
    if (savedToken) setToken(savedToken);
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser) as AuthUser;
        setCurrentUser(user);
        if (savedToken && user.email) setMeetingHistory(readMeetingHistory(user.email));
      } catch {
        window.localStorage.removeItem("echo-auth-user");
      }
    }

    const now = new Date();
    setDateLabel(new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(now));
    const hour = now.getHours();
    setGreeting(hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");

    const closePopovers = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setProfileOpen(false);
      setHistoryOpen(false);
    };
    window.addEventListener("keydown", closePopovers);
    return () => window.removeEventListener("keydown", closePopovers);
  }, []);

  const handleAuthenticated = (jwt: string, user: AuthUser) => {
    window.localStorage.setItem("echo-auth-token", jwt);
    window.localStorage.setItem("echo-auth-user", JSON.stringify(user));
    setToken(jwt);
    setCurrentUser(user);
    setMeetingHistory(user.email ? readMeetingHistory(user.email) : []);
    setAuthOpen(false);
    showToast(`Welcome${user.name ? `, ${user.name.split(" ")[0]}` : ""}`);
  };

  const signOut = () => {
    window.localStorage.removeItem("echo-auth-token");
    window.localStorage.removeItem("echo-auth-user");
    setToken(null);
    setCurrentUser(null);
    setActiveMeeting(null);
    setMeetingReady(false);
    setProfileOpen(false);
    setHistoryOpen(false);
    setMeetingHistory([]);
    showToast("You’ve been signed out");
  };

  const startNewMeeting = () => {
    if (!token) return setAuthOpen(true);
    setHistoryOpen(false);
    setActiveMeeting(null);
    setMeetingReady(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleUpload = async (file: File) => {
    if (!token) {
      setAuthOpen(true);
      throw new Error("Sign in before uploading a meeting.");
    }

    const body = new FormData();
    body.append("audio", file);
    setMeetingReady(false);

    const uploadResponse = await fetch(`${API_URL}/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body,
    });
    const upload = await uploadResponse.json().catch(() => ({ message: "The API returned an invalid response." })) as UploadResponse;
    if (uploadResponse.status === 401) {
      signOut();
      setAuthOpen(true);
      throw new Error("Your session expired. Sign in again.");
    }
    if (!uploadResponse.ok) throw new Error(upload.error || upload.message || `Upload failed with status ${uploadResponse.status}`);

    const meetingTitle = file.name.replace(/\.[^.]+$/, "");
    showToast(upload.message || "Processing started");

    let attempts = 0;
    let completedMeeting: MeetingResponse | null = null;
    while (attempts < 120) {
      const meetingResponse = await fetch(`${API_URL}/meeting/${encodeURIComponent(upload.meetingId)}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const meeting = await meetingResponse.json() as MeetingResponse;
      if (!meetingResponse.ok) throw new Error(meeting.error || meeting.message || `Meeting request failed with status ${meetingResponse.status}`);
      const status = meeting.status.toLowerCase();

      if (["completed", "complete", "processed", "ready"].includes(status)) {
        completedMeeting = meeting;
        break;
      }
      if (["failed", "error"].includes(status)) throw new Error("Meeting processing failed");

      attempts += 1;
      await new Promise((resolve) => window.setTimeout(resolve, 2500));
    }

    if (attempts >= 120) throw new Error("Meeting processing timed out");
    if (!completedMeeting) throw new Error("Meeting processing ended without a result");
    const meetingRecord: MeetingRecord = {
      id: completedMeeting.id ?? upload.meetingId,
      title: meetingTitle,
      status: completedMeeting.status,
      transcript: completedMeeting.transcript,
      summary: completedMeeting.summary,
      createdAt: completedMeeting.createdAt,
      updatedAt: completedMeeting.updatedAt,
    };
    setActiveMeeting(meetingRecord);
    if (currentUser?.email) {
      const historyItem: MeetingHistoryItem = {
        id: meetingRecord.id,
        title: meetingRecord.title,
        createdAt: meetingRecord.createdAt ?? new Date().toISOString(),
      };
      const nextHistory = [historyItem, ...meetingHistory.filter((item) => item.id !== historyItem.id)].slice(0, 20);
      setMeetingHistory(nextHistory);
      window.localStorage.setItem(meetingHistoryKey(currentUser.email), JSON.stringify(nextHistory));
    }
    setMeetingReady(true);
    showToast("Your meeting is ready");
    window.setTimeout(() => document.querySelector("#workspace")?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
  };

  const openPreviousMeeting = async (item: MeetingHistoryItem) => {
    if (!token) {
      setAuthOpen(true);
      return;
    }

    setHistoryLoading(item.id);
    try {
      const response = await fetch(`${API_URL}/meeting/${encodeURIComponent(item.id)}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const meeting = await response.json().catch(() => ({ error: "The API returned an invalid response." })) as MeetingResponse;
      if (response.status === 401) {
        signOut();
        setAuthOpen(true);
        return;
      }
      if (!response.ok) throw new Error(meeting.error || meeting.message || `Meeting request failed with status ${response.status}`);

      setActiveMeeting({
        id: meeting.id ?? item.id,
        title: item.title,
        status: meeting.status,
        transcript: meeting.transcript,
        summary: meeting.summary,
        createdAt: meeting.createdAt ?? item.createdAt,
        updatedAt: meeting.updatedAt,
      });
      setMeetingReady(true);
      setHistoryOpen(false);
      showToast(`Opened ${item.title}`);
      window.setTimeout(() => document.querySelector("#workspace")?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Couldn’t open that meeting");
    } finally {
      setHistoryLoading(null);
    }
  };

  return (
    <div className="app-shell">
      <main className="main-content">
        <header className="topbar">
          <BrandMark />
          <div className="topbar-actions">
            {token && (
              <div className="popover-wrap">
                <button
                  className="meetings-button"
                  onClick={() => { setHistoryOpen(!historyOpen); setProfileOpen(false); }}
                  aria-expanded={historyOpen}
                  aria-haspopup="menu"
                >
                  <History size={15} /> <span>Meetings</span> <ChevronDown size={13} />
                </button>
                {historyOpen && (
                  <div className="top-popover history-popover" role="menu">
                    <div className="history-heading">
                      <div><strong>Recent meetings</strong><small>Select a meeting to reopen it</small></div>
                      <span>{meetingHistory.length}</span>
                    </div>
                    <div className="history-list">
                      {meetingHistory.length ? meetingHistory.map((item) => (
                        <button
                          key={item.id}
                          className={activeMeeting?.id === item.id ? "history-row active" : "history-row"}
                          onClick={() => void openPreviousMeeting(item)}
                          disabled={Boolean(historyLoading)}
                          role="menuitem"
                        >
                          <span className="history-icon">{historyLoading === item.id ? <LoaderCircle className="spin" size={14} /> : <FileAudio size={14} />}</span>
                          <span><strong>{item.title}</strong><small>{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(item.createdAt))}</small></span>
                          {activeMeeting?.id === item.id && <i />}
                        </button>
                      )) : (
                        <div className="history-empty"><History size={19} /><strong>No meetings yet</strong><span>Your completed uploads will appear here.</span></div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            <button className="new-meeting" onClick={startNewMeeting}><Plus size={17} /> New meeting</button>
            {token ? (
              <div className="popover-wrap">
                <button className="profile" onClick={() => { setProfileOpen(!profileOpen); setHistoryOpen(false); }} aria-label="Open profile" aria-expanded={profileOpen}><span>{currentUser?.name?.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "EU"}</span><i /></button>
                {profileOpen && (
                  <div className="top-popover profile-popover">
                    <div className="profile-summary"><span>{currentUser?.name?.slice(0, 2).toUpperCase() || "EU"}</span><div><strong>{currentUser?.name || "Echo user"}</strong><small>{currentUser?.email || "Authenticated"}</small></div></div>
                    <button onClick={signOut}><LogOut size={14} /> Sign out</button>
                  </div>
                )}
              </div>
            ) : <button className="sign-in-btn" onClick={() => setAuthOpen(true)}>Sign in</button>}
          </div>
        </header>

        <div className="page-wrap">
          <div className="welcome-row">
            <div>
              {dateLabel && <span className="date-label">{dateLabel}</span>}
              <h1>{greeting}{currentUser?.name ? `, ${currentUser.name.split(" ")[0]}` : ""}.</h1>
              <p>Your meetings are full of answers. Let’s find them.</p>
            </div>
          </div>

          <UploadCard authenticated={Boolean(token)} onSignIn={() => setAuthOpen(true)} onUpload={handleUpload} />
          {meetingReady && activeMeeting && <MeetingWorkspace meeting={activeMeeting} token={token} onRequireAuth={() => setAuthOpen(true)} onToast={showToast} />}
          <footer className="page-footer"><span>Echo AI · Your conversations, made useful.</span></footer>
        </div>
      </main>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onAuthenticated={handleAuthenticated} />
      {toast && <div className="toast"><span><Sparkles size={15} /></span>{toast}</div>}
    </div>
  );
}
