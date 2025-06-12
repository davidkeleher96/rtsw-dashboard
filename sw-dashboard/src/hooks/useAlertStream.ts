import { useEffect, useRef } from 'react';

export interface Alert {
  ts:      string;
  code:    string;
  level:   'info' | 'warning' | 'critical';
  payload: Record<string, any>;
}

type Listener = (a: Alert) => void;
const listeners: Listener[] = [];
let source: EventSource | null = null;

function startStream() {
  if (source) return;
  source = new EventSource('/api/alerts/stream');
  source.addEventListener('alert', (e: MessageEvent) => {
    const alert = JSON.parse(e.data) as Alert;
    listeners.forEach(fn => fn(alert));
  });
  source.onerror = err => {
    console.error('SSE error', err);
    source?.close();
    source = null;
  };
}

export function useAlertsStream(onAlert: Listener) {
  const saved = useRef<Listener>(onAlert);
  saved.current = onAlert;

  useEffect(() => {
    startStream();
    listeners.push(saved.current);

    return () => {
      // remove this listener
      const idx = listeners.indexOf(saved.current);
      if (idx !== -1) listeners.splice(idx, 1);

      // if nobody’s listening, close the stream
      if (listeners.length === 0) {
        source?.close();
        source = null;
      }
    };
  }, []);
}
