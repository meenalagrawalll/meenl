export interface BankDetail {
  code: string;
  name: string;
  category: 'Public Sector' | 'Private' | 'Payment Bank' | 'Fintech/Wallet';
  nodalEmail: string;
  portalUrl: string;
}

const BANK_MAP: Record<string, BankDetail> = {
  SBIN: { code: 'SBIN', name: 'State Bank of India', category: 'Public Sector', nodalEmail: 'nodal.cyber@sbi.co.in', portalUrl: 'https://cms.sbi.co.in' },
  HDFC: { code: 'HDFC', name: 'HDFC Bank Ltd', category: 'Private', nodalEmail: 'cybercell.reports@hdfcbank.com', portalUrl: 'https://hdfcbank.com/cyberlaw' },
  ICIC: { code: 'ICIC', name: 'ICICI Bank Ltd', category: 'Private', nodalEmail: 'cyberinvestigations@icicibank.com', portalUrl: 'https://icicibank.com/lawenforcement' },
  UTIB: { code: 'UTIB', name: 'Axis Bank Ltd', category: 'Private', nodalEmail: 'nodal.axis@axisbank.com', portalUrl: 'https://axisbank.com/cyber' },
  PUNB: { code: 'PUNB', name: 'Punjab National Bank', category: 'Public Sector', nodalEmail: 'cybercrime@pnb.co.in', portalUrl: 'https://pnbindia.in' },
  BARB: { code: 'BARB', name: 'Bank of Baroda', category: 'Public Sector', nodalEmail: 'lawenforcement@bankofbaroda.com', portalUrl: 'https://bankofbaroda.in' },
  KKBK: { code: 'KKBK', name: 'Kotak Mahindra Bank', category: 'Private', nodalEmail: 'cybercell@kotak.com', portalUrl: 'https://kotak.com' },
  YESB: { code: 'YESB', name: 'Yes Bank Ltd', category: 'Private', nodalEmail: 'leliaison@yesbank.in', portalUrl: 'https://yesbank.in' },
  IDFB: { code: 'IDFB', name: 'IDFC FIRST Bank', category: 'Private', nodalEmail: 'nodal.le@idfcfirstbank.com', portalUrl: 'https://idfcfirstbank.com' },
  PYTM: { code: 'PYTM', name: 'Paytm Payments Bank', category: 'Payment Bank', nodalEmail: 'lawenforcement@paytmbank.com', portalUrl: 'https://paytmbank.com' },
  AIRP: { code: 'AIRP', name: 'Airtel Payments Bank', category: 'Payment Bank', nodalEmail: 'le.nodal@airtelbank.com', portalUrl: 'https://airtel.in/bank' },
  IPOS: { code: 'IPOS', name: 'India Post Payments Bank', category: 'Payment Bank', nodalEmail: 'cybercoord@ippbonline.in', portalUrl: 'https://ippbonline.com' },
};

export function getBankFromIFSC(ifsc: string): { bankName: string; category: string; nodalEmail: string } {
  if (!ifsc || ifsc.length < 4) {
    return { bankName: 'Unknown Bank', category: 'Unknown', nodalEmail: 'cybercrime@rbi.org.in' };
  }
  const prefix = ifsc.substring(0, 4).toUpperCase();
  const bank = BANK_MAP[prefix];
  if (bank) {
    return { bankName: bank.name, category: bank.category, nodalEmail: bank.nodalEmail };
  }
  return { bankName: `${prefix} Bank`, category: 'Commercial Bank', nodalEmail: `cybercell@${prefix.toLowerCase()}.bank` };
}

export function maskAccount(account: string, showUnmasked: boolean = false): string {
  if (showUnmasked) return account;
  if (!account || account.length < 5) return '••••••';
  const visibleLen = Math.min(4, Math.floor(account.length / 2));
  const hiddenCount = account.length - visibleLen;
  return 'X'.repeat(hiddenCount) + account.slice(-visibleLen);
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}
