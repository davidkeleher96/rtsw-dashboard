import React from 'react';
import type { TooltipProps } from 'recharts';

export const CustomTooltip: React.FC<TooltipProps<any, any>> = ({
    active,
    payload,
    label
}) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;

    return (
        <div >
            <div className="text-xs font-bold text-gray-200 mb-1">{label}</div>
            <ul className="text-sm">
                {Object.entries(data)
                    .filter(([key]) => key !== 'tsLabel' && key !== 'tsISO')
                    .map(([key, val]) => {
                        let disp: string;
                        if (typeof val === 'number') {
                            disp = val.toFixed(4);
                        } else if (!isNaN(parseFloat(val as any))) {
                            disp = parseFloat(val as string).toFixed(4);
                        } else {
                            disp = String(val);
                        }

                        return (
                            <li key={key} className="flex justify-between gap-4">
                                <span className="capitalize">{key.replace(/_/g, ' ')}:</span>
                                <span className="font-mono">{disp}</span>
                            </li>
                        );
                    })
                }
            </ul>
        </div>
    );
};
