import { useAgeStatus } from '../hooks/useAgeStatus';

export default function LastUpdateBadge({ lastTS }: { lastTS: string | null }) {
  const status = useAgeStatus(lastTS);
  if (!lastTS) return null;

  const colorClass = {
    LIVE:        'bg-green-500',
    PENDING:     'bg-yellow-400',
    'OUT OF DATE':'bg-red-500'
  }[status];

  return (
    <span className={`px-3 py-1 rounded-full text-xs text-white ${colorClass}  ${status == 'PENDING' ? 'animate-pulse': ''}` }>
      {status}
    </span>
  );
}
