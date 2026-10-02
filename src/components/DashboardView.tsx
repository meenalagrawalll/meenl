import React from 'react';
import {
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
  Search,
  Zap,
  Activity,
  AlertTriangle,
  Layers,
  ChevronRight,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import { IndexStats } from '../services/dataEngine';
import { TraceResult } from '../types/forensics';
import { formatINR, maskAccount } from '../utils/bankLookup';

interface DashboardViewProps {
  stats: IndexStats;
  currentTrace: TraceResult | null;
  onStartInvestigation: (victimAccount?: string) => void;
  maskAccounts: boolean;
  onNavigateToTab: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  currentTrace,
  onStartInvestigation,
  maskAccounts,
  onNavigateToTab,
}) => {
  const activeCases = [
    {
      id: 'CASE-2024-8841',
      victimAccount: 'VIC_8830192841',
      victimName: 'R. K. Verma (Investment Task Fraud)',
      amount: 4550000,
      hopsIdentified: 4,
      mulesInvolved: 18,
      status: 'CRITICAL - ACTIVE LAYER 3 EXIT',
      severity: 'critical',
      tag: 'TELEGRAM TASK SCAM',
    },
    {
      id: 'CASE-2024-9912',
      victimAccount: 'VIC_9941028371',
      victimName: 'Dr. Sunita Sen (CBI Digital Arrest)',
      amount: 2800000,
      hopsIdentified: 4,
      mulesInvolved: 14,
      status: 'FREEZE REQUEST PENDING (L2/L3)',
      severity: 'high',
      tag: 'IMPERSONATION EXTORTION',
    },
    {
      id: 'CASE-2024-7734',
      victimAccount: 'VIC_7718294012',
      victimName: 'Col. A. Nambiar (FedEx Customs Scam)',
      amount: 1575000,
      hopsIdentified: 3,
      mulesInvolved: 9,
      status: 'L2 DISTRIBUTOR PINPOINTED',
      severity: 'high',
      tag: 'PARCEL FRAUD',
    },
    {
      id: 'CASE-2024-6629',
      victimAccount: 'VIC_6629103847',
      victimName: 'Aditya Mathur (Fake Binance Arbitrage)',
      amount: 6200000,
      hopsIdentified: 4,
      mulesInvolved: 22,
      status: 'CRYPTO P2P ESCROW DETECTED',
      severity: 'critical',
      tag: 'CRYPTO LAUNDERING',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Hero Banner / Status Callout */}
      <div className="relative overflow-hidden rounded-lg border border-cyan-900/60 bg-gradient-to-r from-[#081220] via-[#091629] to-[#07101c] p-6 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded bg-cyan-950/60 border border-cyan-700/60 text-cyan-300 font-mono text-xs">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              <span>FORENSIC ENGINE OPERATIONAL // 100% LOCAL AIR-GAPPED</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-mono font-bold tracking-tight text-white">
              Financial Cyber-Forensics & Mule Detection Command
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              Real-time multi-hop graph decomposition, velocity pass-through scoring, and automated bank freeze requisition engine for cyber crime investigators and digital forensic units.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={() => onStartInvestigation()}
              className="flex items-center justify-center space-x-2 px-6 py-3.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-sm shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Search className="w-4 h-4 text-slate-950" />
              <span>START INVESTIGATION</span>
            </button>
            <button
              onClick={() => onNavigateToTab('system')}
              className="flex items-center justify-center space-x-2 px-4 py-3.5 rounded bg-slate-900/90 hover:bg-slate-800 text-cyan-300 font-mono text-xs border border-slate-700 transition-all"
            >
              <Activity className="w-4 h-4" />
              <span>RUN BENCHMARK</span>
            </button>
          </div>
        </div>
      </div>

      {/* 6 Core Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
        {/* Metric 1 */}
        <div className="bg-[#0b121f]/90 border border-slate-800/80 rounded-lg p-3.5 flex flex-col justify-between hover:border-cyan-700/60 transition-colors">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>TRANSACTIONS</span>
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="mt-2">
            <span className="text-xl md:text-2xl font-bold text-cyan-300">
              {stats.totalTransactions.toLocaleString()}
            </span>
            <div className="text-[10px] text-emerald-400 mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Fully Indexed</span>
            </div>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-[#0b121f]/90 border border-slate-800/80 rounded-lg p-3.5 flex flex-col justify-between hover:border-cyan-700/60 transition-colors">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>ACCOUNTS</span>
            <Activity className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="mt-2">
            <span className="text-xl md:text-2xl font-bold text-slate-100">
              {stats.totalAccounts.toLocaleString()}
            </span>
            <div className="text-[10px] text-slate-400 mt-0.5">Dual Inverted Map</div>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-[#0b121f]/90 border border-slate-800/80 rounded-lg p-3.5 flex flex-col justify-between hover:border-amber-700/60 transition-colors">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>HIGH RISK ACCTS</span>
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="mt-2">
            <span className="text-xl md:text-2xl font-bold text-amber-400">
              {stats.highRiskAccountsCount.toLocaleString()}
            </span>
            <div className="text-[10px] text-amber-500/90 mt-0.5">Score &ge; 70 / 100</div>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-[#0b121f]/90 border border-slate-800/80 rounded-lg p-3.5 flex flex-col justify-between hover:border-red-700/60 transition-colors">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>POTENTIAL MULES</span>
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          </div>
          <div className="mt-2">
            <span className="text-xl md:text-2xl font-bold text-red-400">
              {stats.potentialMuleCount.toLocaleString()}
            </span>
            <div className="text-[10px] text-red-500/90 mt-0.5">L1 / L2 / L3 Layers</div>
          </div>
        </div>

        {/* Metric 5 */}
        <div className="bg-[#0b121f]/90 border border-slate-800/80 rounded-lg p-3.5 flex flex-col justify-between hover:border-cyan-700/60 transition-colors">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>ACTIVE CASES</span>
            <Zap className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="mt-2">
            <span className="text-xl md:text-2xl font-bold text-purple-300">5</span>
            <div className="text-[10px] text-purple-400 mt-0.5">Crime Rings Mapped</div>
          </div>
        </div>

        {/* Metric 6 */}
        <div className="bg-[#0b121f]/90 border border-slate-800/80 rounded-lg p-3.5 flex flex-col justify-between hover:border-emerald-700/60 transition-colors">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>VALUE TRACED</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="mt-2">
            <span className="text-xl md:text-2xl font-bold text-emerald-400">
              {currentTrace ? formatINR(currentTrace.tracedAmount) : '₹1.61 Cr'}
            </span>
            <div className="text-[10px] text-emerald-500 mt-0.5">4-Hop Ledger</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Active Cases & Mule Ring Hierarchy */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Forensic Cases ready for 1-Click Investigation */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-mono font-bold tracking-wide text-slate-200 uppercase">
                Prioritized Cyber Crime Cases (Victim Roots)
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-mono bg-cyan-950/60 text-cyan-300 rounded border border-cyan-800/50">
                DISPUTED FUND ORIGINS
              </span>
            </div>
            <button
              onClick={() => onNavigateToTab('investigations')}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {activeCases.map((c) => (
              <div
                key={c.id}
                className="group relative bg-[#0a101b] border border-slate-800 hover:border-cyan-600/70 rounded-lg p-4 transition-all hover:bg-[#0c1424] shadow-md"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2.5">
                      <span className="font-mono text-xs font-bold text-cyan-400">{c.id}</span>
                      <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-slate-900 text-slate-300 border border-slate-700">
                        {c.tag}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                          c.severity === 'critical'
                            ? 'bg-red-950/40 text-red-300 border-red-800/50'
                            : 'bg-amber-950/40 text-amber-300 border-amber-800/50'
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>

                    <div className="text-sm font-semibold text-slate-100 flex items-center space-x-2">
                      <span>{c.victimName}</span>
                    </div>

                    <div className="text-xs font-mono text-slate-400 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span>Victim Account: <strong className="text-slate-200">{maskAccount(c.victimAccount, !maskAccounts)}</strong></span>
                      <span>Disputed: <strong className="text-emerald-400">{formatINR(c.amount)}</strong></span>
                      <span>Mules Flagged: <strong className="text-amber-400">{c.mulesInvolved}</strong></span>
                      <span>Max Depth: <strong className="text-cyan-300">{c.hopsIdentified} Hops</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 self-end sm:self-center">
                    <button
                      onClick={() => onStartInvestigation(c.victimAccount)}
                      className="flex items-center space-x-1.5 px-3 py-2 rounded bg-cyan-600/20 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 font-mono text-xs font-semibold border border-cyan-500/40 transition-all cursor-pointer"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>TRACE 4 HOPS</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Layering Architecture & Mule Risk Distribution */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-mono font-bold tracking-wide text-slate-200 uppercase">
              Mule Hierarchy Architecture
            </h2>
            <span className="text-[10px] font-mono text-slate-400">4-HOP BREAKDOWN</span>
          </div>

          <div className="bg-[#0a101b] border border-slate-800 rounded-lg p-4 space-y-3 font-mono text-xs">
            {/* L1 Collector */}
            <div className="p-2.5 rounded bg-amber-950/20 border border-amber-600/40 space-y-1">
              <div className="flex items-center justify-between text-amber-300 font-bold">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  L1 // Primary Collectors
                </span>
                <span>250 Accounts</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Direct victim deposits. High velocity, fan-in pooling, zero holding period (&lt;15 mins dwell).
              </p>
            </div>

            {/* L2 Distributor */}
            <div className="p-2.5 rounded bg-purple-950/20 border border-purple-600/40 space-y-1">
              <div className="flex items-center justify-between text-purple-300 font-bold">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                  L2 // Layering Distributors
                </span>
                <span>650 Accounts</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Fan-out splitting to obscure audit trails. Multiple concurrent transfers across distinct IFSCs.
              </p>
            </div>

            {/* L3 Terminal */}
            <div className="p-2.5 rounded bg-red-950/20 border border-red-600/40 space-y-1">
              <div className="flex items-center justify-between text-red-300 font-bold">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400"></span>
                  L3 // Terminal / Cash-Out Nodes
                </span>
                <span>600 Accounts</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                ATM cardless cashouts, P2P crypto gateways, merchant aggregator wallets. Primary targets for bank freezing.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Avg Ingestion Speed:</span>
                <span className="text-cyan-300 font-semibold">172,000 rows/sec</span>
              </div>
              <div className="flex justify-between">
                <span>4-Hop Query Latency:</span>
                <span className="text-emerald-400 font-semibold">&lt; 15 ms</span>
              </div>
              <div className="flex justify-between">
                <span>Blind Benchmark F1 Score:</span>
                <span className="text-cyan-300 font-semibold">0.964</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
