import React, { useState } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Download,
  AlertCircle,
  Database,
} from 'lucide-react';
import { RawTransaction, PaymentMode } from '../types/forensics';

interface CsvImportModalProps {
  onClose: () => void;
  onImportTransactions: (txs: RawTransaction[]) => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  onClose,
  onImportTransactions,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorLog, setErrorLog] = useState<string[]>([]);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const handleDownloadSampleCsv = () => {
    const sampleHeaders =
      'Transaction_ID,Sender_Account,Receiver_Account,Sender_IFSC,Receiver_IFSC,Amount,Timestamp,Payment_Mode,Narration,IP_Address,Device_Type\n';
    const sampleRows = [
      'TXN_SAMPLE_001,VIC_8830192841,MULE_L1_0001,SBIN0001423,HDFC0004120,500000,2024-10-01T10:14:00Z,UPI,UPI/5291/TASK_INVEST,103.21.144.82,Samsung Galaxy S23',
      'TXN_SAMPLE_002,MULE_L1_0001,MULE_L2_0001,HDFC0004120,ICIC0000341,245000,2024-10-01T10:22:00Z,IMPS,IMPS/COMMISSION_SPLIT,103.21.144.82,Generic-x86_64 Emulator',
      'TXN_SAMPLE_003,MULE_L1_0001,MULE_L2_0002,HDFC0004120,UTIB0001092,245000,2024-10-01T10:25:00Z,IMPS,IMPS/USDT_P2P,103.21.144.82,Generic-x86_64 Emulator',
      'TXN_SAMPLE_004,MULE_L2_0001,MULE_L3_0001,ICIC0000341,PYTM0123456,240000,2024-10-01T10:45:00Z,NEFT,NEFT/AIRPAY_MERCHANT,45.142.195.12,BlueStacks App Player',
    ].join('\n');

    const blob = new Blob([sampleHeaders + sampleRows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cyber_forensics_sample_transactions.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setErrorLog([]);
      setSuccessCount(null);
    }
  };

  const processCsv = () => {
    if (!file) return;
    setIsProcessing(true);
    setErrorLog([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) throw new Error('File content is empty');

        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) throw new Error('CSV must contain a header row and at least one transaction row');

        const headerLine = lines[0].replace(/"/g, '');
        const headers = headerLine.split(',').map((h) => h.trim());

        const requiredCols = [
          'Transaction_ID',
          'Sender_Account',
          'Receiver_Account',
          'Amount',
          'Timestamp',
        ];

        const missing = requiredCols.filter(
          (rc) => !headers.some((h) => h.toLowerCase() === rc.toLowerCase())
        );

        if (missing.length > 0) {
          throw new Error(`Missing required CSV columns: ${missing.join(', ')}`);
        }

        // Map column indices
        const colIdx = {
          txId: headers.findIndex((h) => h.toLowerCase() === 'transaction_id'),
          sender: headers.findIndex((h) => h.toLowerCase() === 'sender_account'),
          receiver: headers.findIndex((h) => h.toLowerCase() === 'receiver_account'),
          senderIfsc: headers.findIndex((h) => h.toLowerCase() === 'sender_ifsc'),
          receiverIfsc: headers.findIndex((h) => h.toLowerCase() === 'receiver_ifsc'),
          amount: headers.findIndex((h) => h.toLowerCase() === 'amount'),
          timestamp: headers.findIndex((h) => h.toLowerCase() === 'timestamp'),
          paymentMode: headers.findIndex((h) => h.toLowerCase() === 'payment_mode'),
          narration: headers.findIndex((h) => h.toLowerCase() === 'narration'),
          ip: headers.findIndex((h) => h.toLowerCase() === 'ip_address'),
          device: headers.findIndex((h) => h.toLowerCase() === 'device_type'),
        };

        const parsedTxs: RawTransaction[] = [];
        const errors: string[] = [];
        const seenTxIds = new Set<string>();

        for (let i = 1; i < lines.length; i++) {
          const row = lines[i];
          // Basic CSV quote-safe split
          const cols: string[] = [];
          let current = '';
          let inQuotes = false;
          for (let c = 0; c < row.length; c++) {
            const ch = row[c];
            if (ch === '"') {
              inQuotes = !inQuotes;
            } else if (ch === ',' && !inQuotes) {
              cols.push(current.trim());
              current = '';
            } else {
              current += ch;
            }
          }
          cols.push(current.trim());

          const txId = cols[colIdx.txId]?.replace(/^"|"$/g, '').trim() || `CSV_TX_${i}`;
          const sender = cols[colIdx.sender]?.replace(/^"|"$/g, '').trim();
          const receiver = cols[colIdx.receiver]?.replace(/^"|"$/g, '').trim();
          const amountRaw = cols[colIdx.amount]?.replace(/^"|"$/g, '').trim();
          const amount = parseFloat(amountRaw);
          const timestamp = cols[colIdx.timestamp]?.replace(/^"|"$/g, '').trim() || new Date().toISOString();

          if (!sender || !receiver) {
            errors.push(`Row ${i + 1}: Missing sender or receiver account`);
            continue;
          }

          if (isNaN(amount) || amount <= 0) {
            errors.push(`Row ${i + 1}: Invalid transaction amount '${amountRaw}'`);
            continue;
          }

          if (seenTxIds.has(txId)) {
            errors.push(`Row ${i + 1}: Duplicate Transaction_ID '${txId}' skipped`);
            continue;
          }
          seenTxIds.add(txId);

          const rawMode = (cols[colIdx.paymentMode]?.replace(/^"|"$/g, '').trim() || 'UPI').toUpperCase();
          const validModes: PaymentMode[] = ['UPI', 'IMPS', 'NEFT', 'RTGS'];
          const paymentMode: PaymentMode = validModes.includes(rawMode as any) ? (rawMode as PaymentMode) : 'UPI';

          parsedTxs.push({
            Transaction_ID: txId,
            Sender_Account: sender,
            Receiver_Account: receiver,
            Sender_IFSC: cols[colIdx.senderIfsc]?.replace(/^"|"$/g, '').trim() || 'SBIN0001234',
            Receiver_IFSC: cols[colIdx.receiverIfsc]?.replace(/^"|"$/g, '').trim() || 'HDFC0001234',
            Amount: amount,
            Timestamp: timestamp,
            Payment_Mode: paymentMode,
            Narration: cols[colIdx.narration]?.replace(/^"|"$/g, '').trim() || 'TRANSFER',
            IP_Address: cols[colIdx.ip]?.replace(/^"|"$/g, '').trim() || '127.0.0.1',
            Device_Type: cols[colIdx.device]?.replace(/^"|"$/g, '').trim() || 'Standard Device',
          });
        }

        if (errors.length > 0) {
          setErrorLog(errors.slice(0, 10)); // Show top 10
        }

        if (parsedTxs.length > 0) {
          setSuccessCount(parsedTxs.length);
          onImportTransactions(parsedTxs);
        } else {
          setErrorLog(['No valid transaction rows found in file']);
        }
      } catch (err: any) {
        setErrorLog([err.message || 'Failed to process CSV file']);
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono text-xs">
      <div className="bg-[#090f19] border border-cyan-900/60 rounded-lg max-w-xl w-full p-6 space-y-4 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white p-1"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-2 text-cyan-400">
          <Database className="w-5 h-5" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-100">
            Ingest Custom Transactions CSV
          </h2>
        </div>

        <p className="text-[11px] text-slate-400 leading-relaxed">
          Upload forensic banking transaction exports. The engine parses, validates, and builds dual inverted indices locally in memory.
        </p>

        {/* Expected Schema Badges */}
        <div className="bg-[#05080e] p-3 rounded border border-slate-800 space-y-2">
          <div className="text-[10px] text-slate-400 font-bold uppercase">Supported Schema Columns:</div>
          <div className="flex flex-wrap gap-1 text-[10px]">
            {[
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
            ].map((col) => (
              <span key={col} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-300">
                {col}
              </span>
            ))}
          </div>
        </div>

        {/* Upload Dropzone */}
        <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-lg p-6 text-center space-y-2 transition-colors">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="hidden"
            id="csv-file-input"
          />
          <label htmlFor="csv-file-input" className="cursor-pointer block space-y-2">
            <Upload className="w-8 h-8 text-cyan-400 mx-auto" />
            <div className="font-bold text-slate-200">
              {file ? file.name : 'Click to select CSV file or drag & drop'}
            </div>
            <div className="text-[10px] text-slate-500">
              Supports UPI, IMPS, NEFT, RTGS exports up to millions of records
            </div>
          </label>
        </div>

        {/* Status Callouts */}
        {successCount !== null && (
          <div className="p-3 bg-emerald-950/40 border border-emerald-600 rounded text-emerald-300 flex items-center space-x-2 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Successfully imported and indexed {successCount.toLocaleString()} transactions!</span>
          </div>
        )}

        {errorLog.length > 0 && (
          <div className="p-3 bg-red-950/40 border border-red-700 rounded text-red-200 text-xs space-y-1">
            <div className="flex items-center space-x-1.5 font-bold text-red-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Parsing Warnings / Errors:</span>
            </div>
            <div className="pl-4 list-disc space-y-0.5 text-[10px]">
              {errorLog.map((err, i) => (
                <div key={i}>{err}</div>
              ))}
            </div>
          </div>
        )}

        {/* Actions Bar */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <button
            onClick={handleDownloadSampleCsv}
            className="flex items-center space-x-1.5 text-xs text-cyan-400 hover:underline cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Sample CSV Template</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs"
            >
              Cancel
            </button>
            <button
              onClick={processCsv}
              disabled={!file || isProcessing}
              className="px-4 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-[0_0_12px_rgba(6,182,212,0.3)] transition-all cursor-pointer"
            >
              {isProcessing ? 'Ingesting...' : 'Ingest & Index'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
