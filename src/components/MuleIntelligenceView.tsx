import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Search,
  Filter,
  ArrowUpDown,
  Download,
  FileText,
  Clock,
  Layers,
  CheckSquare,
  Square,
  CheckCircle,
} from 'lucide-react';
import { AccountMuleScore, MuleLayer } from '../types/forensics';
import { formatINR, maskAccount } from '../utils/bankLookup';

interface MuleIntelligenceViewProps {
  scores: AccountMuleScore[];
  maskAccounts: boolean;
  onSelectAccount: (account: string) => void;
  onGenerateBatchFreezeNotice: (selectedAccounts: string[]) => void;
}

export const MuleIntelligenceView: React.FC<MuleIntelligenceViewProps> = ({
  scores,
  maskAccounts,
  onSelectAccount,
  onGenerateBatchFreezeNotice,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedLayer, setSelectedLayer] = useState<string>('ALL');
  const [minRiskIndex, setMinRiskIndex] = useState<number>(30);
  const [onlyHighVelocity, setOnlyHighVelocity] = useState<boolean>(false);
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());

  // Layer counts
  const layerStats = useMemo(() => {
    let l1 = 0;
    let l2 = 0;
    let l3 = 0;
    let totalRiskVol = 0;

    for (const s of scores) {
      if (s.layer === 'Potential L1 Collector') l1++;
      else if (s.layer === 'Potential L2 Distributor') l2++;
      else if (s.layer === 'Potential L3 Terminal') l3++;
      totalRiskVol += s.metrics.totalIncoming;
    }

    return { l1, l2, l3, totalRiskVol };
  }, [scores]);

  // Filtered and sorted scores
  const filteredScores = useMemo(() => {
    return scores
      .filter((s) => {
        if (s.layer === 'Victim') return false;
        if (s.riskIndex < minRiskIndex) return false;
        if (selectedLayer !== 'ALL' && s.layer !== selectedLayer) return false;
        if (onlyHighVelocity && (s.metrics.passThroughRatio < 0.75 || s.metrics.avgDwellTimeMinutes > 30)) {
          return false;
        }
        if (searchTerm.trim() && !s.accountNumber.toLowerCase().includes(searchTerm.toLowerCase())) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.riskIndex - a.riskIndex);
  }, [scores, minRiskIndex, selectedLayer, onlyHighVelocity, searchTerm]);

  const handleToggleSelect = (acc: string) => {
    setSelectedAccounts((prev) => {
      const next = new Set(prev);
      if (next.has(acc)) next.delete(acc);
      else next.add(acc);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedAccounts.size === filteredScores.length) {
      setSelectedAccounts(new Set());
    } else {
      setSelectedAccounts(new Set(filteredScores.map((s) => s.accountNumber)));
    }
  };

  const getLayerBadge = (layer: MuleLayer) => {
    switch (layer) {
      case 'Potential L1 Collector':
        return 'bg-amber-950/60 text-amber-300 border-amber-600/60';
      case 'Potential L2 Distributor':
        return 'bg-purple-950/60 text-purple-300 border-purple-600/60';
      case 'Potential L3 Terminal':
        return 'bg-red-950/60 text-red-300 border-red-600/60';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Layer Distribution Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono">
        <div className="bg-[#0b121f] border border-amber-700/60 rounded-lg p-4 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase flex items-center justify-between">
            <span>L1 COLLECTORS</span>
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          </div>
          <div className="text-2xl font-bold text-amber-300">{layerStats.l1}</div>
          <p className="text-[10px] text-slate-400">Direct victim intake; swift onward funneling</p>
        </div>

        <div className="bg-[#0b121f] border border-purple-700/60 rounded-lg p-4 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase flex items-center justify-between">
            <span>L2 DISTRIBUTORS</span>
            <span className="w-2 h-2 rounded-full bg-purple-400"></span>
          </div>
          <div className="text-2xl font-bold text-purple-300">{layerStats.l2}</div>
          <p className="text-[10px] text-slate-400">High fan-out dispersal & layering hops</p>
        </div>

        <div className="bg-[#0b121f] border border-red-700/60 rounded-lg p-4 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase flex items-center justify-between">
            <span>L3 TERMINALS</span>
            <span className="w-2 h-2 rounded-full bg-red-400"></span>
          </div>
          <div className="text-2xl font-bold text-red-300">{layerStats.l3}</div>
          <p className="text-[10px] text-slate-400">Cash-out, ATM cardless & crypto exits</p>
        </div>

        <div className="bg-[#0b121f] border border-cyan-700/60 rounded-lg p-4 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase flex items-center justify-between">
            <span>TOTAL MULE EXPOSURE</span>
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
          </div>
          <div className="text-2xl font-bold text-cyan-300">{formatINR(layerStats.totalRiskVol)}</div>
          <p className="text-[10px] text-slate-400">Cumulative transaction volume processed</p>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="bg-[#0a101b] border border-slate-800 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <input
              type="text"
              placeholder="Search Account ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-cyan-200 placeholder-slate-400 focus:outline-none focus:border-cyan-500 w-44"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2" />
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400 text-[11px]">LAYER:</span>
            <select
              value={selectedLayer}
              onChange={(e) => setSelectedLayer(e.target.value)}
              className="bg-slate-900 text-slate-200 text-xs rounded border border-slate-700 px-2 py-1 outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Layers</option>
              <option value="Potential L1 Collector">L1 Collectors</option>
              <option value="Potential L2 Distributor">L2 Distributors</option>
              <option value="Potential L3 Terminal">L3 Terminals</option>
            </select>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400 text-[11px]">MIN SCORE:</span>
            <select
              value={minRiskIndex}
              onChange={(e) => setMinRiskIndex(Number(e.target.value))}
              className="bg-slate-900 text-slate-200 text-xs rounded border border-slate-700 px-2 py-1 outline-none focus:border-cyan-500"
            >
              <option value={30}>Score &ge; 30</option>
              <option value={50}>Score &ge; 50 (Elevated)</option>
              <option value={70}>Score &ge; 70 (Critical Only)</option>
            </select>
          </div>

          <button
            onClick={() => setOnlyHighVelocity(!onlyHighVelocity)}
            className={`px-2.5 py-1 rounded text-xs border transition-all ${
              onlyHighVelocity
                ? 'bg-amber-950 text-amber-300 border-amber-500 font-bold'
                : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            {onlyHighVelocity ? 'High-Velocity Active' : 'Pass-Through >75%'}
          </button>
        </div>

        {/* Batch Freeze Requisition Action */}
        <div className="flex items-center space-x-2">
          {selectedAccounts.size > 0 && (
            <button
              onClick={() => onGenerateBatchFreezeNotice(Array.from(selectedAccounts))}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-red-950 hover:bg-red-900 text-red-300 font-bold border border-red-700 text-xs transition-all shadow-[0_0_12px_rgba(239,68,68,0.3)] cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>FREEZE NOTICE ({selectedAccounts.size} ACCOUNTS)</span>
            </button>
          )}

          <span className="text-slate-400 text-[11px]">
            {filteredScores.length} nodes prioritized
          </span>
        </div>
      </div>

      {/* Main Ranked Mule Accounts Table */}
      <div className="bg-[#0a101b] border border-slate-800 rounded-lg overflow-hidden font-mono shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#080d17] text-[10px] uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3 w-8">
                  <button onClick={handleSelectAll} className="text-slate-400 hover:text-white">
                    {selectedAccounts.size === filteredScores.length && filteredScores.length > 0 ? (
                      <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
                    ) : (
                      <Square className="w-3.5 h-3.5" />
                    )}
                  </button>
                </th>
                <th className="py-2.5 px-3">Account Identifier</th>
                <th className="py-2.5 px-3">Mule Risk Index</th>
                <th className="py-2.5 px-3">Heuristic Classification</th>
                <th className="py-2.5 px-3">Pass-Through %</th>
                <th className="py-2.5 px-3">Avg Dwell Time</th>
                <th className="py-2.5 px-3">Total In / Out</th>
                <th className="py-2.5 px-3">Counterparties</th>
                <th className="py-2.5 px-3">Top Indicators</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredScores.slice(0, 100).map((score) => {
                const isSelected = selectedAccounts.has(score.accountNumber);

                return (
                  <tr
                    key={score.accountNumber}
                    className={`hover:bg-slate-900/60 transition-colors ${
                      isSelected ? 'bg-cyan-950/20' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3">
                      <button
                        onClick={() => handleToggleSelect(score.accountNumber)}
                        className="text-slate-400 hover:text-white cursor-pointer"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
                        ) : (
                          <Square className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </td>

                    <td className="py-2.5 px-3 font-semibold text-cyan-300">
                      <button
                        onClick={() => onSelectAccount(score.accountNumber)}
                        className="hover:underline text-left cursor-pointer"
                      >
                        {maskAccount(score.accountNumber, !maskAccounts)}
                      </button>
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`font-bold ${
                            score.riskIndex >= 70
                              ? 'text-red-400'
                              : score.riskIndex >= 45
                                ? 'text-amber-400'
                                : 'text-slate-300'
                          }`}
                        >
                          {score.riskIndex}/100
                        </span>
                        <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-red-500"
                            style={{ width: `${score.riskIndex}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] border ${getLayerBadge(score.layer)}`}>
                        {score.layer}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 font-bold text-slate-200">
                      {Math.round(score.metrics.passThroughRatio * 100)}%
                    </td>

                    <td className="py-2.5 px-3 text-slate-300">
                      {score.metrics.avgDwellTimeMinutes} mins
                    </td>

                    <td className="py-2.5 px-3 text-[11px]">
                      <div className="text-emerald-400">+{formatINR(score.metrics.totalIncoming)}</div>
                      <div className="text-red-400">-{formatINR(score.metrics.totalOutgoing)}</div>
                    </td>

                    <td className="py-2.5 px-3 text-slate-300">
                      <div>{score.metrics.uniqueCounterparties} unique</div>
                      <div className="text-[10px] text-slate-400">In:{score.metrics.fanInRatio} Out:{score.metrics.fanOutRatio}</div>
                    </td>

                    <td className="py-2.5 px-3 max-w-xs truncate text-[11px] text-slate-400">
                      {score.factors[0]?.name || 'Standard velocity'}
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => onSelectAccount(score.accountNumber)}
                        className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700 text-[10px] font-semibold transition-all cursor-pointer"
                      >
                        INSPECT
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
