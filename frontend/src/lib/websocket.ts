"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import type { AgentProgress } from "./api";

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

export function useResearchProgress(researchId: string | null, isComplete: boolean = false) {
  const [events, setEvents] = useState<AgentProgress[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!researchId || isComplete) return;

    const ws = new WebSocket(`${WS_BASE}/ws/research/${researchId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data: AgentProgress = JSON.parse(event.data);
        if (data.type === "pong") return;
        setEvents((prev) => [...prev, data]);
      } catch (e) {
        console.error("Failed to parse WebSocket message:", e);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      // Auto-reconnect after 3 seconds, but only if not complete
      if (!isComplete) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      }
    };

    ws.onerror = (error) => {
      console.warn("WebSocket warning/error:", error);
      ws.close();
    };
  }, [researchId, isComplete]);

  useEffect(() => {
    if (isComplete) {
      if (wsRef.current) {
        wsRef.current.onerror = null;
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      setIsConnected(false);
      return;
    }

    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.onerror = null;
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect, isComplete]);

  const resetEvents = useCallback(() => setEvents([]), []);

  return { events, isConnected, resetEvents };
}
