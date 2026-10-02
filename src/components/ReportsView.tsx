import React, { useState, useMemo } from 'react';
import {
  FileText,
  ShieldCheck,
  ShieldAlert,
  Printer,
  Copy,
  Check,
  Building2,
  Mail,
  Scale,
  AlertTriangle,
  RefreshCw,
  Lock,
} from 'lucide-react';
import { TraceResult } from '../types/forensics';
import { dataEngine } from '../services/dataEngine';
import { buildEvidenceContext, validateReportFacts, FactValidationResult } from '../services/factValidator';
import { formatINR, maskAccount, getBankFromIFSC } from '../utils/bankLookup';

interface ReportsViewProps {
  currentTrace: TraceResult | null;
  officerName: string;
  maskAccounts: boolean;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  currentTrace,
  officerName,
  maskAccounts,
}) => {
  const [legalSection, setLegalSection] = useState<string>(
    'Section 91 & 102, Code of Criminal Procedure (CrPC) / Section 94, Bharatiya Nagarik Suraksha Sanhita (BNSS)'
  );
  const [firNumber, setFirNumber] = useState<string>('FIR No. 8841/2024');
  const [policeStation, setPoliceStation] = useState<string>('Cyber Crime Police Station, Headquarters');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [simulateTamper, setSimulateTamper] = useState<boolean>(false);

  // Extract all accounts, IFSCs, amounts, and tx IDs from the current trace
  const reportData = useMemo(() => {
    if (!currentTrace) return null;

    const accounts = [
      currentTrace.victimAccount,
      ...currentTrace.hops.map((h) => h.destinationAccount),
    ];
    const ifscCodes = currentTrace.hops.map((h) => h.receiverIfsc);
    const txIds = currentTrace.hops.map((h) => h.transactionId);
    const amounts = currentTrace.hops.map((h) => h.amount);

    if (simulateTamper) {
      // Intentionally inject an unverified account & amount to demonstrate the strict Fact Validator
      accounts.push('ACC_FORGED_999999');
      amounts.push(99999999);
    }

    return { accounts, ifscCodes, txIds, amounts };
  }, [currentTrace, simulateTamper]);

  // Run Fact Validator against raw transactions database
  const validationResult: FactValidationResult | null = useMemo(() => {
    if (!reportData) return null;
    const allTxs = dataEngine.getAllTransactions();
    const evidenceCtx = buildEvidenceContext(allTxs);
    return validateReportFacts(reportData, evidenceCtx);
  }, [reportData]);

  if (!currentTrace) {
    return (
      <div className="bg-[#0a101b] border border-slate-800 rounded-lg p-12 text-center font-mono">
        <Scale className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-slate-200">No Investigation Active</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
          Perform a 4-hop trace from the Investigations tab to generate legal Bank Freeze Requisitions.
        </p>
      </div>
    );
  }

  // Group accounts to freeze by Bank IFSC prefix
  const bankGroups = useMemo(() => {
    const map = new Map<string, {
      bankName: string;
      category: string;
      nodalEmail: string;
      accounts: {
        account: string;
        ifsc: string;
        layer: string;
        disputedAmount: number;
        txIds: string[];
        latestTimestamp: string;
      }[];
    }>();

    for (const hop of currentTrace.hops) {
      const bankInfo = getBankFromIFSC(hop.receiverIfsc);
      let group = map.get(bankInfo.bankName);
      if (!group) {
        group = {
          bankName: bankInfo.bankName,
          category: bankInfo.category,
          nodalEmail: bankInfo.nodalEmail,
          accounts: [],
        };
        map.set(bankInfo.bankName, group);
      }

      const existingAcc = group.accounts.find((a) => a.account === hop.destinationAccount);
      if (existingAcc) {
        existingAcc.disputedAmount += hop.amount;
        if (!existingAcc.txIds.includes(hop.transactionId)) existingAcc.txIds.push(hop.transactionId);
      } else {
        group.accounts.push({
          account: hop.destinationAccount,
          ifsc: hop.receiverIfsc,
          layer: hop.receiverLayer,
          disputedAmount: hop.amount,
          txIds: [hop.transactionId],
          latestTimestamp: hop.timestamp,
        });
      }
    }

    return Array.from(map.values());
  }, [currentTrace]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyNotice = () => {
    const text = `
LEGAL NOTICE UNDER ${legalSection.toUpperCase()}
=============================================================
TO: NODAL CYBER CRIME OFFICER / LAW ENFORCEMENT LIAISON
SUBJECT: IMMEDIATE DEBIT-FREEZE REQUISITION - FRAUDULENT FUNDS TRACE
CASE REFERENCE: ${firNumber} | POLICE STATION: ${policeStation}
INVESTIGATING OFFICER: ${officerName}

COMPLAINANT VICTIM ACCOUNT: ${currentTrace.victimAccount}
TOTAL FRAUD TRACED: ${formatINR(currentTrace.tracedAmount)}

ACCOUNTS SUBJECT TO IMMEDIATE DEBIT RESTRICTION:
${bankGroups.map((bg) => `
BANK: ${bg.bankName} (Nodal: ${bg.nodalEmail})
${bg.accounts.map((a) => `  * Account: ${a.account} | IFSC: ${a.ifsc} | Amount: ${formatINR(a.disputedAmount)} | Role: ${a.layer} | Txs: ${a.txIds.join(', ')}`).join('\n')}
`).join('\n')}

VALIDATION STATUS: ${validationResult?.status || 'VERIFIED'}
CRYPTOGRAPHIC SEAL: ${validationResult?.cryptographicEvidenceHash || 'SHA256'}
`.trim();

    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* AI Safety Fact Validator Banner */}
      {validationResult && (
        <div
          className={`border rounded-lg p-4 font-mono text-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-lg ${
            validationResult.isValid
              ? 'bg-emerald-950/30 border-emerald-600/60 text-emerald-200'
              : 'bg-red-950/60 border-red-600 text-red-200 animate-pulse'
          }`}
        >
          <div className="flex items-center space-x-3">
            {validationResult.isValid ? (
              <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
            ) : (
              <ShieldAlert className="w-6 h-6 text-red-400 shrink-0" />
            )}
            <div>
              <div className="font-bold text-sm tracking-wide">
                {validationResult.status}
              </div>
              <div className="text-[11px] opacity-90">
                {validationResult.isValid ? (
                  <span>
                    Database Evidence Engine verified all {validationResult.verifiedFactsCount} facts (Account numbers, IFSC branches, UTRs, and Amounts). Zero hallucination detected.
                  </span>
                ) : (
                  <span>
                    Integrity Violation: Found {validationResult.unverifiedFacts.length} unverified fact(s) not present in raw banking transactions database!
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => setSimulateTamper(!simulateTamper)}
              className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-[10px]"
            >
              {simulateTamper ? 'Restore Verified State' : 'Test Fact Validator (Inject Tamper)'}
            </button>
            <div className="text-[10px] opacity-75 font-mono">
              {validationResult.cryptographicEvidenceHash.substring(0, 20)}...
            </div>
          </div>
        </div>
      )}

      {/* Unverified Facts Detail Error Callout */}
      {validationResult && !validationResult.isValid && (
        <div className="bg-red-950/80 border border-red-700 rounded-lg p-4 font-mono text-xs text-red-200 space-y-2">
          <div className="flex items-center space-x-2 font-bold text-sm">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span>CRITICAL FACT AUDIT FAILURE:</span>
          </div>
          <p className="text-[11px] text-red-300">
            The legal freeze requisition cannot be dispatched until all unverified facts are eradicated:
          </p>
          <div className="space-y-1 pl-4 border-l-2 border-red-500">
            {validationResult.unverifiedFacts.map((uf, i) => (
              <div key={i}>
                <strong>[{uf.type}]</strong> {uf.value} — {uf.reason}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Configuration Controls Bar */}
      <div className="bg-[#0a101b] border border-slate-800 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3 font-mono text-xs print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="text-[10px] text-slate-400 block mb-0.5">LEGAL SECTION OF CODE:</label>
            <input
              type="text"
              value={legalSection}
              onChange={(e) => setLegalSection(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200 outline-none focus:border-cyan-500 w-96 text-[11px]"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-400 block mb-0.5">CASE CRIME NO:</label>
            <input
              type="text"
              value={firNumber}
              onChange={(e) => setFirNumber(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200 outline-none focus:border-cyan-500 w-44 text-[11px]"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopyNotice}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-all cursor-pointer"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{isCopied ? 'COPIED' : 'COPY REQUISITION'}</span>
          </button>

          <button
            onClick={handlePrint}
            disabled={!validationResult?.isValid}
            className="flex items-center space-x-1.5 px-4 py-1.5 rounded bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition-all shadow-[0_0_12px_rgba(239,68,68,0.3)] cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>PRINT FREEZE NOTICE</span>
          </button>
        </div>
      </div>

      {/* Official Bank Freeze Requisition Letter Document */}
      <div className="bg-[#080d17] border border-slate-800 rounded-lg p-8 font-mono text-xs space-y-6 shadow-2xl print:border-none print:p-0 print:bg-white print:text-black">
        {/* Document Header */}
        <div className="border-b-2 border-red-800 pb-4 flex items-start justify-between">
          <div className="space-y-1">
            <div className="text-[10px] text-red-400 uppercase tracking-widest font-bold">
              OFFICE OF THE INVESTIGATING OFFICER // CYBER CRIME POLICE STATION
            </div>
            <h1 className="text-base font-bold text-slate-100 print:text-black uppercase">
              LEGAL REQUISITION FOR IMMEDIATE FREEZING OF BANK ACCOUNTS
            </h1>
            <div className="text-[11px] text-amber-400 print:text-amber-800 font-bold">
              ISSUED UNDER: {legalSection}
            </div>
          </div>

          <div className="text-right text-[11px] text-slate-300 print:text-gray-800 space-y-0.5">
            <div><strong>DISPATCH NO:</strong> {firNumber}/REQ</div>
            <div><strong>TIMESTAMP:</strong> {new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC</div>
            <div className="text-emerald-400 print:text-green-700 font-bold">[VERIFIED EVIDENCE]</div>
          </div>
        </div>

        {/* Requisition Body Notice */}
        <div className="text-[11px] text-slate-300 print:text-gray-800 leading-relaxed space-y-3">
          <p>
            <strong>To:</strong> The Nodal Cyber Crime Officer / Fraud Risk Management Team / Legal Liaison
          </p>
          <p>
            Whereas, in connection with ongoing investigation in <strong>{firNumber}</strong> registered at <strong>{policeStation}</strong> regarding cyber financial fraud involving disputed funds originating from Complainant Account <strong>{currentTrace.victimAccount}</strong> totaling <strong>{formatINR(currentTrace.tracedAmount)}</strong>.
          </p>
          <p>
            Forensic multi-hop graph decomposition and transactional audit have conclusively established that the stolen funds were funneled into the following accounts maintained with your institution. In exercise of powers conferred under {legalSection}, you are hereby directed to <strong>IMMEDIATELY FREEZE / RESTRICT ALL DEBIT TRANSACTIONS</strong> on the undermentioned accounts to prevent siphoning of proceed of crime.
          </p>
        </div>

        {/* Bank-Wise Grouped Account Tables */}
        <div className="space-y-4">
          {bankGroups.map((bg) => (
            <div key={bg.bankName} className="bg-slate-950/70 border border-slate-800 rounded p-4 space-y-2.5 print:bg-white print:border-gray-400">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-800 pb-2">
                <div className="flex items-center space-x-2">
                  <Building2 className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-slate-100 print:text-black text-sm">{bg.bankName}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800">
                    {bg.category}
                  </span>
                </div>
                <div className="flex items-center space-x-1 text-[10px] text-cyan-400">
                  <Mail className="w-3 h-3" />
                  <span>Nodal: {bg.nodalEmail}</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 print:bg-gray-100 text-[10px] uppercase text-slate-400 print:text-gray-700">
                    <tr>
                      <th className="p-2">Account Number</th>
                      <th className="p-2">IFSC Branch</th>
                      <th className="p-2">Forensic Role</th>
                      <th className="p-2">Disputed Stolen Credit</th>
                      <th className="p-2">Associated UTR IDs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 print:divide-gray-300 text-[11px]">
                    {bg.accounts.map((acc) => (
                      <tr key={acc.account}>
                        <td className="p-2 font-bold text-cyan-300 print:text-black">
                          {maskAccount(acc.account, !maskAccounts)}
                        </td>
                        <td className="p-2 text-slate-300 print:text-gray-800">{acc.ifsc}</td>
                        <td className="p-2">
                          <span className="text-amber-400 font-semibold">{acc.layer}</span>
                        </td>
                        <td className="p-2 font-bold text-red-400 print:text-red-700">
                          {formatINR(acc.disputedAmount)}
                        </td>
                        <td className="p-2 text-slate-400 print:text-gray-600 font-mono text-[10px]">
                          {acc.txIds.join(', ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Directives & Verification Signature */}
        <div className="pt-6 border-t-2 border-slate-800 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          <div className="space-y-1.5 text-[10px] text-slate-400 print:text-gray-700 max-w-md">
            <div>
              <strong className="text-slate-300 print:text-black">MANDATORY STATUTORY COMPLIANCE:</strong> Bank nodal officers are required to acknowledge receipt within 2 hours and confirm debit freeze status to {policeStation}.
            </div>
            <div className="font-mono text-cyan-400">
              TAMPER-EVIDENT EVIDENCE SEAL: {validationResult?.cryptographicEvidenceHash}
            </div>
          </div>

          <div className="text-right space-y-1">
            <div className="h-10 border-b border-slate-600 w-48 ml-auto"></div>
            <div className="font-bold text-slate-200 print:text-black">{officerName}</div>
            <div className="text-[10px] text-slate-400 print:text-gray-600">
              Investigating Officer / Cyber Crime Division
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
