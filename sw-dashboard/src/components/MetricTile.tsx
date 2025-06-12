

interface MetricTileProps {
  label: string;
  value: string;
  unit?: string;
  color: string;
}

const colorMap: Record<string, string> = {
  green:  'text-green-400',
  yellow: 'text-yellow-300',
  red:    'text-red-400',
};

export default function MetricTile({
  label,
  value,
  unit = '',
  color,
}: MetricTileProps) {
  return (
    <div
      className={`
        flex-1 min-w-[140px] m-1.5 p-3
        bg-[#1e2a38] text-white rounded-lg
        flex flex-col items-center
      `}
    >
      <span className="font-medium opacity-70">{label}</span>
      <span className={`text-2xl font-semibold ${colorMap[color]}`}>
        {value}{unit}
      </span>
    </div>
  );
}