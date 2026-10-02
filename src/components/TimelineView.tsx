import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Clock,
  Calendar,
  Filter,
  Activity,
  ArrowRight,
} from 'lucide-react';
import { RawTransaction } from '../types/forensics';
import { formatINR, maskAccount } from '../utils/bankLookup';

interface TimelineViewProps {
  transactions: RawTransaction[];
  maskAccounts: boolean;
  onSelectAccount: (account: string) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  transactions,
  maskAccounts,
  onSelectAccount,
}) => {
  if (transactions.length === 0) {
    return (
      <div className="bg-[#0a101b] border border-slate-800 rounded-lg p-12 text-center font-mono">
        <Clock className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
        <p className="text-slate-400">No transactions loaded to construct timeline.</p>
      </div>
    );
  }

  // Calculate timestamp boundaries
  const sortedTxs = [...transactions].sort(
    (a, b) => new Date(a.Timestamp).getTime() - new Date(b.Timestamp).getTime()
  );

  const minTime = new Date(sortedTxs[0].Timestamp).getTime();
  const maxTime = new Date(sortedTxs[sortedTxs.length - 1].Timestamp).getTime();

  const [currentTime, setCurrentTime] = useState<number>(minTime + (maxTime - minTime) * 0.35);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(2); // 1x, 2x, 5x
  const [searchAccount, setSearchAccount] = useState<string>('');
  const [minAmount, setMinAmount] = useState<number>(0);

  const playIntervalRef = useRef<any>(null);

  // Playback timer
  useEffect(() => {
    if (isPlaying) {
      const stepDuration = 80; // ms
      const timeIncrement = (maxTime - minTime) / 300 * playbackSpeed;

      playIntervalRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + timeIncrement;
          if (next >= maxTime) {
            setIsPlaying(false);
            return maxTime;
          }
          return next;
        });
      }, stepDuration);
    } else {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    }

    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, playbackSpeed, minTime, maxTime]);

  const handleStep = (direction: 'back' | 'forward') => {
    const stepSize = (maxTime - minTime) / 30; // approx 12 hours
    if (direction === 'back') {
      setCurrentTime((prev) => Math.max(minTime, prev - stepSize));
    } else {
      setCurrentTime((prev) => Math.min(maxTime, prev + stepSize));
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentTime(minTime);
  };

  // Filter transactions visible up to current time
  const visibleTxs = sortedTxs.filter((tx) => {
    const txTime = new Date(tx.Timestamp).getTime();
    if (txTime > currentTime) return false;
    if (minAmount > 0 && tx.Amount < minAmount) return false;
    if (searchAccount.trim()) {
      const query = searchAccount.toLowerCase();
      if (!tx.Sender_Account.toLowerCase().includes(query) && !tx.Receiver_Account.toLowerCase().includes(query)) {
        return false;
      }
    }
    return true;
  });

  const cumulativeAmount = visibleTxs.reduce((sum, tx) => sum + tx.Amount, 0);

  // Histogram bins (15 days)
  const numBins = 15;
  const binDuration = (maxTime - minTime) / numBins;
  const bins = new Array(numBins).fill(0);
  for (const tx of sortedTxs) {
    const t = new Date(tx.Timestamp).getTime();
    const binIdx = Math.min(numBins - 1, Math.floor((t - minTime) / binDuration));
    if (binIdx >= 0) bins[binIdx] += tx.Amount;
  }
  const maxBinVolume = Math.max(...bins, 1);

  const currentDateObj = new Date(currentTime);
  const currentBinIdx = Math.min(numBins - 1, Math.floor((currentTime - minTime) / binDuration));

  return (
    <div className="space-y-6">
      {/* Top Playback & Scrubber Console */}
      <div className="bg-[#0a101b] border border-cyan-900/60 rounded-lg p-5 space-y-5 font-mono shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-100">
                15-Day High-Velocity Forensic Timeline
              </h2>
            </div>
            <p className="text-[11px] text-slate-400">
              Scrub and replay the propagation of disputed funds across accounts with minute-level timestamp precision.
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <div className="bg-slate-950/80 border border-slate-800 rounded px-3 py-1.5 text-right">
              <div className="text-[10px] text-slate-400 uppercase">ACTIVE TIMECODE</div>
              <div className="text-sm font-bold text-cyan-300">
                {currentDateObj.toLocaleDateString('en-GB')} {currentDateObj.toLocaleTimeString()}
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded px-3 py-1.5 text-right">
              <div className="text-[10px] text-slate-400 uppercase">CUMULATIVE STOLEN FLOW</div>
              <div className="text-sm font-bold text-emerald-400">
                {formatINR(cumulativeAmount)}
              </div>
            </div>
          </div>
        </div>

        {/* Visual Timeline Volume Histogram */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>VOLUME DENSITY (DAY 1 TO 15)</span>
            <span>CURRENT POSITION: DAY {currentBinIdx + 1} OF 15</span>
          </div>
          <div className="h-16 flex items-end gap-1.5 bg-[#05080e] p-2 rounded border border-slate-800/90">
            {bins.map((vol, idx) => {
              const heightPct = Math.max(8, (vol / maxBinVolume) * 100);
              const isPast = idx <= currentBinIdx;
              const isCurrent = idx === currentBinIdx;

              return (
                <div
                  key={idx}
                  onClick={() => setCurrentTime(minTime + idx * binDuration + binDuration / 2)}
                  title={`Day ${idx + 1}: ${formatINR(vol)}`}
                  className={`flex-1 rounded-t transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-cyan-400 shadow-[0_0_8px_#00f0ff]'
                      : isPast
                        ? 'bg-cyan-900/60 hover:bg-cyan-700/80'
                        : 'bg-slate-800/40 hover:bg-slate-700/60'
                  }`}
                  style={{ height: `${heightPct}%` }}
                />
              );
            })}
          </div>
        </div>

        {/* Slider Scrubber */}
        <div className="space-y-2">
          <input
            type="range"
            min={minTime}
            max={maxTime}
            value={currentTime}
            onChange={(e) => setCurrentTime(Number(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>{new Date(minTime).toLocaleDateString('en-GB')} 00:00 (Incident Start)</span>
            <span>{new Date(maxTime).toLocaleDateString('en-GB')} 23:59 (Current Ledger Boundary)</span>
          </div>
        </div>

        {/* Playback Controls & Filters Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {/* VCR Style Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleReset}
              title="Reset to Day 1"
              className="p-2 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleStep('back')}
              title="Step Backward (~12 Hours)"
              className="p-2 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-all"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center space-x-2 px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] cursor-pointer"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{isPlaying ? 'PAUSE' : 'PLAY TIMELINE'}</span>
            </button>

            <button
              onClick={() => handleStep('forward')}
              title="Step Forward (~12 Hours)"
              className="p-2 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-all"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {/* Speed Multiplier */}
            <div className="flex items-center space-x-1 pl-2 border-l border-slate-800">
              {[1, 2, 5].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`px-2 py-1 rounded text-xs border ${
                    playbackSpeed === spd
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-500 font-bold'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          {/* Filter Inputs */}
          <div className="flex items-center space-x-3 text-xs">
            <input
              type="text"
              placeholder="Filter by Account..."
              value={searchAccount}
              onChange={(e) => setSearchAccount(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 placeholder-slate-400 text-xs outline-none focus:border-cyan-500 w-44"
            />
            <input
              type="number"
              placeholder="Min Amount (₹)..."
              value={minAmount || ''}
              onChange={(e) => setMinAmount(Number(e.target.value))}
              className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 placeholder-slate-400 text-xs outline-none focus:border-cyan-500 w-32"
            />
          </div>
        </div>
      </div>

      {/* Ledger of Transactions Materialized up to Timecode */}
      <div className="bg-[#0a101b] border border-slate-800 rounded-lg p-4 space-y-3 font-mono">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Transactions Executed Prior to Timecode ({visibleTxs.length} records)
            </h3>
          </div>
          <span className="text-[10px] text-slate-400">
            SHOWING RECENT 100 OF {visibleTxs.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-[10px] uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2 px-3">Timestamp</th>
                <th className="py-2 px-3">Transaction ID</th>
                <th className="py-2 px-3">Sender Account</th>
                <th className="py-2 px-3">Receiver Account</th>
                <th className="py-2 px-3">Amount</th>
                <th className="py-2 px-3">Mode</th>
                <th className="py-2 px-3">Narration Marker</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {visibleTxs.slice(-100).reverse().map((tx) => (
                <tr key={tx.Transaction_ID} className="hover:bg-slate-900/50">
                  <td className="py-2 px-3 text-slate-400 whitespace-nowrap text-[11px]">
                    {tx.Timestamp.replace('T', ' ').substring(0, 19)}
                  </td>
                  <td className="py-2 px-3 font-bold text-cyan-300">
                    {tx.Transaction_ID}
                  </td>
                  <td className="py-2 px-3 text-slate-300">
                    <button
                      onClick={() => onSelectAccount(tx.Sender_Account)}
                      className="hover:underline text-left cursor-pointer"
                    >
                      {maskAccount(tx.Sender_Account, !maskAccounts)}
                    </button>
                  </td>
                  <td className="py-2 px-3 text-slate-200">
                    <button
                      onClick={() => onSelectAccount(tx.Receiver_Account)}
                      className="hover:underline text-left cursor-pointer text-cyan-400"
                    >
                      {maskAccount(tx.Receiver_Account, !maskAccounts)}
                    </button>
                  </td>
                  <td className="py-2 px-3 font-bold text-emerald-400">
                    {formatINR(tx.Amount)}
                  </td>
                  <td className="py-2 px-3">
                    <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] text-sky-300">
                      {tx.Payment_Mode}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-[11px] text-slate-400 truncate max-w-xs">
                    {tx.Narration}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
