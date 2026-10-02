import React, { useState } from 'react';
import { X, Shield, FileText, Search, Download, CheckCircle2, Lock } from 'lucide-react';
import { auditLogger } from '../services/auditLogger';
import { AuditLogItem } from '../types/forensics';

interface AuditLogModalProps {
  onClose: () => void;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({ onClose }) => {
  const [logs, setLogs] = useState<AuditLogItem[]>(() => auditLogger.getLogs());
  const [search, setSearch] = useState<string>('');

  const filteredLogs = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.details.toLowerCase().includes(search.toLowerCase()) ||
      l.officerId.toLowerCase().includes(search.toLowerCase())
  );

  const handleExportAuditTrail = () => {
    const content = JSON.stringify(logs, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cyber_forensics_audit_trail_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono text-xs">
      <div className="bg-[#090f19] border border-cyan-900/60 rounded-lg max-w-3xl w-full p-6 space-y-4 shadow-2xl relative max-h-[85vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white p-1"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-2 text-cyan-400">
          <Lock className="w-5 h-5" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-100">
            Immutable Forensic Audit Trail & Chain of Custody Log
          </h2>
        </div>

        <p className="text-[11px] text-slate-400">
          Cryptographically sealed log of all investigator query actions, 4-hop traces, dossier inspections, and freeze requisition issuances.
        </p>

        {/* Search Bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Search audit actions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2" />
          </div>

          <button
            onClick={handleExportAuditTrail}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700 text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT AUDIT JSON</span>
          </button>
        </div>

        {/* Scrollable Log Entries */}
        <div className="flex-1 overflow-y-auto border border-slate-800 rounded divide-y divide-slate-800/80 bg-[#05080e] p-2 space-y-1">
          {filteredLogs.map((log) => (
            <div key={log.id} className="p-2.5 space-y-1 hover:bg-slate-900/50 rounded">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-cyan-400">{log.action}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800">
                    {log.officerId}
                  </span>
                </div>
                <span className="text-slate-500 text-[10px] whitespace-nowrap">
                  {log.timestamp.replace('T', ' ').substring(0, 19)} UTC
                </span>
              </div>
              <div className="text-slate-300 text-xs">{log.details}</div>
              <div className="text-[9px] text-slate-500 flex items-center justify-between font-mono">
                <span>SEAL: {log.hash}</span>
                <span>ID: {log.id}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
