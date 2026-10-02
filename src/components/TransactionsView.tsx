import React, { useState, useMemo } from 'react';
import {
  Search,
  Download,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  AlertCircle,
  Receipt,
  Smartphone,
  Globe,
} from 'lucide-react';
import { RawTransaction, PaymentMode } from '../types/forensics';
import { formatINR, maskAccount } from '../utils/bankLookup';

interface TransactionsViewProps {
  transactions: RawTransaction[];
  maskAccounts: boolean;
  onSelectAccount: (account: string) => void;
  highRiskMulesSet: Set<string>;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  maskAccounts,
  onSelectAccount,
  highRiskMulesSet,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedMode, setSelectedMode] = useState<string>('ALL');
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'HIGH_RISK_ONLY' | 'MULE_FLOW'>('ALL');
  const [minAmount, setMinAmount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (selectedMode !== 'ALL' && tx.Payment_Mode !== selectedMode) return false;
      if (minAmount > 0 && tx.Amount < minAmount) return false;

      const isMuleInvolved = highRiskMulesSet.has(tx.Sender_Account) || highRiskMulesSet.has(tx.Receiver_Account);
      if (riskFilter === 'HIGH_RISK_ONLY' && !isMuleInvolved) return false;

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesId = tx.Transaction_ID.toLowerCase().includes(query);
        const matchesSender = tx.Sender_Account.toLowerCase().includes(query);
        const matchesReceiver = tx.Receiver_Account.toLowerCase().includes(query);
        const matchesNarr = tx.Narration.toLowerCase().includes(query);
        const matchesIp = tx.IP_Address?.toLowerCase().includes(query);
        const matchesDevice = tx.Device_Type?.toLowerCase().includes(query);
        if (!matchesId && !matchesSender && !matchesReceiver && !matchesNarr && !matchesIp && !matchesDevice) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, selectedMode, minAmount, riskFilter, searchTerm, highRiskMulesSet]);

  const totalPages = Math.ceil(filteredTransactions.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  const handleExportCsv = () => {
    const headers = [
      'Transaction_ID',
      'Sender_Account',
      'Receiver_Account',
      'Sender_IFSC',
      'Receiver_IFSC',
      'Amount',
      'Timestamp',
      'Payment_Mode',
      'Narration',
      'IP_Address',
      'Device_Type',
    ];

    const rows = filteredTransactions.map((tx) => [
      `"${tx.Transaction_ID}"`,
      `"${tx.Sender_Account}"`,
      `"${tx.Receiver_Account}"`,
      `"${tx.Sender_IFSC}"`,
      `"${tx.Receiver_IFSC}"`,
      tx.Amount,
      `"${tx.Timestamp}"`,
      `"${tx.Payment_Mode}"`,
      `"${tx.Narration.replace(/"/g, '""')}"`,
      `"${tx.IP_Address}"`,
      `"${tx.Device_Type}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transactions_export_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Control Bar: Filters & Search */}
      <div className="bg-[#0a101b] border border-slate-800 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[320px]">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search Tx ID, Account, IP, Narration..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-cyan-200 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2" />
          </div>

          {/* Payment Mode Selector */}
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400 text-[11px]">MODE:</span>
            <select
              value={selectedMode}
              onChange={(e) => {
                setSelectedMode(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-900 text-slate-200 text-xs rounded border border-slate-700 px-2 py-1 outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Modes</option>
              <option value="UPI">UPI</option>
              <option value="IMPS">IMPS</option>
              <option value="NEFT">NEFT</option>
              <option value="RTGS">RTGS</option>
            </select>
          </div>

          {/* Risk Relevance Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400 text-[11px]">RISK:</span>
            <select
              value={riskFilter}
              onChange={(e) => {
                setRiskFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="bg-slate-900 text-slate-200 text-xs rounded border border-slate-700 px-2 py-1 outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Transactions</option>
              <option value="HIGH_RISK_ONLY">Flagged Mule Nodes Only</option>
            </select>
          </div>

          {/* Min Amount */}
          <input
            type="number"
            placeholder="Min Amount (₹)"
            value={minAmount || ''}
            onChange={(e) => {
              setMinAmount(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="w-32 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200 text-xs outline-none focus:border-cyan-500"
          />
        </div>

        {/* Export CSV & Count Display */}
        <div className="flex items-center space-x-3">
          <span className="text-slate-400 text-[11px]">
            {filteredTransactions.length.toLocaleString()} of {transactions.length.toLocaleString()} matching
          </span>

          <button
            onClick={handleExportCsv}
            className="flex items-center space-x-1 px-3 py-1.5 rounded bg-cyan-950/70 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/60 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT CSV</span>
          </button>
        </div>
      </div>

      {/* Main Virtualized Table */}
      <div className="bg-[#0a101b] border border-slate-800 rounded-lg overflow-hidden font-mono shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#080d17] text-[10px] uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Transaction ID</th>
                <th className="py-2.5 px-3">Sender Account / IFSC</th>
                <th className="py-2.5 px-3">Receiver Account / IFSC</th>
                <th className="py-2.5 px-3">Amount (INR)</th>
                <th className="py-2.5 px-3">Mode</th>
                <th className="py-2.5 px-3">Timestamp (UTC/IST)</th>
                <th className="py-2.5 px-3">Narration / Marker</th>
                <th className="py-2.5 px-3">Origin IP / Device</th>
                <th className="py-2.5 px-3">Risk Relevance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No transactions matching your query criteria.
                  </td>
                </tr>
              ) : (
                paginatedData.map((tx) => {
                  const isSenderMule = highRiskMulesSet.has(tx.Sender_Account);
                  const isReceiverMule = highRiskMulesSet.has(tx.Receiver_Account);
                  const isHighRisk = isSenderMule || isReceiverMule;

                  return (
                    <tr
                      key={tx.Transaction_ID}
                      className={`hover:bg-slate-900/60 transition-colors ${
                        isHighRisk ? 'bg-red-950/10' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-semibold text-cyan-300">
                        {tx.Transaction_ID}
                      </td>
                      <td className="py-2.5 px-3">
                        <button
                          onClick={() => onSelectAccount(tx.Sender_Account)}
                          className="hover:underline text-left cursor-pointer text-slate-200"
                        >
                          {maskAccount(tx.Sender_Account, !maskAccounts)}
                        </button>
                        <div className="text-[10px] text-slate-400">{tx.Sender_IFSC}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <button
                          onClick={() => onSelectAccount(tx.Receiver_Account)}
                          className={`hover:underline text-left cursor-pointer font-medium ${
                            isReceiverMule ? 'text-amber-400' : 'text-slate-200'
                          }`}
                        >
                          {maskAccount(tx.Receiver_Account, !maskAccounts)}
                        </button>
                        <div className="text-[10px] text-slate-400">{tx.Receiver_IFSC}</div>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-emerald-400">
                        {formatINR(tx.Amount)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-900 border border-slate-700 text-sky-300">
                          {tx.Payment_Mode}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap text-[11px]">
                        {tx.Timestamp.replace('T', ' ').substring(0, 19)}
                      </td>
                      <td className="py-2.5 px-3 max-w-xs truncate text-[11px] text-slate-300">
                        {tx.Narration}
                      </td>
                      <td className="py-2.5 px-3 text-[10px] text-slate-400 max-w-[140px] truncate">
                        <div className="flex items-center space-x-1">
                          <Globe className="w-2.5 h-2.5 text-slate-400" />
                          <span>{tx.IP_Address}</span>
                        </div>
                        <div className="truncate">{tx.Device_Type}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        {isHighRisk ? (
                          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] bg-red-950/60 text-red-300 border border-red-700/60">
                            <ShieldAlert className="w-3 h-3 text-red-400" />
                            <span>MULE LAYER</span>
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] text-slate-400 bg-slate-900/60 border border-slate-800">
                            NORMAL
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="bg-[#080d17] border-t border-slate-800 p-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-slate-200 outline-none focus:border-cyan-500"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
            </select>
          </div>

          <div className="flex items-center space-x-3">
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center space-x-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded bg-slate-900 border border-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1 rounded bg-slate-900 border border-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
