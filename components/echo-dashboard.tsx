"use client";

import { Sparkles } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { AuthModal } from "@/components/auth-modal";
import { MeetingWorkspace } from "@/components/meeting-workspace";
import { UploadCard } from "@/components/upload-card";
import { useEchoDashboard } from "@/hooks/use-echo-dashboard";
import { useToast } from "@/hooks/use-toast";
import type { EchoDashboardProps } from "@/types/ui";

export function EchoDashboard({ greeting }: EchoDashboardProps) {
  const { message: toast, showToast } = useToast();
  const dashboard = useEchoDashboard(showToast);
  const firstName = dashboard.currentUser?.name?.split(" ")[0];

  return (
    <div className="app-shell">
      <main className="main-content">
        <AppHeader
          authenticated={Boolean(dashboard.token)}
          currentUser={dashboard.currentUser}
          meetings={dashboard.meetingHistory}
          activeMeetingId={dashboard.activeMeeting?.id}
          loadingMeetingId={dashboard.historyLoading}
          onNewMeeting={dashboard.startNewMeeting}
          onOpenMeeting={dashboard.openMeeting}
          onSignIn={dashboard.openAuth}
          onSignOut={dashboard.signOut}
        />

        <div className="page-wrap">
          <div className="welcome-row">
            <div>
              <span className="date-label">{greeting.date}</span>
              <h1>{greeting.salutation}{firstName ? `, ${firstName}` : ""}.</h1>
              <p>Your meetings are full of answers. Let’s find them.</p>
            </div>
          </div>

          <UploadCard
            authenticated={Boolean(dashboard.token)}
            onSignIn={dashboard.openAuth}
            onUpload={dashboard.uploadMeeting}
          />

          {dashboard.activeMeeting && (
            <MeetingWorkspace
              meeting={dashboard.activeMeeting}
              token={dashboard.token}
              onRequireAuth={dashboard.openAuth}
              onToast={showToast}
            />
          )}

          <footer className="page-footer"><span>Echo AI · Your conversations, made useful.</span></footer>
        </div>
      </main>

      <AuthModal
        open={dashboard.authOpen}
        onClose={dashboard.closeAuth}
        onAuthenticated={dashboard.authenticate}
      />

      {toast && <div className="toast"><span><Sparkles size={15} /></span>{toast}</div>}
    </div>
  );
}
