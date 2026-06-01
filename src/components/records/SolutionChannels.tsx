'use client';

import React, { useCallback } from 'react';
import { normalizeUploadPath } from '@/lib/url';
import { SolutionRow } from '@/types/record';
import { Plus, Trash2 } from 'lucide-react';

interface SolutionChannelsProps {
  solutions: SolutionRow[];
  onChange: (solutions: SolutionRow[]) => void;
  errors?: (string | undefined)[];
}

export default function SolutionChannels({ solutions, onChange, errors }: SolutionChannelsProps) {
  const addChannelRow = () => {
    onChange([...solutions, { channel_name: '', solution_text: '', solution_image: null }]);
  };

  const removeChannelRow = (index: number) => {
    const updated = [...solutions];
    updated.splice(index, 1);
    onChange(updated);
  };

  const handleChannelChange = (index: number, field: 'channel_name' | 'solution_text', value: string) => {
    const updated = [...solutions];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const handlePasteSolution = useCallback((e: React.ClipboardEvent, solIndex: number) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (!file) continue;
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            const dataUrl = event.target.result as string;
            onChange(solutions.map((s, idx) =>
              idx === solIndex ? { ...s, solution_image: dataUrl } : s
            ));
          }
        };
        reader.readAsDataURL(file);
      }
    }
  }, [solutions, onChange]);

  return (
    <div className="border border-blue-100 bg-blue-50/5 rounded-2xl p-4 space-y-3">
      <div className="flex justify-between items-center">
        <div className="text-xs font-bold text-slate-700 flex items-center gap-1">
          🔎 各渠道参考答案解析对照库
        </div>
        <button type="button" onClick={addChannelRow} className="bg-slate-900 text-white text-[10px] px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 hover:bg-slate-800 transition-all">
          <Plus className="w-3 h-3" /> 增加渠道
        </button>
      </div>
      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
        {solutions.map((sol, idx) => (
          <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-start border-b border-slate-100 pb-2">
            <div className="md:col-span-3">
              <textarea
                onPaste={(e) => handlePasteSolution(e, idx)}
                placeholder="参考答案 或 核心解题思路，支持粘贴截图"
                value={sol.solution_text}
                onChange={(e) => handleChannelChange(idx, 'solution_text', e.target.value)}
                className="w-full border-b border-slate-200 py-1.5 text-xs outline-none bg-transparent focus:border-blue-500 resize-none"
                rows={2}
              />
              {errors && errors[idx] && <div className="text-red-500 text-xs mt-1">{errors[idx]}</div>}
              {sol.solution_image && (
                <div className="mt-2 relative inline-block border rounded-lg overflow-hidden bg-slate-50">
                  <img src={normalizeUploadPath(sol.solution_image)} alt={`渠道${idx}截图`} className="max-h-24 object-contain" />
                  <button type="button" onClick={() => {
                    const updated = [...solutions];
                    updated[idx] = { ...updated[idx], solution_image: null };
                    onChange(updated);
                  }} className="absolute top-0 right-0 bg-red-500 text-white text-[9px] px-1 rounded-bl">移除</button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <input
                type="text"
                placeholder="渠道来源(如:粉笔)"
                value={sol.channel_name}
                onChange={(e) => handleChannelChange(idx, 'channel_name', e.target.value)}
                className="w-full border border-slate-200 p-1.5 rounded-lg text-xs outline-none bg-white text-center focus:border-blue-500"
                required
              />
              {solutions.length > 1 && (
                <button type="button" onClick={() => removeChannelRow(idx)} className="text-red-400 hover:text-red-600 p-1">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
