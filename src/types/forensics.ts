export type PaymentMode = 'UPI' | 'IMPS' | 'NEFT' | 'RTGS';

export type MuleLayer = 'Victim' | 'Potential L1 Collector' | 'Potential L2 Distributor' | 'Potential L3 Terminal' | 'Normal Account' | 'Suspected Ring';

export interface RawTransaction {
  Transaction_ID: string;
  Sender_Account: string;
  Receiver_Account: string;
  Sender_IFSC: string;
  Receiver_IFSC: string;
  Amount: number;
  Timestamp: string; // ISO 8601 string or YYYY-MM-DD HH:mm:ss
  Payment_Mode: PaymentMode;
  Narration: string;
  IP_Address: string;
  Device_Type: string;
}

export interface RiskFactor {
  name: string;
  scoreContribution: number;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface AccountMuleScore {
  accountNumber: string;
  riskIndex: number; // 0 - 100
  layer: MuleLayer;
  confidence: number;
  factors: RiskFactor[];
  metrics: {
    totalIncoming: number;
    totalOutgoing: number;
    incomingCount: number;
    outgoingCount: number;
    fanInRatio: number;
    fanOutRatio: number;
    passThroughRatio: number; // % of funds forwarded
    avgDwellTimeMinutes: number; // Avg time funds stay before exit
    uniqueCounterparties: number;
    sharedIpCount: number;
    knownDeviceTypes: string[];
    suspiciousKeywordsCount: number;
  };
}

export interface GraphNode {
  id: string;
  label: string;
  layer: MuleLayer;
  hopLevel: number; // 0 = victim, 1 = L1, 2 = L2, 3 = L3, 4 = L4/Terminal
  riskScore: number;
  totalReceived: number;
  totalSent: number;
  currentBalanceEstimate: number;
  ifsc: string;
  bankName: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  isVictim?: boolean;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  amount: number;
  timestamp: string;
  paymentMode: PaymentMode;
  transactionId: string;
  narration: string;
  hop: number;
}

export interface SubgraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  victimAccount: string;
  totalStolenAmount: number;
  totalTracedAmount: number;
  maxHopReached: number;
  uniqueAccountsCount: number;
  l1AccountsCount: number;
  l2AccountsCount: number;
  l3AccountsCount: number;
  terminalAccountsCount: number;
  traceLatencyMs: number;
}

export interface HopTraceStep {
  hop: number;
  sourceAccount: string;
  destinationAccount: string;
  amount: number;
  timestamp: string;
  transactionId: string;
  paymentMode: PaymentMode;
  receiverRisk: number;
  receiverLayer: MuleLayer;
  receiverIfsc: string;
}

export interface TraceResult {
  victimAccount: string;
  totalAmountStolen: number;
  tracedAmount: number;
  untracedAmount: number;
  hops: HopTraceStep[];
  subgraph: SubgraphData;
  flowVelocityHours: number;
  retentionHolders: {
    accountNumber: string;
    ifsc: string;
    bankName: string;
    estimatedRetainedAmount: number;
    riskScore: number;
    layer: MuleLayer;
  }[];
}

export interface FreezeRequisitionNotice {
  noticeId: string;
  generatedAt: string;
  investigatingOfficer: string;
  caseFirNumber: string;
  policeStation: string;
  legalActSection: string; // e.g. "Section 91 & 102, Code of Criminal Procedure (CrPC) / BNSS Sec 94"
  victimAccount: string;
  totalDisputedAmount: number;
  bankAccountsToFreeze: {
    bankName: string;
    ifsc: string;
    accountNumber: string;
    layer: MuleLayer;
    freezeAmountRequested: number;
    associatedTxIds: string[];
    transactionDates: string[];
    justification: string;
  }[];
  verificationStatus: 'VERIFIED_AGAINST_DATABASE' | 'VALIDATION_FAILED';
  verificationDetails: string;
}

export interface CaseDiaryEntry {
  caseNumber: string;
  firNumber: string;
  victimAccount: string;
  incidentDate: string;
  totalAmount: number;
  layer1Total: number;
  layer2Total: number;
  layer3Total: number;
  terminalTotal: number;
  currentHoldingTotal: number;
  hopSteps: HopTraceStep[];
  flaggedMuleCount: number;
  officerNotes: string;
}

export interface BenchmarkMetrics {
  totalRows: number;
  ingestionTimeMs: number;
  indexingTimeMs: number;
  traceLatencyMs: number;
  graphBuildTimeMs: number;
  groundTruthMulesCount: number;
  detectedMulesCount: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  f1Score: number;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  officerId: string;
  action: 'IMPORT_DATA' | 'START_TRACE' | 'INSPECT_ACCOUNT' | 'GENERATE_NOTICE' | 'EXPORT_EVIDENCE' | 'VALIDATE_REPORT' | 'MASK_TOGGLE';
  details: string;
  targetAccount?: string;
  hash?: string;
}
