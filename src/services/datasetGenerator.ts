import { RawTransaction, PaymentMode } from '../types/forensics';

const IFSC_POOL = [
  'SBIN0001423', 'SBIN0002819', 'SBIN0006741',
  'HDFC0004120', 'HDFC0001850', 'HDFC0000088',
  'ICIC0000341', 'ICIC0001122', 'ICIC0006541',
  'UTIB0001092', 'UTIB0002441', 'UTIB0000451',
  'PUNB0124800', 'PUNB0045100',
  'BARB0INDBOM', 'BARB0CONNPL',
  'KKBK0000958', 'YESB0000412',
  'PYTM0123456', 'AIRP0000001', 'IPOS0000001'
];

const DEVICE_POOL = [
  'Samsung Galaxy S23 (SM-S911B)',
  'Redmi Note 12 Pro (Android 12)',
  'iPhone 14 (iOS 16.6)',
  'OnePlus 11R 5G (CPH2487)',
  'Vivo V29 Pro (V2250)',
  'Realme 11 Pro+ 5G',
  'Generic-x86_64 Android Emulator', // Suspicious
  'BlueStacks App Player (Nougat-64)', // Suspicious
  'LDPlayer Android VM', // Suspicious
  'Pixel 7 Pro (TD1A.220804.031)'
];

const SUSPICIOUS_IPS = [
  '103.21.144.82', // Suspicious VPN cluster
  '45.142.195.12', // Tor exit / proxy
  '194.26.29.110', // Bulletproof host
  '185.220.101.5',
];

const NORMAL_IPS = [
  '49.36.128.45', '115.111.23.90', '14.139.12.88',
  '27.56.192.11', '122.161.45.210', '157.34.120.78',
  '106.195.40.12', '182.72.65.18', '223.187.9.33'
];

export interface GeneratedDatasetResult {
  transactions: RawTransaction[];
  victimAccounts: string[];
  muleAccounts: string[];
  normalAccounts: string[];
}

