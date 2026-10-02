import React, { useState } from 'react';
import {
  Search,
  ArrowRight,
  GitFork,
  Clock,
  ShieldAlert,
  AlertTriangle,
  FileText,
  Share2,
  DollarSign,
  Layers,
  ChevronDown,
  ChevronUp,
  Download,
  Filter,
  CheckCircle,
} from 'lucide-react';
import { TraceResult, HopTraceStep, MuleLayer } from '../types/forensics';
import { formatINR, maskAccount } from '../utils/bankLookup';

interface InvestigationViewProps {
  currentTrace: TraceResult | null;
  onTraceAccount: (account: string, hopDepth: number, timeWindowHours: number, minAmount: number) => void;
  knownVictims: string[];
  maskAccounts: boolean;
  onNavigateToTab: (tab: any) => void;
  onSelectAccountForIntelligence: (account: string) => void;
}

export const InvestigationView: React.FC<InvestigationViewProps> = ({
  currentTrace,
  onTraceAccount,
  knownVictims,
  maskAccounts,
  onNavigateToTab,
  onSelectAccountForIntelligence,
}) => {
  const [inputAccount, setInputAccount] = useState<string>(currentTrace?.victimAccount || knownVictims[0] || '');
  const [hopDepth, setHopDepth] = useState<number>(4);
  const [timeWindowHours, setTimeWindowHours] = useState<number>(168); // 7 days
  const [minAmount, setMinAmount] = useState<number>(0);
  const [activeHopTab, setActiveHopTab] = useState<number>(0); // 0 = all hops
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputAccount.trim()) return;
    onTraceAccount(inputAccount.trim(), hopDepth, timeWindowHours, minAmount);
  };

  const handleQuickVictimSelect = (vic: string) => {
    setInputAccount(vic);
    onTraceAccount(vic, hopDepth, timeWindowHours, minAmount);
  };

  const filteredHops = currentTrace
    ? activeHopTab === 0
      ? currentTrace.hops
      : currentTrace.hops.filter((h) => h.hop === activeHopTab)
    : [];

  const getLayerBadge = (layer: MuleLayer) => {
    switch (layer) {
      case 'Potential L1 Collector':
        return 'bg-amber-950/50 text-amber-300 border-amber-600/50';
      case 'Potential L2 Distributor':
        return 'bg-purple-950/50 text-purple-300 border-purple-600/50';
      case 'Potential L3 Terminal':
        return 'bg-red-950/50 text-red-300 border-red-600/50';
      case 'Victim':
        return 'bg-cyan-950/50 text-cyan-300 border-cyan-600/50';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const handleExportJson = () => {
    if (!currentTrace) return;
    const blob = new Blob([JSON.stringify(currentTrace, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forensics_trace_${currentTrace.victimAccount}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Search Header / Investigation Initiator */}
      <div className="bg-[#0a101b] border border-cyan-900/50 rounded-lg p-5 shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <div className="relative flex-1">
              <label htmlFor="victimAccountInput" className="block text-[11px] font-mono text-cyan-400 mb-1 font-semibold uppercase tracking-wider">
                ENTER VICTIM ACCOUNT (ORIGIN OF DISPUTED FUNDS)
              </label>
              <div className="relative">
                <input
                  id="victimAccountInput"
                  type="text"
                  value={inputAccount}
                  onChange={(e) => setInputAccount(e.target.value)}
                  placeholder="e.g. VIC_8830192841 or 16-digit Bank Account..."
                  className="w-full bg-[#050a12] border border-cyan-800/80 rounded-md px-4 py-2.5 font-mono text-sm text-cyan-100 placeholder-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-300 p-1 flex items-center gap-1 font-mono text-[11px]"
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filters</span>
                  {showAdvancedFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>
            </div>

            <div className="self-end pt-5">
              <button
                type="submit"
                className="w-full md:w-auto flex items-center justify-center space-x-2 px-6 py-2.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-sm shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all cursor-pointer"
              >
                <Search className="w-4 h-4 text-slate-950" />
                <span>TRACE MONEY FLOW</span>
              </button>
            </div>
          </div>

          {/* Quick Select Known Victim Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs">
            <span className="text-slate-400 text-[11px]">PRIORITY VICTIMS:</span>
            {knownVictims.slice(0, 5).map((vic) => (
              <button
                key={vic}
                type="button"
                onClick={() => handleQuickVictimSelect(vic)}
                className={`px-2.5 py-1 rounded border text-[11px] transition-all ${
                  inputAccount === vic
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-500 font-bold'
                    : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-slate-500'
                }`}
              >
                {maskAccount(vic, !maskAccounts)}
              </button>
            ))}
          </div>

          {/* Advanced Bounded BFS Filter Controls */}
          {showAdvancedFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-800/80 font-mono text-xs">
              <div>
                <label htmlFor="maxHopDepthSelect" className="block text-slate-400 mb-1">Max Hop Depth (1 - 4):</label>
                <select
                  id="maxHopDepthSelect"
                  value={hopDepth}
                  onChange={(e) => setHopDepth(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 outline-none focus:border-cyan-500"
                >
                  <option value={1}>1 Hop (Direct L1 Collectors only)</option>
                  <option value={2}>2 Hops (Up to L2 Distributors)</option>
                  <option value={3}>3 Hops (Up to L3 Terminals)</option>
                  <option value={4}>4 Hops (Full Forensic Depth)</option>
                </select>
              </div>

              <div>
                <label htmlFor="forwardTimeWindowSelect" className="block text-slate-400 mb-1">Forward Time Window:</label>
                <select
                  id="forwardTimeWindowSelect"
                  value={timeWindowHours}
                  onChange={(e) => setTimeWindowHours(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 outline-none focus:border-cyan-500"
                >
                  <option value={6}>Within 6 Hours of credit</option>
                  <option value={24}>Within 24 Hours (High Velocity)</option>
                  <option value={72}>Within 72 Hours (Standard)</option>
                  <option value={168}>Within 7 Days</option>
                  <option value={720}>Full 30 Days</option>
                </select>
              </div>

              <div>
                <label htmlFor="minThresholdInput" className="block text-slate-400 mb-1">Min Amount Threshold (₹):</label>
                <input
                  id="minThresholdInput"
                  type="number"
                  value={minAmount}
                  onChange={(e) => setMinAmount(Number(e.target.value))}
                  placeholder="0 (Include all transfers)"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Trace Results Dashboard */}
      {currentTrace ? (
        <div className="space-y-6">
          {/* Key Metrics Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 font-mono">
            <div className="bg-[#0b121f] border border-slate-800 rounded-lg p-3">
              <div className="text-[10px] text-slate-400 uppercase">VICTIM ACCOUNT</div>
              <div className="text-sm font-bold text-cyan-300 mt-1 truncate">
                {maskAccount(currentTrace.victimAccount, !maskAccounts)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Complainant Root</div>
            </div>

            <div className="bg-[#0b121f] border border-slate-800 rounded-lg p-3">
              <div className="text-[10px] text-slate-400 uppercase">DISPUTED LOSS</div>
              <div className="text-sm font-bold text-red-400 mt-1">
                {formatINR(currentTrace.totalAmountStolen)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Reported FIR Amount</div>
            </div>

            <div className="bg-[#0b121f] border border-slate-800 rounded-lg p-3">
              <div className="text-[10px] text-slate-400 uppercase">VALUE TRACED</div>
              <div className="text-sm font-bold text-emerald-400 mt-1">
                {formatINR(currentTrace.tracedAmount)}
              </div>
              <div className="text-[10px] text-emerald-500 mt-0.5">100% Forward Causal</div>
            </div>

            <div className="bg-[#0b121f] border border-slate-800 rounded-lg p-3">
              <div className="text-[10px] text-slate-400 uppercase">HOP DEPTH</div>
              <div className="text-sm font-bold text-sky-400 mt-1">
                {currentTrace.subgraph.maxHopReached} Hops
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {currentTrace.subgraph.uniqueAccountsCount} Nodes / {currentTrace.subgraph.edges.length} Edges
              </div>
            </div>

            <div className="bg-[#0b121f] border border-slate-800 rounded-lg p-3">
              <div className="text-[10px] text-slate-400 uppercase">LAYERED NODES</div>
              <div className="text-sm font-bold text-amber-400 mt-1">
                {currentTrace.subgraph.l1AccountsCount} L1 / {currentTrace.subgraph.l2AccountsCount} L2 / {currentTrace.subgraph.l3AccountsCount} L3
              </div>
              <div className="text-[10px] text-amber-500 mt-0.5">Flagged Mule Nodes</div>
            </div>

            <div className="bg-[#0b121f] border border-slate-800 rounded-lg p-3">
              <div className="text-[10px] text-slate-400 uppercase">FLOW VELOCITY</div>
              <div className="text-sm font-bold text-purple-400 mt-1">
                {currentTrace.flowVelocityHours} Hours
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Query Latency: {currentTrace.subgraph.traceLatencyMs}ms
              </div>
            </div>
          </div>

          {/* Quick Action Navigation Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#0a101b] border border-slate-800 rounded-lg font-mono text-xs">
            <div className="flex items-center space-x-2">
              <span className="text-slate-400">INVESTIGATION TOOLS:</span>
              <button
                onClick={() => onNavigateToTab('network-graph')}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-cyan-950/60 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/60 transition-all cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>INTERACTIVE GRAPH</span>
              </button>
              <button
                onClick={() => onNavigateToTab('timeline')}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition-all cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>15-DAY TIMELINE</span>
              </button>
              <button
                onClick={() => onNavigateToTab('reports')}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-red-950/50 hover:bg-red-900 text-red-300 border border-red-700/60 transition-all cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>BANK FREEZE NOTICE</span>
              </button>
            </div>

            <button
              onClick={handleExportJson}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>EXPORT SUBGRAPH JSON</span>
            </button>
          </div>

          {/* Retention Holders: Primary Targets for Bank Freezing */}
          {currentTrace.retentionHolders.length > 0 && (
            <div className="bg-[#0a101b] border border-red-900/40 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-red-400">
                    Priority Recovery Targets // Positive Retention Balances Identified
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  {currentTrace.retentionHolders.length} ACCOUNTS WITH UN-DISBURSED FUNDS
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-slate-950/80 text-[10px] uppercase text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2 px-3">Account Number</th>
                      <th className="py-2 px-3">Bank / IFSC</th>
                      <th className="py-2 px-3">Identified Layer</th>
                      <th className="py-2 px-3">Estimated Holding</th>
                      <th className="py-2 px-3">Mule Risk Index</th>
                      <th className="py-2 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {currentTrace.retentionHolders.slice(0, 6).map((holder) => (
                      <tr key={holder.accountNumber} className="hover:bg-slate-900/50">
                        <td className="py-2.5 px-3 font-semibold text-cyan-300">
                          <button
                            onClick={() => onSelectAccountForIntelligence(holder.accountNumber)}
                            className="hover:underline text-left cursor-pointer"
                          >
                            {maskAccount(holder.accountNumber, !maskAccounts)}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">
                          <div>{holder.bankName}</div>
                          <div className="text-[10px] text-slate-400">{holder.ifsc}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] border ${getLayerBadge(holder.layer)}`}>
                            {holder.layer}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-emerald-400">
                          {formatINR(holder.estimatedRetainedAmount)}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-amber-400 font-bold">{holder.riskScore}/100</span>
                            <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-amber-500 to-red-500"
                                style={{ width: `${holder.riskScore}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => onNavigateToTab('reports')}
                            className="px-2 py-1 rounded bg-red-950/60 hover:bg-red-900 text-red-300 text-[10px] font-bold border border-red-700/60 transition-all cursor-pointer"
                          >
                            FREEZE REQUEST
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Hop-by-Hop Breakdown Ledger */}
          <div className="bg-[#0a101b] border border-slate-800 rounded-lg p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
              <div className="flex items-center space-x-2">
                <GitFork className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                  Forward Money Flow Ledger // Bounded BFS Traversal
                </h3>
              </div>

              {/* Hop Filter Tabs */}
              <div className="flex items-center space-x-1 font-mono text-xs">
                {[0, 1, 2, 3, 4].map((h) => (
                  <button
                    key={h}
                    onClick={() => setActiveHopTab(h)}
                    className={`px-2.5 py-1 rounded border text-[11px] transition-all ${
                      activeHopTab === h
                        ? 'bg-cyan-950 text-cyan-300 border-cyan-500 font-bold'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    {h === 0 ? 'All Hops' : `Hop ${h}`}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-slate-950/80 text-[10px] uppercase text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Hop</th>
                    <th className="py-2.5 px-3">Transaction ID / Mode</th>
                    <th className="py-2.5 px-3">Sender Account</th>
                    <th className="py-2.5 px-3">Receiver Account</th>
                    <th className="py-2.5 px-3">Disbursed Amount</th>
                    <th className="py-2.5 px-3">Receiver Layer</th>
                    <th className="py-2.5 px-3">Mule Score</th>
                    <th className="py-2.5 px-3">Timestamp (ISO)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredHops.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 font-mono">
                        No transactions found for the selected hop filter.
                      </td>
                    </tr>
                  ) : (
                    filteredHops.map((step, idx) => (
                      <tr key={`${step.transactionId}-${idx}`} className="hover:bg-slate-900/50">
                        <td className="py-2.5 px-3 font-bold text-cyan-400">
                          <span className="px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-800/80 text-[10px]">
                            L{step.hop}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-200">{step.transactionId}</div>
                          <div className="text-[10px] text-cyan-400">{step.paymentMode}</div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">
                          <button
                            onClick={() => onSelectAccountForIntelligence(step.sourceAccount)}
                            className="hover:underline text-left cursor-pointer"
                          >
                            {maskAccount(step.sourceAccount, !maskAccounts)}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-slate-200 font-medium">
                          <button
                            onClick={() => onSelectAccountForIntelligence(step.destinationAccount)}
                            className="hover:underline text-left cursor-pointer text-cyan-300"
                          >
                            {maskAccount(step.destinationAccount, !maskAccounts)}
                          </button>
                          <div className="text-[10px] text-slate-400">{step.receiverIfsc}</div>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-emerald-400">
                          {formatINR(step.amount)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] border ${getLayerBadge(step.receiverLayer)}`}>
                            {step.receiverLayer}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`font-bold ${step.receiverRisk >= 70 ? 'text-red-400' : 'text-amber-400'}`}>
                            {step.receiverRisk}/100
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-400 whitespace-nowrap">
                          {step.timestamp.replace('T', ' ').substring(0, 19)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#0a101b] border border-slate-800 rounded-lg p-12 text-center font-mono space-y-4">
          <div className="w-12 h-12 rounded-full bg-cyan-950/60 border border-cyan-600/40 text-cyan-400 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-200">No Active Investigation Loaded</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Select a priority victim account above or enter any complainant account number to initiate high-speed 4-hop bounded money flow tracing.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
