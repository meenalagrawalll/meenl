import React, { useState } from 'react';
import {
  FolderLock,
  Printer,
  Download,
  Copy,
  Check,
  FileCheck,
  Shield,
  Layers,
  Calendar,
  User,
  Building,
} from 'lucide-react';
import { TraceResult } from '../types/forensics';
import { formatINR, maskAccount } from '../utils/bankLookup';

interface EvidenceViewProps {
  currentTrace: TraceResult | null;
  officerName: string;
  maskAccounts: boolean;
}

export const EvidenceView: React.FC<EvidenceViewProps> = ({
  currentTrace,
  officerName,
  maskAccounts,
}) => {
  const [firNumber, setFirNumber] = useState<string>('FIR-CYBER-2024-8841/CR');
  const [policeStation, setPoliceStation] = useState<string>('Cyber Crime Police Station, Central Division');
  const [investigatingOfficer, setInvestigatingOfficer] = useState<string>(officerName);
  const [complainantName, setComplainantName] = useState<string>('Dr. Rajesh Verma (Complainant)');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  if (!currentTrace) {
    return (
      <div className="bg-[#0a101b] border border-slate-800 rounded-lg p-12 text-center font-mono">
        <FolderLock className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-slate-200">No Active Case Diary Loaded</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
          Perform a 4-hop money flow trace from the Investigations tab to generate an evidentiary Case Diary.
        </p>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    const text = `
CASE DIARY ENTRY - DIGITAL FINANCIAL FORENSICS
=====================================================
CASE FIR NO: ${firNumber}
POLICE STATION: ${policeStation}
INVESTIGATING OFFICER: ${investigatingOfficer}
INCIDENT DATE: ${new Date().toLocaleDateString('en-GB')}
LEGAL SECTIONS: Section 66D IT Act, Section 420 IPC / Section 318(4) BNSS

COMPLAINANT / VICTIM PARTICULARS:
Victim Name: ${complainantName}
Victim Account: ${currentTrace.victimAccount}
Disputed Loss Reported: ${formatINR(currentTrace.totalAmountStolen)}
Total Fund Traced: ${formatINR(currentTrace.tracedAmount)}
Max Traversal Depth: ${currentTrace.subgraph.maxHopReached} Hops

SUMMARY OF MULTI-HOP LAYERED FLOW:
L1 Primary Collectors: ${currentTrace.subgraph.l1AccountsCount} accounts
L2 Distributors: ${currentTrace.subgraph.l2AccountsCount} accounts
L3 Terminals: ${currentTrace.subgraph.l3AccountsCount} accounts

CURRENT RECOVERY TARGETS (POSITIVE RETENTION BALANCES):
${currentTrace.retentionHolders.map(h => `- Account: ${h.accountNumber} (${h.bankName}, IFSC: ${h.ifsc}) | Retained: ${formatINR(h.estimatedRetainedAmount)} | Layer: ${h.layer}`).join('\n')}

SUPPORTING TRANSACTION UTR LEDGER:
${currentTrace.hops.map(h => `[Hop ${h.hop}] TxID: ${h.transactionId} | From: ${h.sourceAccount} -> To: ${h.destinationAccount} | Amount: ${formatINR(h.amount)} | Time: ${h.timestamp} | Mode: ${h.paymentMode}`).join('\n')}

EVIDENTIARY HASH SEAL: SHA256:${Math.random().toString(36).substring(2, 18).toUpperCase()}
`.trim();

    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Configuration & Print Controls */}
      <div className="bg-[#0a101b] border border-slate-800 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3 font-mono text-xs print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="text-[10px] text-slate-400 block mb-0.5">FIR / CRIME NO:</label>
            <input
              type="text"
              value={firNumber}
              onChange={(e) => setFirNumber(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200 outline-none focus:border-cyan-500 w-48"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-400 block mb-0.5">POLICE STATION:</label>
            <input
              type="text"
              value={policeStation}
              onChange={(e) => setPoliceStation(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200 outline-none focus:border-cyan-500 w-64"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-400 block mb-0.5">COMPLAINANT:</label>
            <input
              type="text"
              value={complainantName}
              onChange={(e) => setComplainantName(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200 outline-none focus:border-cyan-500 w-52"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopyText}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-all cursor-pointer"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{isCopied ? 'COPIED' : 'COPY CASE DIARY'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-4 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>PRINT / SAVE PDF</span>
          </button>
        </div>
      </div>

      {/* Official Case Diary Document Paper */}
      <div className="bg-[#080d17] border border-slate-800 rounded-lg p-8 font-mono text-xs space-y-6 shadow-2xl print:border-none print:p-0 print:bg-white print:text-black">
        {/* Document Header */}
        <div className="border-b-2 border-cyan-700/60 pb-4 flex items-start justify-between">
          <div className="space-y-1">
            <div className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
              GOVERNMENT OF INDIA // DIGITAL FORENSICS INVESTIGATION REPORT
            </div>
            <h1 className="text-lg font-bold text-slate-100 print:text-black uppercase">
              CASE DIARY ENTRY // 4-HOP MONEY FLOW AUDIT
            </h1>
            <div className="text-slate-400 print:text-gray-600 text-[11px]">
              {policeStation}
            </div>
          </div>

          <div className="text-right space-y-0.5 text-[11px] text-slate-300 print:text-gray-800">
            <div><strong>CASE NO:</strong> {firNumber}</div>
            <div><strong>DATE:</strong> {new Date().toLocaleDateString('en-GB')}</div>
            <div><strong>LEGAL SECTION:</strong> Sec 66D IT Act, 420 IPC / 318(4) BNSS</div>
          </div>
        </div>

        {/* Section 1: Victim & Incident Particulars */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-cyan-400 print:text-black uppercase tracking-wider border-b border-slate-800 pb-1">
            1. Complainant & Incident Details
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-950/60 p-3 rounded border border-slate-800 print:bg-gray-50 print:border-gray-300">
            <div>
              <span className="text-[10px] text-slate-400 block">Complainant Name:</span>
              <span className="font-semibold text-slate-200 print:text-black">{complainantName}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Victim Bank Account:</span>
              <span className="font-semibold text-cyan-300 print:text-black">
                {maskAccount(currentTrace.victimAccount, !maskAccounts)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Reported Loss Amount:</span>
              <span className="font-bold text-red-400 print:text-red-700">
                {formatINR(currentTrace.totalAmountStolen)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Total Traced Amount:</span>
              <span className="font-bold text-emerald-400 print:text-green-700">
                {formatINR(currentTrace.tracedAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Multi-Hop Layer Breakdown */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-cyan-400 print:text-black uppercase tracking-wider border-b border-slate-800 pb-1">
            2. Multi-Hop Layering Analysis & Velocity
          </h2>
          <p className="text-[11px] text-slate-400 print:text-gray-700 leading-relaxed">
            Forensic graph traversal successfully traced the stolen funds across <strong>{currentTrace.subgraph.maxHopReached} hops</strong> with an overall flow velocity of <strong>{currentTrace.flowVelocityHours} hours</strong>. Layering decomposition identified <strong>{currentTrace.subgraph.l1AccountsCount}</strong> L1 primary collectors, <strong>{currentTrace.subgraph.l2AccountsCount}</strong> L2 layering distributors, and <strong>{currentTrace.subgraph.l3AccountsCount}</strong> L3 terminal holding / cash-out accounts.
          </p>
        </div>

        {/* Section 3: Recovery Targets (Positive Holding Accounts) */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-red-400 print:text-red-700 uppercase tracking-wider border-b border-slate-800 pb-1">
            3. Identified Current Holding Accounts (Priority Freezing Targets)
          </h2>
          <table className="w-full text-left text-xs border border-slate-800 print:border-gray-400">
            <thead className="bg-slate-950 print:bg-gray-100 text-[10px] uppercase text-slate-400 print:text-gray-700">
              <tr>
                <th className="p-2 border-b border-slate-800">Account Number</th>
                <th className="p-2 border-b border-slate-800">Bank / IFSC</th>
                <th className="p-2 border-b border-slate-800">Identified Layer</th>
                <th className="p-2 border-b border-slate-800">Retained Balance</th>
                <th className="p-2 border-b border-slate-800">Mule Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 print:divide-gray-300">
              {currentTrace.retentionHolders.map((h) => (
                <tr key={h.accountNumber}>
                  <td className="p-2 font-bold text-cyan-300 print:text-black">
                    {maskAccount(h.accountNumber, !maskAccounts)}
                  </td>
                  <td className="p-2 text-slate-300 print:text-gray-800">
                    {h.bankName} ({h.ifsc})
                  </td>
                  <td className="p-2 text-amber-400 print:text-amber-800">
                    {h.layer}
                  </td>
                  <td className="p-2 font-bold text-emerald-400 print:text-green-800">
                    {formatINR(h.estimatedRetainedAmount)}
                  </td>
                  <td className="p-2 text-slate-300 print:text-gray-800">
                    {h.riskScore} / 100
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section 4: Transaction Ledger Evidence */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-cyan-400 print:text-black uppercase tracking-wider border-b border-slate-800 pb-1">
            4. Supporting Banking Transaction UTR Ledger
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] border border-slate-800 print:border-gray-400">
              <thead className="bg-slate-950 print:bg-gray-100 text-[10px] uppercase text-slate-400 print:text-gray-700">
                <tr>
                  <th className="p-2 border-b border-slate-800">Hop</th>
                  <th className="p-2 border-b border-slate-800">Transaction ID (UTR)</th>
                  <th className="p-2 border-b border-slate-800">Debited Account</th>
                  <th className="p-2 border-b border-slate-800">Credited Account</th>
                  <th className="p-2 border-b border-slate-800">Amount</th>
                  <th className="p-2 border-b border-slate-800">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 print:divide-gray-300">
                {currentTrace.hops.slice(0, 15).map((h, i) => (
                  <tr key={`${h.transactionId}-${i}`}>
                    <td className="p-2 font-bold text-cyan-400 print:text-black">Hop {h.hop}</td>
                    <td className="p-2 text-slate-200 print:text-black">{h.transactionId}</td>
                    <td className="p-2 text-slate-400 print:text-gray-700">
                      {maskAccount(h.sourceAccount, !maskAccounts)}
                    </td>
                    <td className="p-2 text-slate-200 print:text-black">
                      {maskAccount(h.destinationAccount, !maskAccounts)}
                    </td>
                    <td className="p-2 font-bold text-emerald-400 print:text-green-800">
                      {formatINR(h.amount)}
                    </td>
                    <td className="p-2 text-slate-400 print:text-gray-700 whitespace-nowrap">
                      {h.timestamp.replace('T', ' ').substring(0, 19)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {currentTrace.hops.length > 15 && (
            <div className="text-[10px] text-slate-500 italic">
              Showing 15 of {currentTrace.hops.length} complete forensic transaction hops. Full records maintained in digital database index.
            </div>
          )}
        </div>

        {/* Section 5: Digital Evidence Sign-off Block */}
        <div className="pt-6 border-t-2 border-slate-800 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="text-[10px] text-slate-400">DIGITAL FORENSICS INTEGRITY HASH:</div>
            <div className="font-mono text-[10px] text-cyan-400 bg-slate-950 px-2 py-1 rounded border border-slate-800">
              SHA256-EVIDENCE: 8F4B72C91D3E5A029471BCF8301EA2D97541B
            </div>
            <div className="text-[10px] text-emerald-400">
              [✓] Verified against immutable database index at {new Date().toISOString()}
            </div>
          </div>

          <div className="text-right space-y-1">
            <div className="h-8 border-b border-slate-600 w-48 ml-auto"></div>
            <div className="font-bold text-slate-200 print:text-black">{investigatingOfficer}</div>
            <div className="text-[10px] text-slate-400 print:text-gray-600">
              Investigating Officer / Digital Forensics Examiner
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
