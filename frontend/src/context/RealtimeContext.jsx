import React, { createContext, useContext, useCallback, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext";

// One shared Server-Sent Events connection for the whole app.
//
// The server pushes small typed signals like { type: "appointments" } whenever
// data changes. Data contexts call subscribe(type, handler) and, on a matching
// signal, re-run their normal fetch — so screens update live without a refresh.
// Keeping a single EventSource here (instead of one per context) means just one
// open connection per logged-in tab.

const RealtimeContext = createContext({ subscribe: () => () => {} });

export function RealtimeProvider({ children }) {
  const { token } = useAuth();
  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  // type -> Set<handler>. A ref so subscribe() can stay stable across renders.
  const listenersRef = useRef(new Map());

  const subscribe = useCallback((type, handler) => {
    const map = listenersRef.current;
    if (!map.has(type)) map.set(type, new Set());
    map.get(type).add(handler);
    return () => {
      const set = map.get(type);
      if (set) set.delete(handler);
    };
  }, []);

  useEffect(() => {
    if (!token) return undefined;

    const es = new EventSource(
      `${apiBase}/api/events?token=${encodeURIComponent(token)}`
    );

    es.onmessage = (e) => {
      let event;
      try {
        event = JSON.parse(e.data);
      } catch {
        return; // heartbeats/comments aren't JSON; ignore
      }
      const handlers = listenersRef.current.get(event.type);
      if (handlers) handlers.forEach((h) => h(event));
    };

    // EventSource reconnects on its own; nothing to do on error.
    es.onerror = () => {};

    return () => es.close();
  }, [token, apiBase]);

  return (
    <RealtimeContext.Provider value={{ subscribe }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  return useContext(RealtimeContext);
}
