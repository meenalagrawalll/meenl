import { RawTransaction, AccountMuleScore, RiskFactor, MuleLayer } from '../types/forensics';

// Suspicious indicators in narration commonly found in cyber financial fraud & mule recruitment
const SUSPICIOUS_NARRATION_KEYWORDS = [
  'P2P', 'USDT', 'CRYPTO', 'BINANCE', 'TASK BONUS', 'COMMISSION',
  'TELEGRAM', 'EARN DAILY', 'REFUND CLAIM', 'ESCROW', 'CASHOUT',
  'GAMING WALLET', 'AIRPAY', 'UPI-COLLECT', 'LOAN-APPROVAL-FEE',
  'SURCHARGE', 'CRYPTO-EXCHANGE', 'REVERT', 'OFFSHORE'
];

export interface AccountAggregate {
  account: string;
  incomingTxs: RawTransaction[];
  outgoingTxs: RawTransaction[];
  totalIncoming: number;
  totalOutgoing: number;
  firstSeen: number;
  lastSeen: number;
  ips: Set<string>;
  devices: Set<string>;
  counterparties: Set<string>;
  narrations: string[];
}

export function evaluateMuleRisk(
  account: string,
  aggregate: AccountAggregate,
  ipAccountUsageCount: Map<string, number>,
  isVictimKnown: boolean = false
): AccountMuleScore {
  if (isVictimKnown) {
    return {
      accountNumber: account,
      riskIndex: 5,
      layer: 'Victim',
      confidence: 0.95,
      factors: [
        {
          name: 'Complainant / Source Account',
          scoreContribution: 5,
          description: 'Verified initiating source of disputed funds',
          severity: 'low'
        }
      ],
      metrics: {
        totalIncoming: aggregate.totalIncoming,
        totalOutgoing: aggregate.totalOutgoing,
        incomingCount: aggregate.incomingTxs.length,
        outgoingCount: aggregate.outgoingTxs.length,
        fanInRatio: 0,
        fanOutRatio: aggregate.outgoingTxs.length,
        passThroughRatio: 0,
        avgDwellTimeMinutes: 0,
        uniqueCounterparties: aggregate.counterparties.size,
        sharedIpCount: 1,
        knownDeviceTypes: Array.from(aggregate.devices),
        suspiciousKeywordsCount: 0
      }
    };
  }

  const factors: RiskFactor[] = [];
  let score = 0;

  const inCount = aggregate.incomingTxs.length;
  const outCount = aggregate.outgoingTxs.length;
  const totalIn = aggregate.totalIncoming;
  const totalOut = aggregate.totalOutgoing;

  // 1. High Velocity Pass-through Calculation
  let passThroughRatio = 0;
  if (totalIn > 0) {
    passThroughRatio = Math.min(1, totalOut / totalIn);
  }

  // Calculate average dwell time between incoming funds and subsequent outgoing transfers
  let totalDwellMinutes = 0;
  let dwellPairs = 0;
  
  if (inCount > 0 && outCount > 0) {
    // Sort incoming and outgoing by timestamp
    const sortedIn = [...aggregate.incomingTxs].sort((a, b) => new Date(a.Timestamp).getTime() - new Date(b.Timestamp).getTime());
    const sortedOut = [...aggregate.outgoingTxs].sort((a, b) => new Date(a.Timestamp).getTime() - new Date(b.Timestamp).getTime());
    
    for (const outTx of sortedOut) {
      const outTime = new Date(outTx.Timestamp).getTime();
      // find latest prior incoming
      const priorIn = sortedIn.filter(t => new Date(t.Timestamp).getTime() <= outTime).pop();
      if (priorIn) {
        const diffMins = Math.max(0, (outTime - new Date(priorIn.Timestamp).getTime()) / (1000 * 60));
        totalDwellMinutes += diffMins;
        dwellPairs++;
      }
    }
  }

  const avgDwellMins = dwellPairs > 0 ? totalDwellMinutes / dwellPairs : 120;

  // Velocity scoring: Rapid drain within 15 minutes of deposit is hallmark of mule accounts
  if (passThroughRatio >= 0.85 && avgDwellMins < 20 && outCount > 0) {
    const contribution = 25;
    score += contribution;
    factors.push({
      name: 'High-Velocity Rapid Dwell Time',
      scoreContribution: contribution,
      description: `Disburses ${Math.round(passThroughRatio * 100)}% of incoming funds within avg ${Math.round(avgDwellMins)} mins`,
      severity: 'critical'
    });
  } else if (passThroughRatio >= 0.70 && avgDwellMins < 60) {
    const contribution = 15;
    score += contribution;
    factors.push({
      name: 'Rapid Turnaround Dwell Time',
      scoreContribution: contribution,
      description: `Funds drained within ${Math.round(avgDwellMins)} mins of credit`,
      severity: 'high'
    });
  }

  // 2. Fan-In Ratio (multiple incoming senders)
  const incomingSenders = new Set(aggregate.incomingTxs.map(t => t.Sender_Account));
  const fanInRatio = incomingSenders.size;
  if (fanInRatio >= 5 && outCount <= 2 && totalIn > 50000) {
    const contribution = 22;
    score += contribution;
    factors.push({
      name: 'Severe Fan-In Funneling',
      scoreContribution: contribution,
      description: `${fanInRatio} distinct depositors funneling into single recipient`,
      severity: 'critical'
    });
  } else if (fanInRatio >= 3) {
    const contribution = 12;
    score += contribution;
    factors.push({
      name: 'Multi-Source Aggregation (Fan-In)',
      scoreContribution: contribution,
      description: `Received deposits from ${fanInRatio} distinct senders`,
      severity: 'medium'
    });
  }

  // 3. Fan-Out Dispersion (Layering dispersal to multiple downstream accounts)
  const outgoingReceivers = new Set(aggregate.outgoingTxs.map(t => t.Receiver_Account));
  const fanOutRatio = outgoingReceivers.size;
  if (fanOutRatio >= 4 && inCount <= 3 && totalOut > 50000) {
    const contribution = 20;
    score += contribution;
    factors.push({
      name: 'High-Fan-Out Layering Dispersion',
      scoreContribution: contribution,
      description: `Immediate split into ${fanOutRatio} downstream accounts`,
      severity: 'critical'
    });
  } else if (fanOutRatio >= 2 && passThroughRatio > 0.6) {
    const contribution = 10;
    score += contribution;
    factors.push({
      name: 'Downstream Dispersal (Fan-Out)',
      scoreContribution: contribution,
      description: `Funds disbursed across ${fanOutRatio} downstream accounts`,
      severity: 'medium'
    });
  }

  // 4. Shared IP & Infrastructure Anomaly
  let maxSharedIpUsers = 1;
  for (const ip of aggregate.ips) {
    const usage = ipAccountUsageCount.get(ip) || 1;
    if (usage > maxSharedIpUsers) maxSharedIpUsers = usage;
  }
  if (maxSharedIpUsers >= 4) {
    const contribution = 18;
    score += contribution;
    factors.push({
      name: 'Infrastructure / IP Colocation Cluster',
      scoreContribution: contribution,
      description: `Operating from IP associated with ${maxSharedIpUsers} distinct accounts`,
      severity: 'critical'
    });
  } else if (maxSharedIpUsers >= 2) {
    const contribution = 8;
    score += contribution;
    factors.push({
      name: 'Shared Network Origin',
      scoreContribution: contribution,
      description: `IP address shared with other active financial accounts`,
      severity: 'medium'
    });
  }

  // 5. Device Anomalies (Emulators, Android VM, missing IMEI/fingerprints)
  const emulatorDevices = Array.from(aggregate.devices).filter(d => 
    d.toLowerCase().includes('emulator') || 
    d.toLowerCase().includes('vbox') || 
    d.toLowerCase().includes('generic') ||
    d.toLowerCase().includes('linux') ||
    d.toLowerCase().includes('tor')
  );
  if (emulatorDevices.length > 0) {
    const contribution = 12;
    score += contribution;
    factors.push({
      name: 'Synthetic / Virtualized Device Indicator',
      scoreContribution: contribution,
      description: `Transactions performed via simulated environment: ${emulatorDevices.join(', ')}`,
      severity: 'high'
    });
  }

  // 6. Suspicious Narration & Crypto Gateway Markers
  let suspiciousKeywords = 0;
  const matchedKeywords: string[] = [];
  for (const narr of aggregate.narrations) {
    const upper = narr.toUpperCase();
    for (const kw of SUSPICIOUS_NARRATION_KEYWORDS) {
      if (upper.includes(kw) && !matchedKeywords.includes(kw)) {
        matchedKeywords.push(kw);
        suspiciousKeywords++;
      }
    }
  }

  if (suspiciousKeywords > 0) {
    const contribution = Math.min(18, suspiciousKeywords * 6);
    score += contribution;
    factors.push({
      name: 'Suspicious Narration / Gateway Pattern',
      scoreContribution: contribution,
      description: `Narration matched fraud markers: ${matchedKeywords.slice(0, 3).join(', ')}`,
      severity: suspiciousKeywords >= 2 ? 'critical' : 'high'
    });
  }

  // 7. Balance Retention vs Terminal Cashout
  const estimatedRetained = Math.max(0, totalIn - totalOut);
  if (inCount > 0 && outCount === 0 && totalIn > 25000) {
    // Potential terminal account or currently holding fund
    const contribution = 15;
    score += contribution;
    factors.push({
      name: 'Terminal Holding / Potential Cash-out Point',
      scoreContribution: contribution,
      description: `Received ₹${totalIn.toLocaleString('en-IN')} with zero onward digital disbursement (potential ATM/OTC drain)`,
      severity: 'high'
    });
  }

  // Cap score between 0 and 100
  const finalScore = Math.min(100, Math.max(0, score));

  // Determine potential layer classification (strictly explainable & heuristic)
  let layer: MuleLayer = 'Normal Account';
  if (finalScore >= 40) {
    if (inCount >= 2 && (outCount <= 2 || passThroughRatio >= 0.85) && fanInRatio >= 2) {
      layer = 'Potential L1 Collector';
    } else if (fanOutRatio >= 2 && passThroughRatio >= 0.6) {
      layer = 'Potential L2 Distributor';
    } else if (outCount === 0 || (passThroughRatio < 0.25 && inCount >= 1)) {
      layer = 'Potential L3 Terminal';
    } else {
      layer = 'Potential L2 Distributor';
    }
  } else if (finalScore >= 25) {
    layer = 'Potential L3 Terminal';
  }

  return {
    accountNumber: account,
    riskIndex: finalScore,
    layer,
    confidence: Number((0.65 + (factors.length * 0.06)).toFixed(2)),
    factors,
    metrics: {
      totalIncoming: totalIn,
      totalOutgoing: totalOut,
      incomingCount: inCount,
      outgoingCount: outCount,
      fanInRatio,
      fanOutRatio,
      passThroughRatio: Number(passThroughRatio.toFixed(2)),
      avgDwellTimeMinutes: Math.round(avgDwellMins),
      uniqueCounterparties: aggregate.counterparties.size,
      sharedIpCount: maxSharedIpUsers,
      knownDeviceTypes: Array.from(aggregate.devices),
      suspiciousKeywordsCount: suspiciousKeywords
    }
  };
}
