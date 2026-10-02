/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './components/Header';
import { Navigation, NavTab } from './components/Navigation';
import { DashboardView } from './components/DashboardView';
import { InvestigationView } from './components/InvestigationView';
import { NetworkGraphView } from './components/NetworkGraphView';
import { TimelineView } from './components/TimelineView';
import { TransactionsView } from './components/TransactionsView';
import { MuleIntelligenceView } from './components/MuleIntelligenceView';
import { EvidenceView } from './components/EvidenceView';
import { ReportsView } from './components/ReportsView';
import { SystemBenchmarkView } from './components/SystemBenchmarkView';
import { AccountIntelligenceModal } from './components/AccountIntelligenceModal';
import { CsvImportModal } from './components/CsvImportModal';
import { AuditLogModal } from './components/AuditLogModal';

import { dataEngine, IndexStats } from './services/dataEngine';
import { generateForensicsDataset } from './services/datasetGenerator';
import { auditLogger } from './services/auditLogger';
import { TraceResult, RawTransaction } from './types/forensics';

export default function App() {
  const [stats, setStats] = useState<IndexStats>(() => dataEngine.getStats());
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [currentTrace, setCurrentTrace] = useState<TraceResult | null>(null);
  const [maskAccounts, setMaskAccounts] = useState<boolean>(true);
  const [officerName, setOfficerName] = useState<string>('IO_CYBER_8412');

  // Modals & Panels
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);
  const [isScaling, setIsScaling] = useState<boolean>(false);

  // Initialize with standard synthetic benchmark dataset on first load
  const loadBenchmarkDataset = useCallback((targetRows: number = 25000) => {
    setIsScaling(true);
    setTimeout(() => {
      const generated = generateForensicsDataset(targetRows);
      const newStats = dataEngine.indexTransactions(
        generated.transactions,
        generated.muleAccounts,
        generated.victimAccounts
      );
      setStats(newStats);

      // Auto-trace first victim for immediate interactive experience
      const initialVictim = generated.victimAccounts[0] || 'VIC_8830192841';
      const initialTrace = dataEngine.traceMoneyFlow(initialVictim, 4);
      setCurrentTrace(initialTrace);

      auditLogger.logAction(
        'IMPORT_DATA',
        `Indexed dataset with ${generated.transactions.length.toLocaleString()} transactions (${generated.victimAccounts.length} victims, ${generated.muleAccounts.length} injected mules)`,
        officerName
      );

      setIsScaling(false);
    }, 50);
  }, [officerName]);

  useEffect(() => {
    loadBenchmarkDataset(25000);
  }, []);

  // Handler: Run 4-Hop Money Flow Trace
  const handleTraceAccount = (
    account: string,
    hopDepth: number = 4,
    timeWindowHours: number = 168,
    minAmount: number = 0
  ) => {
    const trace = dataEngine.traceMoneyFlow(account, hopDepth, timeWindowHours, minAmount);
    setCurrentTrace(trace);
    auditLogger.logAction(
      'START_TRACE',
      `Executed 4-hop bounded BFS trace on root ${account}. Reached ${trace.subgraph.maxHopReached} hops, traced ${trace.tracedAmount.toLocaleString()} INR across ${trace.subgraph.uniqueAccountsCount} nodes.`,
      officerName,
      account
    );
  };

  // Handler: Start Investigation from Dashboard
  const handleStartInvestigation = (victimAccount?: string) => {
    const target = victimAccount || dataEngine.getKnownVictims()[0] || 'VIC_8830192841';
    handleTraceAccount(target, 4);
    setCurrentTab('investigations');
  };

  // Handler: Custom CSV imported
  const handleImportTransactions = (txs: RawTransaction[]) => {
    const newStats = dataEngine.indexTransactions(txs);
    setStats(newStats);
    setIsImportModalOpen(false);

    // Pick first sender as initial trace
    const firstSender = txs[0]?.Sender_Account;
    if (firstSender) {
      handleTraceAccount(firstSender, 4);
    }
    auditLogger.logAction(
      'IMPORT_DATA',
      `Custom CSV ingested: ${txs.length.toLocaleString()} transactions indexed`,
      officerName
    );
  };

  // Handler: Account dossier inspection
  const handleSelectAccountForIntelligence = (acc: string) => {
    setSelectedAccountId(acc);
    auditLogger.logAction(
      'INSPECT_ACCOUNT',
      `Inspected account intelligence dossier for ${acc}`,
      officerName,
      acc
    );
  };

  // Supporting transactions for selected account modal
  const supportingTransactionsForSelected = useMemo(() => {
    if (!selectedAccountId) return [];
    return dataEngine
      .getAllTransactions()
      .filter((t) => t.Sender_Account === selectedAccountId || t.Receiver_Account === selectedAccountId)
      .slice(0, 50);
  }, [selectedAccountId, stats]);

  const selectedAccountScore = useMemo(() => {
    if (!selectedAccountId) return null;
    return dataEngine.getAccountScore(selectedAccountId) || null;
  }, [selectedAccountId, stats]);

  // Set of high risk mules for quick lookup in explorer table
  const highRiskMulesSet = useMemo(() => {
    const set = new Set<string>();
    for (const score of dataEngine.getAllScores()) {
      if (score.riskIndex >= 40 && score.layer !== 'Victim') {
        set.add(score.accountNumber);
      }
    }
    return set;
  }, [stats]);

  return (
    <div className="min-h-screen bg-[#06090e] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Cyber Command Center Header */}
      <Header
        stats={stats}
        maskAccounts={maskAccounts}
        onToggleMask={() => {
          setMaskAccounts(!maskAccounts);
          auditLogger.logAction('MASK_TOGGLE', `Account display toggle changed to ${!maskAccounts ? 'MASKED' : 'PLAIN'}`, officerName);
        }}
        onOpenAudit={() => setIsAuditModalOpen(true)}
        onOpenImport={() => setIsImportModalOpen(true)}
        onResetBenchmark={() => loadBenchmarkDataset(25000)}
        officerName={officerName}
        onChangeOfficer={(name) => setOfficerName(name)}
      />

      {/* Main 9-Tab Navigation Bar */}
      <Navigation
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        activeTraceCount={currentTrace ? 1 : 0}
      />

      {/* View Content Area */}
      <main className="flex-1 max-w-[1920px] w-full mx-auto p-4 md:p-6 overflow-x-hidden">
        {currentTab === 'dashboard' && (
          <DashboardView
            stats={stats}
            currentTrace={currentTrace}
            onStartInvestigation={handleStartInvestigation}
            maskAccounts={maskAccounts}
            onNavigateToTab={(tab) => setCurrentTab(tab)}
          />
        )}

        {currentTab === 'investigations' && (
          <InvestigationView
            currentTrace={currentTrace}
            onTraceAccount={handleTraceAccount}
            knownVictims={dataEngine.getKnownVictims()}
            maskAccounts={maskAccounts}
            onNavigateToTab={(tab) => setCurrentTab(tab)}
            onSelectAccountForIntelligence={handleSelectAccountForIntelligence}
          />
        )}

        {currentTab === 'transactions' && (
          <TransactionsView
            transactions={dataEngine.getAllTransactions()}
            maskAccounts={maskAccounts}
            onSelectAccount={handleSelectAccountForIntelligence}
            highRiskMulesSet={highRiskMulesSet}
          />
        )}

        {currentTab === 'mule-intelligence' && (
          <MuleIntelligenceView
            scores={dataEngine.getAllScores()}
            maskAccounts={maskAccounts}
            onSelectAccount={handleSelectAccountForIntelligence}
            onGenerateBatchFreezeNotice={(selected) => {
              setCurrentTab('reports');
              auditLogger.logAction(
                'GENERATE_NOTICE',
                `Prepared batch bank freeze requisition for ${selected.length} flagged accounts`,
                officerName
              );
            }}
          />
        )}

        {currentTab === 'network-graph' && (
          <NetworkGraphView
            subgraph={currentTrace ? currentTrace.subgraph : null}
            onSelectNode={handleSelectAccountForIntelligence}
            selectedAccountId={selectedAccountId}
            maskAccounts={maskAccounts}
          />
        )}

        {currentTab === 'timeline' && (
          <TimelineView
            transactions={dataEngine.getAllTransactions()}
            maskAccounts={maskAccounts}
            onSelectAccount={handleSelectAccountForIntelligence}
          />
        )}

        {currentTab === 'evidence' && (
          <EvidenceView
            currentTrace={currentTrace}
            officerName={officerName}
            maskAccounts={maskAccounts}
          />
        )}

        {currentTab === 'reports' && (
          <ReportsView
            currentTrace={currentTrace}
            officerName={officerName}
            maskAccounts={maskAccounts}
          />
        )}

        {currentTab === 'system' && (
          <SystemBenchmarkView
            stats={stats}
            onScaleDataset={(rows) => loadBenchmarkDataset(rows)}
            isScaling={isScaling}
          />
        )}
      </main>

      {/* Account Intelligence Dossier Modal / Side Drawer */}
      {selectedAccountId && (
        <AccountIntelligenceModal
          accountScore={selectedAccountScore}
          onClose={() => setSelectedAccountId(null)}
          maskAccounts={maskAccounts}
          onTraceAsOrigin={(acc) => {
            handleTraceAccount(acc, 4);
            setSelectedAccountId(null);
            setCurrentTab('investigations');
          }}
          onAddToFreezeNotice={(acc) => {
            setSelectedAccountId(null);
            setCurrentTab('reports');
          }}
          supportingTransactions={supportingTransactionsForSelected}
          ifscCode={supportingTransactionsForSelected[0]?.Receiver_IFSC || supportingTransactionsForSelected[0]?.Sender_IFSC}
        />
      )}

      {/* Ingest CSV Modal */}
      {isImportModalOpen && (
        <CsvImportModal
          onClose={() => setIsImportModalOpen(false)}
          onImportTransactions={handleImportTransactions}
        />
      )}

      {/* Immutable Forensic Audit Trail Modal */}
      {isAuditModalOpen && (
        <AuditLogModal onClose={() => setIsAuditModalOpen(false)} />
      )}
    </div>
  );
}
