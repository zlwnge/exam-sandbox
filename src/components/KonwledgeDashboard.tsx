'use client';

import React, { useState, useEffect } from 'react';

export default function KnowledgeDashboard() {
  const [data, setData] = useState<any>({ summary: [], paths: [] });

  useEffect(() => {
    fetch('/api/analytics').then(res => res.json()).then(d => { if (d.success) setData(d); });
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(data.summary || []).map((item: any) => (
          <div key={item.subject} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <h4 className="text-sm font-bold text-slate-800 border-b pb-1.5">{item.subject} 统计矩阵</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">已压缩思维模型</span>
                <span className="font-bold text-slate-700 font-mono">{item.total_count} 题</span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-500 font-medium">⚠️ 4星以上高危雷区</span>
                <span className="font-bold text-red-600 font-mono">{item.core_danger_count} 处</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <h4 className="text-sm font-bold text-slate-800 mb-3">🎯 高危盲区路径态势矩阵</h4>
        <div className="overflow-x-auto text-xs">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50 border-b text-slate-400 font-bold">
                <th className="p-2">微观科目映射路径 (标签)</th>
                <th className="p-2">归属分类</th>
                <th className="p-2">解构模型深度</th>
                <th className="p-2">雷区状态态势</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(data.paths || []).map((p: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="p-2 font-semibold text-slate-700">{p.knowledge_path}</td>
                  <td className="p-2"><span className="bg-slate-900 text-white text-[9px] px-2 py-0.5 rounded">{p.subject}</span></td>
                  <td className="p-2 text-slate-500 font-mono">{p.record_count} 题</td>
                  <td className="p-2">
                    {p.high_risk_count > 0 ? (
                      <span className="text-[10px] bg-red-50 text-red-700 px-2 py-0.5 border border-red-200 rounded-full animate-pulse font-medium">⚠️ 重点清剿盲区</span>
                    ) : (
                      <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 border border-green-200 rounded-full font-medium">🛡️ 安全护城河已就绪</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}