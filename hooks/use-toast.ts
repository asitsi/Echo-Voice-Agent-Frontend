"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useToast(duration = 2600) {
  const [message, setMessage] = useState("");
  const timeoutRef = useRef<number | null>(null);

  const showToast = useCallback((nextMessage: string) => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    setMessage(nextMessage);
    timeoutRef.current = window.setTimeout(() => setMessage(""), duration);
  }, [duration]);

  useEffect(() => () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
  }, []);

  return { message, showToast };
}
