import { useState, useEffect, useRef, type JSX } from 'react';
import { useAlertsStream, type Alert} from '../hooks/useAlertStream';
import axios from 'axios';


export default function AlertsList(): JSX.Element {
  const [alerts, setAlerts]   = useState<Alert[]>([]);
  const [pinging, setPinging] = useState<Set<string>>(new Set());
  const initialLoadDone       = useRef(false);

  // initial fetch on mount
  useEffect(() => {
    axios
      .get<Alert[]>('/api/alerts', { params: { limit: 50 } })
      .then(res => setAlerts(res.data))
      .catch(console.error)
      .finally(() => {
        initialLoadDone.current = true;
      });
  }, []);


  // subscribe to shared SSE via hook
  useAlertsStream((incoming: Alert) => {
    const key = `${incoming.code}-${incoming.ts}`;

    // merge 
    setAlerts(prev => {
      const merged = [incoming, ...prev];
      const seen   = new Set<string>();
      const unique: Alert[] = [];
      for (const a of merged) {
        const k = `${a.code}-${a.ts}`;
        if (!seen.has(k)) {
          seen.add(k);
          unique.push(a);
        }
      }
      return unique.slice(0, 50);
    });

    // trigger ping animation only after initial load
    if (initialLoadDone.current) {
      setPinging(prev => new Set(prev).add(key));
      setTimeout(() => {
        setPinging(prev => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }, 10_000);
    }
  });

  // prune alerts every 5 minutes
  useEffect(() => {
    const iv = setInterval(() => {
      const cutoff = Date.now() - 5 * 60 * 1000;
      setAlerts(prev => prev.filter(a => new Date(a.ts).getTime() >= cutoff));
    }, 5 * 60 * 1000);
    return () => clearInterval(iv);
  }, []);

  const levelDot = {
    critical: 'bg-red-500',
    warning:  'bg-yellow-400',
    info:     'bg-green-400',
  } as const;

  const levelBg = {
    critical: 'bg-red-100 text-red-900',
    warning:  'bg-yellow-100 text-yellow-900',
    info:     'bg-green-100 text-green-900',
  } as const;

  return (
    <div className="w-full">
      <ul className="space-y-2  overflow-y-auto">
        {alerts.length === 0 && (
          <li className="text-sm text-gray-500 dark:text-gray-400">
            No alerts yet.
          </li>
        )}
        {alerts.map(a => {
          const key = `${a.code}-${a.ts}`;
          return (
            <li
              key={key}
              className={`p-2 rounded flex items-center justify-between ${levelBg[a.level]} ${pinging.has(key) ? 'animate-pulse' : ''}`}
            >
              <div className="flex items-center">
                <span
                  className={`inline-block w-3 h-3 mr-3 rounded-full ${levelDot[a.level]} ${pinging.has(key) ? 'animate-ping' : ''}`}
                />
                <div>
                  <div className="font-medium">{a.code}</div>
                  <div className="text-xs opacity-75">
                    {new Date(a.ts).toLocaleString()}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
