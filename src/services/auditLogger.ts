import { AuditLogItem } from '../types/forensics';

class AuditLogService {
  private logs: AuditLogItem[] = [];

  constructor() {
    this.logAction(
      'IMPORT_DATA',
      'System initialized with standard benchmark dataset (25,000 transactions, 5 victim rings, 1,500 mules)',
      'SYS_CORE_DAEMON'
    );
  }

  public logAction(
    action: AuditLogItem['action'],
    details: string,
    officerId: string = 'IO_CYBER_8412',
    targetAccount?: string
  ): AuditLogItem {
    const item: AuditLogItem = {
      id: `AUDIT_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      officerId,
      action,
      details,
      targetAccount,
      hash: `SIG_${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
    };
    this.logs.unshift(item);
    return item;
  }

  public getLogs(): AuditLogItem[] {
    return [...this.logs];
  }

  public clear(): void {
    this.logs = [];
  }
}

export const auditLogger = new AuditLogService();
