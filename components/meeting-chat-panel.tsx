"use client";

import { FormEvent } from "react";
import { ArrowUp, Bot, Mic2, X } from "lucide-react";
import { ChatMessage } from "@/components/chat-message";
import { useMeetingChat } from "@/hooks/use-meeting-chat";
import type { MeetingChatPanelProps } from "@/types/ui";

export function MeetingChatPanel({ meetingId, token, suggestedQuestions, onRequireAuth, onToast, onSelectSource }: MeetingChatPanelProps) {
  const chat = useMeetingChat({ meetingId, token, onRequireAuth, onToast });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void chat.sendMessage();
  };

  return (
    <aside className="chat-panel">
      <div className="chat-header">
        <div>
          <span className="echo-avatar"><Bot size={17} /></span>
          <span><strong>Ask Echo</strong><small><i /> Connected to this meeting</small></span>
        </div>
        <button onClick={chat.clearChat} disabled={chat.loading} aria-label="Clear chat" title="Clear chat"><X size={16} /></button>
      </div>

      <div className="chat-messages">
        {chat.messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            streaming={message.id === chat.streamingMessageId}
            speaking={chat.speaking}
            onToggleSpeech={chat.toggleSpeech}
            onSelectSource={onSelectSource}
          />
        ))}
      </div>

      {suggestedQuestions.length > 0 && chat.messages.length === 1 && (
        <div className="suggestions">
          {suggestedQuestions.map((question) => (
            <button key={question} type="button" onClick={() => chat.setInput(question)}>{question}<ArrowUp size={13} /></button>
          ))}
        </div>
      )}

      <form className="chat-input" onSubmit={submit}>
        <input value={chat.input} onChange={(event) => chat.setInput(event.target.value)} placeholder="Ask about this meeting…" />
        <button type="button" className={`voice-input ${chat.recognizing ? "is-listening" : ""}`} onClick={chat.startVoiceInput} aria-label="Voice input"><Mic2 size={16} /></button>
        <button type="submit" className="send-btn" disabled={!chat.input.trim() || chat.loading} aria-label="Send message"><ArrowUp size={16} /></button>
      </form>

      <div className="chat-disclaimer">Echo can make mistakes. Check important details.</div>
    </aside>
  );
}
