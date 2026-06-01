'use client';

import React from 'react';
import '@/app/globals.css';
import { AppProvider, useApp } from '@/contexts/AppContext';
import Sidebar from '@/components/layout/Sidebar';
import GithubHeatmap from '@/components/dashboard/GithubHeatmap';
import RecordForm from '@/components/records/RecordForm';
import RepositoryGrid from '@/components/records/RepositoryGrid';
import StatsPanel from '@/components/dashboard/StatsPanel';
import { FilePlus2 } from 'lucide-react';

function MainContent() {
  const {
    activeTab,
    refreshTrigger,
    isRecordModalOpen,
    triggerRefresh,
    openRecordModal,
    closeRecordModal,
    presetFilters,
  } = useApp();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50/60">
      <Sidebar />

      {/* Main area */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-14 bg-white border-b px-4 md:px-6 flex items-center justify-between shrink-0">
          {/* Mobile: add left padding for hamburger button */}
          <h2 className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest font-mono ml-10 md:ml-0 truncate">
            {activeTab === 'dashboard' && '📈 Control Panel / 数据监控指标中心'}
            {activeTab === 'repository' && '🗂️ Asset Repository / 资产持久化重构核心流'}
            {activeTab === 'analytics' && '🎯 Risk Assessment / 高危错因黑洞交叉大盘'}
          </h2>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-bold bg-slate-100 px-3 py-1 rounded-full font-mono shrink-0">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            LOCAL DATA SECURE
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 scrollbar-hide">
          {activeTab === 'dashboard' && (
            <div className="space-y-5">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 rounded-2xl border border-blue-100 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <h3 className="text-sm font-bold text-slate-800">🎯 高维度归档新错题模型</h3>
                  <p className="text-xs text-slate-500">将你在模考或真题中发现的降维破题眼进行精细化封装持久化。</p>
                </div>
                <button onClick={openRecordModal} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 shrink-0 active:scale-95 min-h-[44px]">
                  <FilePlus2 className="w-4 h-4" /> ➕ 录入高维题目档案
                </button>
              </div>

              <GithubHeatmap key={`hm-${refreshTrigger}`} />
              <StatsPanel key={`stats-${refreshTrigger}`} />

              <div className="bg-white p-5 rounded-xl border text-xs text-slate-400 leading-relaxed">
                💡 <b>使用指南</b>：点击上方按钮唤出录入舱。在录入时，您可以直接在输入框内使用 <b>Ctrl + V</b> 快速黏贴剪贴板中的题目、公式或思维导图切图，系统会自动将其无缝打包持久化。
              </div>
            </div>
          )}
          {activeTab === 'repository' && <RepositoryGrid key={`rp-${refreshTrigger}-${presetFilters ? JSON.stringify(presetFilters) : 'no'}`} initialFilters={presetFilters} />}
          {activeTab === 'analytics' && <GithubHeatmap key={`al-${refreshTrigger}`} />}
        </div>
      </main>

      {/* Record form modal */}
      {isRecordModalOpen && (
        <RecordForm
          onRecordAdded={() => { triggerRefresh(); closeRecordModal(); }}
          onClose={closeRecordModal}
        />
      )}
    </div>
  );
}

export default function MainAppShell() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
