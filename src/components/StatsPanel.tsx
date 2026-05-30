'use client';

import React, { useEffect, useState } from 'react';
import { ChevronRight, ChevronDown, Sliders } from 'lucide-react';

type KnowledgeRow = { tag: string; cnt: number };
type TypeRow = { question_type: string; cnt: number; knowledge: KnowledgeRow[] };
type SubjectRow = { subject: string; cnt: number; types: TypeRow[] };

export default function StatsPanel({ onNavigate }: { onNavigate: (f: { subject?: string; question_type?: string; tag?: string; autoRun?: boolean }) => void }) {
  const [loading, setLoading] = useState(true);
  const [hierarchy, setHierarchy] = useState<SubjectRow[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [expandedType, setExpandedType] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => {
        if (!mounted) return;
        if (data.success) {
          setHierarchy(data.hierarchy || []);
          if (data.hierarchy && data.hierarchy.length > 0) {
            setSelectedSubject(data.hierarchy[0].subject);
          }
        }
      })
      .catch(() => {})
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false };
  }, []);

  const handleNavigate = (payload: { subject?: string; question_type?: string; tag?: string; autoRun?: boolean }) => {
    try { localStorage.setItem('presetFilters', JSON.stringify(payload)); } catch (e) {}
    onNavigate({ ...payload, autoRun: true });
  };

  const subjectsArea = (
    <div className="flex items-center gap-2 overflow-auto pb-1">
      {loading ? <div className="text-slate-400 text-xs">加载中...</div> : (
        hierarchy.map((s) => (
          <button key={s.subject} onClick={() => { setSelectedSubject(s.subject); setExpandedType(null); }}
            className={`px-3 py-1 rounded-full text-[12px] font-medium ${selectedSubject === s.subject ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
            {s.subject} · {s.cnt}
          </button>
        ))
      )}
    </div>
  );

  const typesList = () => {
    if (loading) return <div className="text-slate-400">加载中...</div>;
    const sub = hierarchy.find(h => h.subject === selectedSubject);
    if (!sub) return <div className="text-slate-400">未找到题型</div>;

    return (
      <div className="space-y-2">
        {sub.types.map((t) => (
          <div key={t.question_type} className="border border-slate-100 rounded-lg p-3 bg-white">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <button onClick={() => setExpandedType(expandedType === t.question_type ? null : t.question_type)} className="p-1 rounded-md text-slate-500 hover:bg-slate-50">
                  {expandedType === t.question_type ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                <div className="text-sm font-medium text-slate-700">{t.question_type}</div>
                <div className="text-[12px] text-slate-400">{t.cnt} 道</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleNavigate({ subject: selectedSubject, question_type: t.question_type })} className="text-[12px] bg-slate-50 px-3 py-1 rounded-md text-slate-600 hover:bg-blue-600 hover:text-white transition-all">去练习</button>
              </div>
            </div>

            {expandedType === t.question_type && (
              <div className="mt-3 pl-10 space-y-2">
                {t.knowledge.length === 0 ? <div className="text-slate-400 text-[13px]">暂无知识点</div> : (
                  t.knowledge.map(k => (
                    <div key={k.tag} className="flex justify-between items-center">
                      <div className="text-slate-600 text-[13px] truncate">{k.tag}</div>
                      <div className="flex items-center gap-2">
                        <div className="text-slate-400 text-[12px]">{k.cnt} 道</div>
                        <button onClick={() => handleNavigate({ subject: selectedSubject, question_type: t.question_type, tag: k.tag })} className="text-[12px] bg-slate-50 px-2 py-0.5 rounded-md text-slate-600 hover:bg-blue-600 hover:text-white transition-all">去练习</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-700 mb-3">科目 - 题型 - 知识点</h4>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button onClick={() => { window.location.href = '/api/export?format=json'; }} className="text-[12px] bg-slate-50 px-2 py-1 rounded-md text-slate-600 hover:bg-slate-100">导出 JSON</button>
            <button onClick={() => { window.location.href = '/api/export?format=csv'; }} className="text-[12px] bg-slate-50 px-2 py-1 rounded-md text-slate-600 hover:bg-slate-100">导出 CSV</button>
            <button onClick={() => { window.location.href = '/api/export?format=zip'; }} className="text-[12px] bg-slate-50 px-2 py-1 rounded-md text-slate-600 hover:bg-slate-100">下载 ZIP（含图）</button>
          </div>
          <label className="text-[12px] bg-slate-50 px-2 py-1 rounded-md text-slate-600 hover:bg-slate-100 cursor-pointer">
            导入
            <input type="file" accept="application/json,text/csv" onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = async () => {
                try {
                  const ct = file.type || (file.name.endsWith('.csv') ? 'text/csv' : 'application/json');
                  let body: BodyInit;
                  let headers: any = {};
                  if (ct === 'text/csv') {
                    body = reader.result as string;
                    headers['Content-Type'] = 'text/csv';
                  } else {
                    body = reader.result as string;
                    headers['Content-Type'] = 'application/json';
                  }
                  const res = await fetch('/api/import', { method: 'POST', headers, body });
                  const data = await res.json();
                  if (res.ok && data.success) {
                    alert('导入成功: ' + (data.count || 0));
                    location.reload();
                  } else {
                    alert('导入失败: ' + (data.error || '未知错误'));
                  }
                } catch (err) {
                  console.error('import err', err);
                  alert('导入异常，请查看控制台');
                }
              };
              reader.readAsText(file);
            }} style={{ display: 'none' }} />
          </label>
        </div>
      </div>
      {subjectsArea}
      <div className="mt-3">
        {typesList()}
      </div>
    </div>
  );
}
