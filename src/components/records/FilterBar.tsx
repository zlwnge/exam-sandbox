'use client';

import React from 'react';
import { SUBJECTS } from '@/types/subject';
import { Search } from 'lucide-react';

interface FilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  selectedSubject: string;
  onSubjectChange: (v: string) => void;
  selectedType: string;
  onTypeChange: (v: string) => void;
  dynamicTypes: string[];
  onSearch: () => void;
}

export default function FilterBar({
  search, onSearchChange,
  selectedSubject, onSubjectChange,
  selectedType, onTypeChange,
  dynamicTypes, onSearch,
}: FilterBarProps) {
  return (
    <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col md:flex-row gap-3 items-center shadow-xs">
      <div className="relative w-full md:flex-1">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="全局深搜：输入题干关键词、多源考点、标签或心得..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onSearch(); }}
          className="w-full bg-slate-50/50 pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200/80 outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-700 min-h-[44px]"
        />
      </div>

      <div className="w-full md:w-44">
        <select
          value={selectedSubject}
          onChange={(e) => onSubjectChange(e.target.value)}
          className="w-full bg-white px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-blue-500 transition-all text-slate-700 font-medium min-h-[44px]"
        >
          <option value="">📂 全部硬核科目</option>
          {SUBJECTS.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="w-full md:w-48">
        <select
          value={selectedType}
          onChange={(e) => onTypeChange(e.target.value)}
          className="w-full bg-white px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-blue-500 transition-all text-slate-700 min-h-[44px]"
        >
          <option value="">⚡ 全部细分题型 ({dynamicTypes.length})</option>
          {dynamicTypes.map((t, idx) => (
            <option key={idx} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <div className="w-full md:w-44 flex items-center justify-end">
        <button
          onClick={onSearch}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md active:scale-95 min-h-[44px] min-w-[80px]"
        >
          查询
        </button>
      </div>
    </div>
  );
}
