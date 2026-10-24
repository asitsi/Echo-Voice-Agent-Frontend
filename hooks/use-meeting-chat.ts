"use client";

import { useEffect, useState } from "react";
import { useSpeech } from "@/hooks/use-speech";
import { EchoApiError, streamMeetingChat } from "@/services/echo-api";
import type { ChatHistoryEntry } from "@/types/api";
import type { SpeechRecognitionConstructor } from "@/types/browser";
import type { ChatMessage } from "@/types/meeting";
import type { UseMeetingChatOptions } from "@/types/ui";
import { isInsideThinkingBlock, markdownToSpeech, removeThinkingContent } from "@/utils/meeting-content";

const welcomeMessage = (id: string): ChatMessage => ({
  id: `welcome-${id}`,
  role: "assistant",
  content: "This meeting is ready. Ask me anything grounded in its transcript.",
  includeInHistory: false,
});

function toApiHistory(messages: ChatMessage[]): ChatHistoryEntry[] {
  return messages
    .filter((message) => message.includeInHistory)
    .slice(-20)
    .map(({ role, content }) => ({ role: role === "assistant" ? "ai" : "user", text: content }));
}

export function useMeetingChat({ meetingId, token, onRequireAuth, onToast }: UseMeetingChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage(meetingId)]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const { speak, stop, speaking } = useSpeech();

  useEffect(() => {
    stop();
    setInput("");
    setStreamingMessageId(null);
    setMessages([welcomeMessage(meetingId)]);
  }, [meetingId, stop]);

  const updateMessage = (messageId: string, content: string, includeInHistory = true) => {
    setMessages((current) => current.map((message) => (
      message.id === messageId ? { ...message, content, includeInHistory } : message
    )));
  };

  const sendMessage = async (suggestedQuestion?: string) => {
    const question = (suggestedQuestion ?? input).trim();
    if (!question || loading) return;
    if (!token) {
      onRequireAuth();
      onToast("Sign in before asking Echo");
      return;
    }

    const userMessageId = crypto.randomUUID();
    const assistantMessageId = crypto.randomUUID();
    const history = toApiHistory(messages);

    setInput("");
    setLoading(true);
    setStreamingMessageId(assistantMessageId);
    setMessages((current) => [
      ...current,
      { id: userMessageId, role: "user", content: question, includeInHistory: true },
      { id: assistantMessageId, role: "assistant", content: "", includeInHistory: true },
    ]);

    try {
      const rawAnswer = await streamMeetingChat({
        meetingId,
        token,
        question,
        history,
        onProgress: (streamedAnswer) => {
          const visibleAnswer = removeThinkingContent(streamedAnswer);
          const content = isInsideThinkingBlock(streamedAnswer) ? "Thinking..." : visibleAnswer || "Thinking...";
          updateMessage(assistantMessageId, content);
        },
      });

      const finalAnswer = removeThinkingContent(rawAnswer);
      if (!finalAnswer) throw new Error("The AI returned an empty response.");
      updateMessage(assistantMessageId, finalAnswer);
    } catch (error) {
      if (error instanceof EchoApiError && error.status === 401) onRequireAuth();
      const message = error instanceof Error ? error.message : "Unknown API error";
      updateMessage(assistantMessageId, `I couldn’t complete that request: ${message}`, false);
    } finally {
      setStreamingMessageId(null);
      setLoading(false);
    }
  };

  const clearChat = () => {
    stop();
    setStreamingMessageId(null);
    setMessages([{ ...welcomeMessage(crypto.randomUUID()), content: "Chat cleared. What would you like to know?" }]);
  };

  const startVoiceInput = () => {
    const speechWindow = window as typeof window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      onToast("Voice input is not supported in this browser");
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event) => setInput(event.results[0][0].transcript);
    recognition.onerror = () => onToast("I couldn’t hear that. Please try again.");
    recognition.onend = () => setRecognizing(false);
    setRecognizing(true);
    recognition.start();
  };

  const toggleSpeech = (content: string) => speaking ? stop() : speak(markdownToSpeech(content));

  return {
    messages,
    input,
    setInput,
    loading,
    recognizing,
    streamingMessageId,
    speaking,
    sendMessage,
    clearChat,
    startVoiceInput,
    toggleSpeech,
  };
}
