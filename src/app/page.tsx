'use client';

import React, { useState } from 'react';
import '@/app/globals.css';
import GithubHeatmap from '@/components/GithubHeatmap';
import RecordForm from '@/components/RecordForm';
import RepositoryGrid from '@/components/RepositoryGrid';
import StatsPanel from '@/components/StatsPanel';
import { LayoutDashboard, Database, AlertOctagon, Terminal, FilePlus2 } from 'lucide-react';

export default function MainAppShell() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'repository' | 'analytics'>('dashboard');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  // 🔥 控制录入舱弹窗的核心状态
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [presetFilters, setPresetFilters] = useState<any>(null);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50/60">
      {/* 侧边功能主控制流面板 */}
      <aside className="w-64 bg-slate-950 text-white flex flex-col justify-between p-4 shrink-0 border-r border-slate-800">
        <div className="space-y-6">
          <div className="flex items-center gap-2 px-1 py-2 border-b border-slate-800/60">
            <div className="w-8 h-8 bg-blue-600 text-white font-black flex items-center justify-center rounded-xl text-md shadow-md shadow-blue-500/20">公</div>
            <div>
              <h1 className="text-xs font-bold tracking-wide">精细化时空复盘</h1>
              <p className="text-[9px] text-slate-500 font-mono mt-0.5">SANDBOX V1.2 (OFFLINE)</p >
            </div>
          </div>
          <nav className="space-y-1">
            <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/10' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}>
              <LayoutDashboard className="w-4 h-4" /> 仪表盘数据大盘
            </button>
            <button onClick={() => { setPresetFilters(null); setActiveTab('repository'); }} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${activeTab === 'repository' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/10' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}>
              <Database className="w-4 h-4" /> 档案解构重构仓库
            </button>
            <button onClick={() => setActiveTab('analytics')} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${activeTab === 'analytics' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/10' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}>
              <AlertOctagon className="w-4 h-4" /> 盲区雷卡态势分析
            </button>
          </nav>
        </div>
        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-[10px] text-slate-500 space-y-1 font-mono">
          <div className="flex justify-between items-center"><span className="flex items-center gap-1"><Terminal className="w-3 h-3 text-blue-500" /> DB Engine:</span><span className="text-slate-300">SQLite3</span></div>
          <div className="flex justify-between"><span>Sandbox Environment:</span><span className="text-green-500 font-bold">100% Isolate</span></div>
        </div>
      </aside>

      {/* 右侧业务主展台 */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-white border-b px-6 flex items-center justify-between shrink-0">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono">
            {activeTab === 'dashboard' && '📈 Control Panel / 数据监控指标中心'}
            {activeTab === 'repository' && '🗂️ Asset Repository / 资产持久化重构核心流'}
            {activeTab === 'analytics' && '🎯 Risk Assessment / 高危错因黑洞交叉大盘'}
          </h2>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-bold bg-slate-100 px-3 py-1 rounded-full font-mono">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            LOCAL DATA SECURE
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-hide">
          {activeTab === 'dashboard' && (
            <div className="space-y-5">
              {/* 动作区：优雅干净的触发卡片，代替之前的赤裸裸平铺 */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 rounded-2xl border border-blue-100 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <h3 className="text-sm font-bold text-slate-800">🎯 高维度归档新错题模型</h3>
                  <p className="text-xs text-slate-500">将你在模考或真题中发现的降维破题眼进行精细化封装持久化。</p >
                </div>
                <button onClick={() => setIsRecordModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 shrink-0 active:scale-95">
                  <FilePlus2 className="w-4 h-4" /> ➕ 录入高维题目档案
                </button>
              </div>

              {/* GitHub 时空贡献度热力图保持常驻 */}
              <GithubHeatmap key={`hm-${refreshTrigger}`} />
              {/* 实时统计面板：科目 / 细分题型 / 知识点 */}
              <StatsPanel key={`stats-${refreshTrigger}`} onNavigate={(f) => { setPresetFilters(f); setActiveTab('repository'); setRefreshTrigger(prev => prev + 1); }} />
              
              {/* 简易说明引导 */}
              <div className="bg-white p-5 rounded-xl border text-xs text-slate-400 leading-relaxed">
                💡 <b>使用指南</b>：点击上方按钮唤出录入舱。在录入时，您可以直接在输入框内使用 <b>Ctrl + V</b> 快速黏贴剪贴板中的题目、公式或思维导图切图，系统会自动将其无缝打包持久化。
              </div>
            </div>
          )}
          {activeTab === 'repository' && <RepositoryGrid key={`rp-${refreshTrigger}-${presetFilters ? JSON.stringify(presetFilters) : 'no'}`} initialFilters={presetFilters} />}
          {activeTab === 'analytics' && <GithubHeatmap key={`al-${refreshTrigger}`} />}
        </div>
      </main>

      {/* 🔥 核心控制：当且仅当状态触发时，以高阻尼模态弹窗形式挂载 */}
      {isRecordModalOpen && (
        <RecordForm 
          onRecordAdded={() => setRefreshTrigger(prev => prev + 1)} 
          onClose={() => setIsRecordModalOpen(false)}
        />
      )}
    </div>
  );
}