import React from 'react';
import { Shield, Eye, EyeOff, FileText, Database, Activity, RefreshCw } from 'lucide-react';
import { IndexStats } from '../services/dataEngine';

interface HeaderProps {
  stats: IndexStats;
  maskAccounts: boolean;
  onToggleMask: () => void;
  onOpenAudit: () => void;
  onOpenImport: () => void;
  onResetBenchmark: () => void;
  officerName: string;
  onChangeOfficer: (name: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  stats,
  maskAccounts,
  onToggleMask,
  onOpenAudit,
  onOpenImport,
  onResetBenchmark,
  officerName,
  onChangeOfficer,
}) => {
  return (
    <header className="border-b border-cyan-950/60 bg-[#070c14]/95 backdrop-blur-md sticky top-0 z-40 text-xs">
      <div className="max-w-[1920px] mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Brand & SOC Badge */}
        <div className="flex items-center space-x-3">
          <div className="relative flex items-center justify-center w-8 h-8 rounded border border-cyan-500/40 bg-cyan-950/30 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.25)]">
            <Shield className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono font-bold tracking-wider text-sm bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 bg-clip-text text-transparent">
                MULETRACE // FORENSICS
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono tracking-tight bg-cyan-900/40 text-cyan-300 border border-cyan-700/50">
                OFFLINE SOC v2.4
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
              <span>CYBER FINANCIAL INTELLIGENCE & 4-HOP TRACE ENGINE</span>
            </div>
          </div>
        </div>

        {/* Center: Live Index Counters */}
        <div className="hidden lg:flex items-center space-x-4 border border-slate-800/80 rounded bg-slate-950/60 px-3 py-1 font-mono text-[11px]">
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400">INDEXED:</span>
            <span className="text-cyan-300 font-semibold">{stats.totalTransactions.toLocaleString()} TXS</span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400">ACCOUNTS:</span>
            <span className="text-slate-200 font-semibold">{stats.totalAccounts.toLocaleString()}</span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400">FLAGGED MULES:</span>
            <span className="text-amber-400 font-semibold">{stats.potentialMuleCount} NODES</span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400">INDEX TIME:</span>
            <span className="text-emerald-400 font-semibold">{stats.indexingTimeMs}ms</span>
          </div>
        </div>

        {/* Right: Security & Actions Controls */}
        <div className="flex items-center space-x-2.5">
          {/* Account Masking Toggle */}
          <button
            onClick={onToggleMask}
            title={maskAccounts ? "Sensitive account numbers masked. Click to reveal." : "Account numbers visible. Click to mask."}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded font-mono text-[11px] transition-all border ${
              maskAccounts
                ? 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-slate-500'
                : 'bg-amber-950/40 text-amber-300 border-amber-600/60 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
            }`}
          >
            {maskAccounts ? <EyeOff className="w-3.5 h-3.5 text-cyan-400" /> : <Eye className="w-3.5 h-3.5 text-amber-400" />}
            <span>{maskAccounts ? 'MASKED' : 'PLAIN'}</span>
          </button>

          {/* Import CSV */}
          <button
            onClick={onOpenImport}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded font-mono text-[11px] bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 border border-cyan-800/60 transition-all hover:border-cyan-500"
          >
            <Database className="w-3.5 h-3.5" />
            <span>INGEST CSV</span>
          </button>

          {/* Audit Trail */}
          <button
            onClick={onOpenAudit}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded font-mono text-[11px] bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-all"
          >
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>AUDIT TRAIL</span>
          </button>

          {/* Reset Benchmark Data */}
          <button
            onClick={onResetBenchmark}
            title="Reload standard synthetic benchmark dataset"
            className="p-1.5 rounded bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-slate-700 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Officer Selector */}
          <div className="flex items-center space-x-1.5 pl-2 border-l border-slate-800 font-mono">
            <span className="text-[10px] text-slate-400">IO:</span>
            <select
              value={officerName}
              onChange={(e) => onChangeOfficer(e.target.value)}
              className="bg-slate-900/90 text-cyan-300 text-[11px] rounded border border-slate-700 px-2 py-1 outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="IO_CYBER_8412">IO_CYBER_8412 (Insp. Roy)</option>
              <option value="FORENSIC_LEAD_09">FORENSIC_LEAD_09 (Dr. Mehta)</option>
              <option value="NODAL_ANALYST_03">NODAL_ANALYST_03 (Sub-Insp. Sharma)</option>
              <option value="AUDITOR_READONLY">AUDITOR_READONLY</option>
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};
