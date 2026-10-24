import type { AuthUser } from "@/types/auth";
import type { ChatMessage, MeetingHistoryItem, MeetingRecord } from "@/types/meeting";

export interface Greeting {
  date: string;
  salutation: string;
}

export interface EchoDashboardProps {
  greeting: Greeting;
}

export interface AppHeaderProps {
  authenticated: boolean;
  currentUser: AuthUser | null;
  meetings: MeetingHistoryItem[];
  activeMeetingId?: string;
  loadingMeetingId: string | null;
  onNewMeeting: () => void;
  onOpenMeeting: (meeting: MeetingHistoryItem) => Promise<void>;
  onSignIn: () => void;
  onSignOut: () => void;
}

export interface MeetingWorkspaceProps {
  meeting: MeetingRecord;
  token: string | null;
  onRequireAuth: () => void;
  onToast: (message: string) => void;
}

export interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onAuthenticated: (token: string, user: AuthUser) => void;
}

export interface ChatMessageProps {
  message: ChatMessage;
  streaming: boolean;
  speaking: boolean;
  onToggleSpeech: (message: string) => void;
  onSelectSource: (source?: string) => void;
}

export interface MeetingChatPanelProps {
  meetingId: string;
  token: string | null;
  suggestedQuestions: string[];
  onRequireAuth: () => void;
  onToast: (message: string) => void;
  onSelectSource: (source?: string) => void;
}

export interface UseMeetingChatOptions {
  meetingId: string;
  token: string | null;
  onRequireAuth: () => void;
  onToast: (message: string) => void;
}
