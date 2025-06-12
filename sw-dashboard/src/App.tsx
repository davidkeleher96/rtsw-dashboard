import { useState, useEffect, useRef } from 'react';
import {
  LineChart, Line, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  Brush, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { CustomTooltip } from './components/CustomToolTip';
import LastUpdateBadge from './components/LastUpdateBadge'
import AlertsList from './components/AlertLists';
import MetricTile from './components/MetricTile';
import axios from 'axios';
// ------------- Helpers --------------
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour12: false });

function dynPressure(density: number, speed: number) {
  // P ≈ 1.6726e-6 · n · V²  (n in cm⁻³, V in km/s, P in nPa)
  if (density == null || speed == null) return 0;
  return 1.6726e-6 * density * speed * speed;
}

type BandTuple = [g: number, y: number];
// Color helpers for status tiles
const band = (v: number, [g, y]: BandTuple) => v >= y ? 'red' : v >= g ? 'yellow' : 'green';

interface RTSWData {
  tsLabel: string;
  tsISO: string;
  speed: number;
  density: number;
  bz: number;
  dynP: number;
}



// ------------- Main App --------------
export default function App() {
  const [data, setData] = useState<RTSWData[]>([]);
  const [lastTS, setLastTS] = useState(null);
  const [connOK, setConnOK] = useState(true);
  const evtSourceRef = useRef<EventSource | null>( null);
  // -- Load history on mount ------------------
  useEffect(() => {
    axios.get('/api/data?limit=300')
      .then((res: any) => {
        const formatted = res.data.map((row: any) => ({
          tsLabel: fmtTime(row.time_tag),
          tsISO: row.time_tag,
          speed: +row.speed,
          density: +row.density,
          bz: +row.bz,
          dynP: dynPressure(+row.density, +row.speed)
        }));

        //  sort ascending by tsISO
        formatted.sort((a: RTSWData, b: RTSWData) => new Date(a.tsISO).getTime() - new Date(b.tsISO).getTime());

        setData(formatted);
        if (formatted.length) setLastTS(formatted.at(-1).tsISO);
      })
      .catch(console.error);
  }, []);

  // -- Live SSE stream -------------------------
  useEffect(() => {
    const url = '/api/stream'
    const src = new EventSource(url)
    evtSourceRef.current = src;

    src.onmessage = e => {
      setConnOK(true);
      const rec = JSON.parse(e.data);
      const point = {
        tsLabel: fmtTime(rec.time_tag),
        tsISO: rec.time_tag,
        speed: +rec.speed,
        density: +rec.density,
        bz: +rec.bz,
        dynP: dynPressure(+rec.density, +rec.speed)
      };
      setData((prev: RTSWData[])=> {
        const next = [...prev, point];
        return next.slice(-500); // keep rolling window
      });
      setLastTS(rec.time_tag);
    };

    src.onerror = () => {
      setConnOK(false);  // show badge = disconnected
    };
    return () => src.close();
  }, []);

  // -- stats for tiles --------------
  const latest = data.at(-1);

 if (!latest) {
  return <div className="min-h-screen w-full bg-[#0d1117] text-[#c9d1d9]">Cannot connect…</div>;
}
  const tileColor = {
    speed: band(latest.speed, [500, 700]),
    density: band(latest.density, [10, 25]),
    bz: latest.bz <= -5 ? (latest.bz <= -10 ? 'red' : 'yellow') : 'green',
    dynP: latest.dynP ? band(latest.dynP, [2, 6]): 'green'
  };

  // -- UI --------------------------------------

return (
  <div className="min-h-screen w-full grid grid-rows-[auto,1fr] gap-2 p-5 bg-[#0d1117] text-[#c9d1d9] ">
    {/* Header */}
    <header className="flex justify-between items-center">
      <h2 className="text-2xl font-bold">Propagated Solar-Wind Dashboard</h2>
               <div className="flex flex-wrap justify-start items-end gap-2">
                 <p className="text-xs opacity-60 mt-2">
             Last update: {lastTS ? new Date(lastTS).toLocaleString() + ' UTC' : ''}
           </p>
           {connOK
             ? <LastUpdateBadge lastTS={lastTS} />
             : (
               <span className="px-3 py-1 rounded-full text-xs text-white bg-red-600">
                 DISCONNECTED
               </span>
             )
           }
          
         </div>
    </header>

    {/* Main */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 overflow-auto">
      {/* Left: metrics & chart */}
      <div className="lg:col-span-2 flex flex-col gap-2 h-full">
        {/* Metrics */}
        <div className="bg-[#1e2a38] p-6 rounded-lg shadow grid grid-cols-4 gap-4">
      <MetricTile label="Speed"        value={latest.speed?.toFixed(0)}  unit=" km/s" color={tileColor.speed} />
      <MetricTile label="Density"      value={latest.density?.toFixed(1)} unit=" p/cm³" color={tileColor.density} />
      <MetricTile label="Bz"           value={latest.bz?.toFixed(1)}     unit=" nT"   color={tileColor.bz} />
      <MetricTile label="Dyn Pressure" value={latest.dynP?.toFixed(2)}   unit=" nPa"  color={tileColor.dynP} />
        </div>

        {/* Chart */}
        <div className="bg-[#1e2a38] p-6 rounded-lg shadow flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid stroke="#222" />
              <XAxis dataKey="tsLabel" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis yAxisId="left" orientation="left" stroke="#7ff0ff" domain={['auto', 'auto']} />
              <YAxis yAxisId="right" orientation="right" stroke="#ffc32d" domain={['auto', 'auto']} />
              <Tooltip content={props => <CustomTooltip {...props} />} cursor={{ stroke: '#555', strokeDasharray: '3 3' }} />
              <Legend />
              {/* Reference line for Bz = 0 */}
              <ReferenceLine y={0} yAxisId="right" stroke="#555" strokeDasharray="3 3" />
              {/* Speed & Density lines */}
              <Line yAxisId="left" type="monotone" dataKey="speed" stroke="#7ff0ff" dot={false} name="Speed km/s" />
              <Area yAxisId="left" type="monotone" dataKey="density" fill="#82ca9d55" stroke="#82ca9d" name="Density" />
              {/* IMF Bz on its own axis */}
              <Line yAxisId="right" type="monotone" dataKey="bz" stroke="#ffc32d" dot={false} name="Bz nT" />
              {/* Brush to zoom */}
              <Brush 
                dataKey="tsLabel" 
                height={24} 
                travellerWidth={8} 
                // stroke="#1e2a38" 
                fill="#0d1117" 
                // travellerStroke="#c9d1d9" 
                
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Right: alerts */}
      <div className="bg-[#1e2a38] p-6 rounded-lg shadow flex flex-col">
        <h3 className="text-xl font-semibold mb-4">
          Current Alerts
        </h3>
        <div className="flex-1 overflow-auto">
          <AlertsList />
        </div>
      </div>
    </div>
  </div>
);
}