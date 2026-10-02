import React from 'react';
import {
  LayoutDashboard,
  Search,
  ReceiptText,
  ShieldAlert,
  Share2,
  Clock,
  FolderLock,
  FileText,
  Cpu,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'investigations'
  | 'transactions'
  | 'mule-intelligence'
  | 'network-graph'
  | 'timeline'
  | 'evidence'
  | 'reports'
  | 'system';

interface NavigationProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  activeTraceCount: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  activeTraceCount,
}) => {
  const tabs: { id: NavTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    {
      id: 'investigations',
      label: 'Investigations',
      icon: <Search className="w-4 h-4" />,
      badge: activeTraceCount > 0 ? `${activeTraceCount} Active` : undefined,
    },
    { id: 'transactions', label: 'Transactions', icon: <ReceiptText className="w-4 h-4" /> },
    { id: 'mule-intelligence', label: 'Mule Intelligence', icon: <ShieldAlert className="w-4 h-4" /> },
    { id: 'network-graph', label: 'Network Graph', icon: <Share2 className="w-4 h-4" /> },
    { id: 'timeline', label: 'Timeline', icon: <Clock className="w-4 h-4" /> },
    { id: 'evidence', label: 'Evidence', icon: <FolderLock className="w-4 h-4" /> },
    { id: 'reports', label: 'Reports', icon: <FileText className="w-4 h-4" /> },
    { id: 'system', label: 'System', icon: <Cpu className="w-4 h-4" /> },
  ];

  return (
    <nav className="bg-[#090f19] border-b border-slate-800/80 px-4 select-none">
      <div className="max-w-[1920px] mx-auto flex items-center space-x-1 overflow-x-auto scrollbar-none py-1">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-mono font-medium rounded-t border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-cyan-400 bg-cyan-950/30 text-cyan-300 shadow-[inset_0_1px_0_rgba(6,182,212,0.4)]'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <span className={isActive ? 'text-cyan-400' : 'text-slate-400'}>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
