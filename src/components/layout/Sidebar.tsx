'use client';

import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { LayoutDashboard, Database, AlertOctagon, Terminal, Menu, X } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard' as const, icon: LayoutDashboard, label: '仪表盘数据大盘' },
  { id: 'repository' as const, icon: Database, label: '档案解构重构仓库' },
  { id: 'analytics' as const, icon: AlertOctagon, label: '盲区雷卡态势分析' },
];

export default function Sidebar() {
  const { activeTab, goToTab } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (tab: typeof activeTab) => {
    goToTab(tab);
    setMobileOpen(false);
  };

  const navButtons = (
    <nav className="space-y-1">
      {NAV_ITEMS.map(item => (
        <button
          key={item.id}
          onClick={() => handleNav(item.id)}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all min-h-[44px] ${
            activeTab === item.id
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/10'
              : 'text-slate-400 hover:bg-slate-900 hover:text-white'
          }`}
        >
          <item.icon className="w-4 h-4" /> {item.label}
        </button>
      ))}
    </nav>
  );

  const sidebarInner = (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between px-1 py-2 border-b border-slate-800/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 text-white font-black flex items-center justify-center rounded-xl text-md shadow-md shadow-blue-500/20">公</div>
            <div>
              <h1 className="text-xs font-bold tracking-wide">精细化时空复盘</h1>
              <p className="text-[9px] text-slate-500 font-mono mt-0.5">SANDBOX V1.3</p>
            </div>
          </div>
          {/* Mobile close button */}
          <button onClick={() => setMobileOpen(false)} className="md:hidden text-slate-400 hover:text-white p-2 min-h-[44px] min-w-[44px] flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>
        {navButtons}
      </div>
      <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-[10px] text-slate-500 space-y-1 font-mono">
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1"><Terminal className="w-3 h-3 text-blue-500" /> DB Engine:</span>
          <span className="text-slate-300">SQLite3</span>
        </div>
        <div className="flex justify-between">
          <span>Sandbox Environment:</span>
          <span className="text-green-500 font-bold">100% Isolate</span>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button — fixed top-left */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-3 left-3 z-50 md:hidden bg-slate-950 text-white p-2.5 rounded-xl shadow-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
        aria-label="打开菜单"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Desktop sidebar — always visible */}
      <aside className="hidden md:flex w-64 bg-slate-950 text-white flex-col justify-between p-4 shrink-0 border-r border-slate-800">
        {sidebarInner}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-slate-950 text-white flex flex-col justify-between p-4 border-r border-slate-800 shadow-2xl">
            {sidebarInner}
          </aside>
        </div>
      )}
    </>
  );
}
