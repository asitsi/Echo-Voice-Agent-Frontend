"use client";

import ReactMarkdown from "react-markdown";
import { Sparkles, Square, Volume2 } from "lucide-react";
import type { ChatMessageProps } from "@/types/ui";

export function ChatMessage({ message, streaming, speaking, onToggleSpeech, onSelectSource }: ChatMessageProps) {
  const isAssistant = message.role === "assistant";
  const canReadAloud = isAssistant && message.content && message.includeInHistory;

  return (
    <div className={`message ${message.role}`}>
      {isAssistant && <span className="message-mark"><Sparkles size={12} /></span>}
      <div>
        {message.content ? (
          isAssistant
            ? <div className="message-markdown"><ReactMarkdown>{message.content}</ReactMarkdown></div>
            : <p>{message.content}</p>
        ) : streaming ? (
          <div className="thinking"><i /><i /><i /></div>
        ) : null}

        {canReadAloud && (
          <div className="message-actions">
            {message.sources?.slice(0, 2).map((source) => (
              <button key={source} onClick={() => onSelectSource(source)}>{source}</button>
            ))}
            <button onClick={() => onToggleSpeech(message.content)} aria-label={speaking ? "Stop reading" : "Read aloud"}>
              {speaking ? <Square size={12} fill="currentColor" /> : <Volume2 size={14} />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
