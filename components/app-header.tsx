"use client";

import { useEffect, useState } from "react";
import { ChevronDown, FileAudio, History, LoaderCircle, LogOut, Plus } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import type { AuthUser } from "@/types/auth";
import type { MeetingHistoryItem } from "@/types/meeting";
import type { AppHeaderProps } from "@/types/ui";

function userInitials(user: AuthUser | null) {
  return user?.name?.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "EU";
}

function formatHistoryDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export function AppHeader({
  authenticated,
  currentUser,
  meetings,
  activeMeetingId,
  loadingMeetingId,
  onNewMeeting,
  onOpenMeeting,
  onSignIn,
  onSignOut,
}: AppHeaderProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const initials = userInitials(currentUser);

  useEffect(() => {
    const closePopovers = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setHistoryOpen(false);
      setProfileOpen(false);
    };
    window.addEventListener("keydown", closePopovers);
    return () => window.removeEventListener("keydown", closePopovers);
  }, []);

  const openMeeting = async (meeting: MeetingHistoryItem) => {
    await onOpenMeeting(meeting);
    setHistoryOpen(false);
  };

  return (
    <header className="topbar">
      <BrandMark />
      <div className="topbar-actions">
        {authenticated && (
          <div className="popover-wrap">
            <button
              className="meetings-button"
              onClick={() => { setHistoryOpen((open) => !open); setProfileOpen(false); }}
              aria-expanded={historyOpen}
              aria-haspopup="menu"
            >
              <History size={15} /> <span>Meetings</span> <ChevronDown size={13} />
            </button>

            {historyOpen && (
              <div className="top-popover history-popover" role="menu">
                <div className="history-heading">
                  <div><strong>Recent meetings</strong><small>Select a meeting to reopen it</small></div>
                  <span>{meetings.length}</span>
                </div>
                <div className="history-list">
                  {meetings.length ? meetings.map((meeting) => (
                    <button
                      key={meeting.id}
                      className={activeMeetingId === meeting.id ? "history-row active" : "history-row"}
                      onClick={() => void openMeeting(meeting)}
                      disabled={Boolean(loadingMeetingId)}
                      role="menuitem"
                    >
                      <span className="history-icon">
                        {loadingMeetingId === meeting.id ? <LoaderCircle className="spin" size={14} /> : <FileAudio size={14} />}
                      </span>
                      <span><strong>{meeting.title}</strong><small>{formatHistoryDate(meeting.createdAt)}</small></span>
                      {activeMeetingId === meeting.id && <i />}
                    </button>
                  )) : (
                    <div className="history-empty"><History size={19} /><strong>No meetings yet</strong><span>Your completed uploads will appear here.</span></div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <button className="new-meeting" onClick={() => { setHistoryOpen(false); onNewMeeting(); }}><Plus size={17} /> New meeting</button>

        {authenticated ? (
          <div className="popover-wrap">
            <button
              className="profile"
              onClick={() => { setProfileOpen((open) => !open); setHistoryOpen(false); }}
              aria-label="Open profile"
              aria-expanded={profileOpen}
            >
              <span>{initials}</span><i />
            </button>
            {profileOpen && (
              <div className="top-popover profile-popover">
                <div className="profile-summary">
                  <span>{initials}</span>
                  <div><strong>{currentUser?.name || "Echo user"}</strong><small>{currentUser?.email || "Authenticated"}</small></div>
                </div>
                <button onClick={() => { setProfileOpen(false); onSignOut(); }}><LogOut size={14} /> Sign out</button>
              </div>
            )}
          </div>
        ) : (
          <button className="sign-in-btn" onClick={onSignIn}>Sign in</button>
        )}
      </div>
    </header>
  );
}
