import React, { useState } from 'react';
import {
  X,
  ShieldAlert,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Users,
  Wifi,
  Smartphone,
  Copy,
  Check,
  FileText,
  Search,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { AccountMuleScore, RawTransaction } from '../types/forensics';
import { formatINR, maskAccount, getBankFromIFSC } from '../utils/bankLookup';

interface AccountIntelligenceModalProps {
  accountScore: AccountMuleScore | null;
  onClose: () => void;
  maskAccounts: boolean;
  onTraceAsOrigin: (account: string) => void;
  onAddToFreezeNotice: (account: string) => void;
  supportingTransactions: RawTransaction[];
  ifscCode?: string;
}

export const AccountIntelligenceModal: React.FC<AccountIntelligenceModalProps> = ({
  accountScore,
  onClose,
  maskAccounts,
  onTraceAsOrigin,
  onAddToFreezeNotice,
  supportingTransactions,
  ifscCode = 'HDFC0004120',
}) => {
  const [copiedTx, setCopiedTx] = useState<string | null>(null);
  const [localUnmask, setLocalUnmask] = useState<boolean>(false);

  if (!accountScore) return null;

  const bank = getBankFromIFSC(ifscCode);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTx(text);
    setTimeout(() => setCopiedTx(null), 2000);
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-red-400 border-red-500/50 bg-red-950/30';
    if (score >= 40) return 'text-amber-400 border-amber-500/50 bg-amber-950/30';
    return 'text-emerald-400 border-emerald-500/50 bg-emerald-950/30';
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-[#070d17] border-l border-cyan-900/60 shadow-2xl flex flex-col font-mono text-xs overflow-hidden backdrop-blur-xl animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-[#0a111e] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-slate-100 tracking-wider text-sm">
            ACCOUNT INTELLIGENCE DOSSIER
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Account Identity Card */}
        <div className="bg-[#0b1424] border border-slate-800 rounded-lg p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">Account Identifier</span>
            <button
              onClick={() => setLocalUnmask(!localUnmask)}
              className="text-[10px] text-cyan-400 hover:underline"
            >
              {localUnmask ? 'Mask' : 'Reveal Full Number'}
            </button>
          </div>
          <div className="text-base font-bold text-cyan-300 tracking-wider">
            {maskAccount(accountScore.accountNumber, localUnmask || !maskAccounts)}
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80 text-[11px]">
            <div>
              <span className="text-slate-400">Bank:</span>{' '}
              <span className="text-slate-200 font-semibold">{bank.bankName}</span>
            </div>
            <div>
              <span className="text-slate-400">IFSC:</span>{' '}
              <span className="text-slate-200 font-semibold">{ifscCode}</span>
            </div>
          </div>
          <div className="text-[10px] text-slate-400">
            Nodal Cyber Cell:{' '}
            <a href={`mailto:${bank.nodalEmail}`} className="text-cyan-400 hover:underline">
              {bank.nodalEmail}
            </a>
          </div>
        </div>

        {/* Risk Score Gauge & Classification */}
        <div className="bg-[#0b1424] border border-slate-800 rounded-lg p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase">MULE RISK INDEX</span>
              <div className="flex items-baseline space-x-1.5 mt-0.5">
                <span className={`text-2xl font-bold ${accountScore.riskIndex >= 70 ? 'text-red-400' : 'text-amber-400'}`}>
                  {accountScore.riskIndex}
                </span>
                <span className="text-xs text-slate-400">/ 100</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase">HEURISTIC CLASSIFICATION</span>
              <div className="mt-1">
                <span className={`px-2 py-0.5 rounded border text-[11px] font-bold ${getScoreColor(accountScore.riskIndex)}`}>
                  {accountScore.layer}
                </span>
              </div>
            </div>
          </div>

          {/* Legal Disclaimer */}
          <div className="p-2 rounded bg-slate-900/90 border border-slate-800 text-[10px] text-slate-400 leading-relaxed">
            <span className="text-amber-400 font-bold">DISCLAIMER:</span> Classifications are based on algorithmic graph velocity heuristics for investigative triage. Not admissible as conclusive legal proof of criminal intent.
          </div>
        </div>

        {/* Core Financial Forensics Metrics Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-[#0b1424] border border-slate-800 rounded p-2.5">
            <div className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>INCOMING FUNDS</span>
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-sm font-bold text-emerald-400 mt-1">
              {formatINR(accountScore.metrics.totalIncoming)}
            </div>
            <div className="text-[10px] text-slate-400">{accountScore.metrics.incomingCount} Transactions</div>
          </div>

          <div className="bg-[#0b1424] border border-slate-800 rounded p-2.5">
            <div className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>OUTGOING FUNDS</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-red-400" />
            </div>
            <div className="text-sm font-bold text-red-400 mt-1">
              {formatINR(accountScore.metrics.totalOutgoing)}
            </div>
            <div className="text-[10px] text-slate-400">{accountScore.metrics.outgoingCount} Transactions</div>
          </div>

          <div className="bg-[#0b1424] border border-slate-800 rounded p-2.5">
            <div className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>PASS-THROUGH RATIO</span>
              <Clock className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-sm font-bold text-purple-300 mt-1">
              {Math.round(accountScore.metrics.passThroughRatio * 100)}%
            </div>
            <div className="text-[10px] text-slate-400">Avg Dwell: {accountScore.metrics.avgDwellTimeMinutes} mins</div>
          </div>

          <div className="bg-[#0b1424] border border-slate-800 rounded p-2.5">
            <div className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>COUNTERPARTIES</span>
              <Users className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-sm font-bold text-cyan-300 mt-1">
              {accountScore.metrics.uniqueCounterparties}
            </div>
            <div className="text-[10px] text-slate-400">Fan-In: {accountScore.metrics.fanInRatio} | Fan-Out: {accountScore.metrics.fanOutRatio}</div>
          </div>
        </div>

        {/* Risk Factors Breakdown */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">
            Identified Risk Indicators ({accountScore.factors.length})
          </div>
          <div className="space-y-1.5">
            {accountScore.factors.map((f, i) => (
              <div
                key={i}
                className="bg-[#0a111e] border border-slate-800/90 rounded p-2.5 space-y-1 text-[11px]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">{f.name}</span>
                  <span className="text-amber-400 font-mono font-bold">+{f.scoreContribution} pts</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-normal">{f.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Supporting Evidence Transactions */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wide flex items-center justify-between">
            <span>Supporting Transaction Records</span>
            <span className="text-[10px] text-slate-400">{supportingTransactions.length} txs</span>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
            {supportingTransactions.slice(0, 8).map((tx) => (
              <div
                key={tx.Transaction_ID}
                className="bg-slate-950/70 border border-slate-800/80 rounded p-2 text-[10px] space-y-1 hover:border-slate-700"
              >
                <div className="flex items-center justify-between">
                  <span className="text-cyan-400 font-bold">{tx.Transaction_ID}</span>
                  <button
                    onClick={() => handleCopy(tx.Transaction_ID)}
                    className="text-slate-400 hover:text-white"
                  >
                    {copiedTx === tx.Transaction_ID ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>{formatINR(tx.Amount)} ({tx.Payment_Mode})</span>
                  <span className="text-slate-400">{tx.Timestamp.replace('T', ' ').substring(0, 16)}</span>
                </div>
                {tx.Narration && (
                  <div className="text-slate-400 truncate font-mono">
                    {tx.Narration}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-slate-800 bg-[#09101d] flex items-center justify-between gap-2">
        <button
          onClick={() => onTraceAsOrigin(accountScore.accountNumber)}
          className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 rounded bg-cyan-950/70 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/60 font-mono text-xs font-bold transition-all cursor-pointer"
        >
          <Search className="w-3.5 h-3.5" />
          <span>TRACE AS ORIGIN</span>
        </button>

        <button
          onClick={() => onAddToFreezeNotice(accountScore.accountNumber)}
          className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 rounded bg-red-950/70 hover:bg-red-900 text-red-300 border border-red-700/60 font-mono text-xs font-bold transition-all cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>ADD TO FREEZE NOTICE</span>
        </button>
      </div>
    </div>
  );
};