export function generateForensicsDataset(
  targetTotalRows: number = 25000,
  baseDate: Date = new Date(Date.now() - 15 * 86400 * 1000)
): GeneratedDatasetResult {
  const transactions: RawTransaction[] = [];
  const victimAccounts: string[] = [
    'VIC_8830192841', // Investment Task Fraud Case (₹45,50,000)
    'VIC_9941028371', // Digital Arrest Extortion Scam (₹28,00,000)
    'VIC_7718294012', // FedEx / Customs Impersonation (₹15,75,000)
    'VIC_6629103847', // Fake Crypto Exchange Arbitrage (₹62,00,000)
    'VIC_5539201948', // Work-from-home Part-time Task Scam (₹9,80,000)
  ];

  const muleAccountsSet = new Set<string>();
  const normalAccountsSet = new Set<string>();

  let txIdCounter = 1000000;
  function nextTxId(prefix: string = 'TXN'): string {
    txIdCounter++;
    return `${prefix}${txIdCounter}`;
  }

  // Pre-generate 1,500 mule accounts with designated roles
  const l1Collectors: string[] = [];
  const l2Distributors: string[] = [];
  const l3Terminals: string[] = [];

  for (let i = 1; i <= 250; i++) {
    const acc = `MULE_L1_${String(i).padStart(4, '0')}`;
    l1Collectors.push(acc);
    muleAccountsSet.add(acc);
  }
  for (let i = 1; i <= 650; i++) {
    const acc = `MULE_L2_${String(i).padStart(4, '0')}`;
    l2Distributors.push(acc);
    muleAccountsSet.add(acc);
  }
  for (let i = 1; i <= 600; i++) {
    const acc = `MULE_L3_${String(i).padStart(4, '0')}`;
    l3Terminals.push(acc);
    muleAccountsSet.add(acc);
  }

  // 1. Build Fraud Multi-Hop Networks for each of the 5 Victims
  const victimScenarios = [
    { victim: victimAccounts[0], initialAmount: 4550000, dayOffset: 1, scamType: 'Telegram Task Investment' },
    { victim: victimAccounts[1], initialAmount: 2800000, dayOffset: 3, scamType: 'CBI Impersonation Digital Arrest' },
    { victim: victimAccounts[2], initialAmount: 1575000, dayOffset: 5, scamType: 'Narcotics Parcel Extortion' },
    { victim: victimAccounts[3], initialAmount: 6200000, dayOffset: 8, scamType: 'Fake Binance USDT Arbitrage' },
    { victim: victimAccounts[4], initialAmount: 980000, dayOffset: 11, scamType: 'Hotel Review Rating Commission' },
  ];

  let l1Index = 0;
  let l2Index = 0;
  let l3Index = 0;

  for (const scen of victimScenarios) {
    const victimAcc = scen.victim;
    const vTime = new Date(baseDate.getTime() + scen.dayOffset * 86400 * 1000 + 10 * 3600 * 1000);
    const victimIfsc = IFSC_POOL[0];

    // Victim transfers to 2 or 3 L1 Collectors (Fan-out from victim / Fan-in to L1)
    const l1Subset = [l1Collectors[l1Index++ % l1Collectors.length], l1Collectors[l1Index++ % l1Collectors.length]];
    if (scen.initialAmount > 3000000) {
      l1Subset.push(l1Collectors[l1Index++ % l1Collectors.length]);
    }

    const splitAmountL1 = Math.floor(scen.initialAmount / l1Subset.length);

    for (let i = 0; i < l1Subset.length; i++) {
      const l1 = l1Subset[i];
      const l1Time = new Date(vTime.getTime() + i * 4 * 60 * 1000); // sent 4 mins apart
      const l1Ifsc = IFSC_POOL[(l1Index + i) % IFSC_POOL.length];

      // Hop 1: Victim -> L1 Collector
      transactions.push({
        Transaction_ID: nextTxId('UPI_V1_'),
        Sender_Account: victimAcc,
        Receiver_Account: l1,
        Sender_IFSC: victimIfsc,
        Receiver_IFSC: l1Ifsc,
        Amount: splitAmountL1,
        Timestamp: l1Time.toISOString(),
        Payment_Mode: 'UPI',
        Narration: `UPI/${nextTxId('REF')}/${scen.scamType.toUpperCase().replace(/\s+/g, '_')}`,
        IP_Address: NORMAL_IPS[i % NORMAL_IPS.length],
        Device_Type: 'Samsung Galaxy S23 (SM-S911B)',
      });

      // Rapid Dwell Time: L1 Collector forwards within 6 to 18 minutes to multiple L2 Distributors (Layering)
      const l2Subset = [
        l2Distributors[l2Index++ % l2Distributors.length],
        l2Distributors[l2Index++ % l2Distributors.length],
        l2Distributors[l2Index++ % l2Distributors.length],
      ];
      const splitAmountL2 = Math.floor((splitAmountL1 * 0.98) / l2Subset.length); // 2% retained by L1 as mule commission
      const muleClusterIp = SUSPICIOUS_IPS[l1Index % SUSPICIOUS_IPS.length];

      for (let j = 0; j < l2Subset.length; j++) {
        const l2 = l2Subset[j];
        const l2Time = new Date(l1Time.getTime() + (8 + j * 3) * 60 * 1000);
        const l2Ifsc = IFSC_POOL[(l2Index + j) % IFSC_POOL.length];

        // Hop 2: L1 -> L2 Distributor
        transactions.push({
          Transaction_ID: nextTxId('IMPS_L1_'),
          Sender_Account: l1,
          Receiver_Account: l2,
          Sender_IFSC: l1Ifsc,
          Receiver_IFSC: l2Ifsc,
          Amount: splitAmountL2,
          Timestamp: l2Time.toISOString(),
          Payment_Mode: 'IMPS',
          Narration: `IMPS/${nextTxId('M')}/P2P_USDT_SETTLE`,
          IP_Address: muleClusterIp,
          Device_Type: DEVICE_POOL[6], // Emulator
        });

        // Hop 3: L2 Distributor forwards to L3 Terminal cash-out accounts within 25 minutes
        const l3Subset = [
          l3Terminals[l3Index++ % l3Terminals.length],
          l3Terminals[l3Index++ % l3Terminals.length],
        ];
        const splitAmountL3 = Math.floor((splitAmountL2 * 0.97) / l3Subset.length);

        for (let k = 0; k < l3Subset.length; k++) {
          const l3 = l3Subset[k];
          const l3Time = new Date(l2Time.getTime() + (12 + k * 5) * 60 * 1000);
          const l3Ifsc = IFSC_POOL[(l3Index + k) % IFSC_POOL.length];

          transactions.push({
            Transaction_ID: nextTxId('NEFT_L2_'),
            Sender_Account: l2,
            Receiver_Account: l3,
            Sender_IFSC: l2Ifsc,
            Receiver_IFSC: l3Ifsc,
            Amount: splitAmountL3,
            Timestamp: l3Time.toISOString(),
            Payment_Mode: 'NEFT',
            Narration: `NEFT/${nextTxId('REF')}/CRYPTO_ESCROW_CASHOUT`,
            IP_Address: muleClusterIp,
            Device_Type: DEVICE_POOL[7], // BlueStacks emulator
          });

          // In 50% of paths, L3 is terminal holding. In other 50%, Hop 4 cash-out (ATM withdrawal or wallet gateway)
          if (k % 2 === 1) {
            const terminalAccount = `TERMINAL_GATEWAY_${String(l3Index).padStart(4, '0')}`;
            muleAccountsSet.add(terminalAccount);
            const l4Time = new Date(l3Time.getTime() + 15 * 60 * 1000);

            transactions.push({
              Transaction_ID: nextTxId('RTGS_L3_'),
              Sender_Account: l3,
              Receiver_Account: terminalAccount,
              Sender_IFSC: l3Ifsc,
              Receiver_IFSC: 'PYTM0123456',
              Amount: splitAmountL3 - 500,
              Timestamp: l4Time.toISOString(),
              Payment_Mode: 'RTGS',
              Narration: `RTGS/AIRPAY_MERCHANT/OFFSHORE_WALLET_EXIT`,
              IP_Address: SUSPICIOUS_IPS[1],
              Device_Type: DEVICE_POOL[8],
            });
          }
        }
      }
    }
  }

  // 2. Generate Additional Mule Ring transactions (inter-mule layering, fan-in pooling)
  // to reach realistic 1,500 mule accounts behavior
  for (let m = 0; m < 700; m++) {
    const sender = l2Distributors[m % l2Distributors.length];
    const receiver = l3Terminals[(m + 15) % l3Terminals.length];
    const randomDay = 1 + (m % 13);
    const txTime = new Date(baseDate.getTime() + randomDay * 86400 * 1000 + (m * 90000) % (24 * 3600 * 1000));
    const amount = 15000 + ((m * 1793) % 250000);

    transactions.push({
      Transaction_ID: nextTxId('UPI_MUL_'),
      Sender_Account: sender,
      Receiver_Account: receiver,
      Sender_IFSC: IFSC_POOL[m % IFSC_POOL.length],
      Receiver_IFSC: IFSC_POOL[(m + 3) % IFSC_POOL.length],
      Amount: amount,
      Timestamp: txTime.toISOString(),
      Payment_Mode: 'UPI',
      Narration: `UPI/COMMISSION_SPLIT_${m}/TASK_BONUS`,
      IP_Address: SUSPICIOUS_IPS[m % SUSPICIOUS_IPS.length],
      Device_Type: DEVICE_POOL[6 + (m % 3)],
    });
  }

  // 3. Fill the rest with Realistic Normal Banking Transactions (23,500 normal accounts)
  const remainingRows = targetTotalRows - transactions.length;
  const normalAccounts: string[] = [];

  for (let i = 1; i <= 3500; i++) {
    const acc = `ACC_IN_${String(i).padStart(6, '0')}`;
    normalAccounts.push(acc);
    normalAccountsSet.add(acc);
  }

  const normalNarrations = [
    'UPI/GROCERY_STORE/PAYMENT',
    'IMPS/SALARY_OCT_CREDIT',
    'NEFT/ELECTRICITY_BILL_SETTLE',
    'UPI/DINING_RESTAURANT',
    'UPI/ZOMATO_FOOD_ORDER',
    'NEFT/RENT_TRANSFER_FLAT_402',
    'UPI/AMAZON_SHOPPING',
    'IMPS/FAMILY_EXPENSES',
    'RTGS/VENDOR_MATERIAL_PAYMENT',
    'UPI/PETROL_PUMP_HPCL'
  ];

  for (let r = 0; r < remainingRows; r++) {
    const senderIdx = (r * 7 + 13) % normalAccounts.length;
    let recIdx = (r * 11 + 29) % normalAccounts.length;
    if (senderIdx === recIdx) recIdx = (recIdx + 1) % normalAccounts.length;

    const sender = normalAccounts[senderIdx];
    const receiver = normalAccounts[recIdx];

    const randomDay = (r % 15);
    const randomHour = 8 + (r % 14); // 8 AM to 10 PM
    const randomMin = (r * 3) % 60;
    const randomSec = (r * 7) % 60;
    const txTime = new Date(baseDate.getTime() + randomDay * 86400 * 1000 + randomHour * 3600 * 1000 + randomMin * 60 * 1000 + randomSec * 1000);

    const paymentModes: PaymentMode[] = ['UPI', 'IMPS', 'NEFT', 'RTGS'];
    const pMode = paymentModes[r % 4];
    const amount = pMode === 'RTGS' ? 250000 + (r * 43) % 300000 : 500 + ((r * 193) % 45000);

    transactions.push({
      Transaction_ID: nextTxId('TXN_NRM_'),
      Sender_Account: sender,
      Receiver_Account: receiver,
      Sender_IFSC: IFSC_POOL[r % IFSC_POOL.length],
      Receiver_IFSC: IFSC_POOL[(r + 2) % IFSC_POOL.length],
      Amount: amount,
      Timestamp: txTime.toISOString(),
      Payment_Mode: pMode,
      Narration: normalNarrations[r % normalNarrations.length],
      IP_Address: NORMAL_IPS[r % NORMAL_IPS.length],
      Device_Type: DEVICE_POOL[r % 5],
    });
  }

  // Sort transactions chronologically
  transactions.sort((a, b) => new Date(a.Timestamp).getTime() - new Date(b.Timestamp).getTime());

  return {
    transactions,
    victimAccounts,
    muleAccounts: Array.from(muleAccountsSet),
    normalAccounts: Array.from(normalAccountsSet),
  };
}
