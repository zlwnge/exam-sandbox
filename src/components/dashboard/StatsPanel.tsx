'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { StatsService, SubjectHierarchy } from '@/services/StatsService';
import { ExportService } from '@/services/ExportService';

type KnowledgeRow = { tag: string; cnt: number };
type TypeRow = { question_type: string; cnt: number; knowledge: KnowledgeRow[] };

export default function StatsPanel() {
  const { navigateToRepository, triggerRefresh } = useApp();
  const [loading, setLoading] = useState(true);
  const [hierarchy, setHierarchy] = useState<SubjectHierarchy[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [expandedType, setExpandedType] = useState<string | null>(null);
  const selectedSubjectRef = useRef(selectedSubject);
  selectedSubjectRef.current = selectedSubject;

  const applyHierarchy = useCallback((newHierarchy: SubjectHierarchy[], isInitialLoad: boolean) => {
    setHierarchy(newHierarchy);
    if (newHierarchy.length > 0) {
      const currentSubject = selectedSubjectRef.current;
      const exists = newHierarchy.some(s => s.subject === currentSubject);
      if (!exists || isInitialLoad) {
        setSelectedSubject(newHierarchy[0].subject);
      }
    }
  }, []);

  const refreshStats = useCallback(() => {
    StatsService.getHierarchy()
      .then(h => applyHierarchy(h, false))
      .catch(err => console.error('[StatsPanel] Refresh failed:', err));
  }, [applyHierarchy]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    StatsService.getHierarchy()
      .then(h => { if (mounted) applyHierarchy(h, true); })
      .catch(err => console.error('[StatsPanel] Initial fetch failed:', err))
      .finally(() => { if (mounted) setLoading(false); });

    // SSE subscription
    let es: EventSource | null = null;
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let pollCheckTimeout: ReturnType<typeof setTimeout> | null = null;
    let sseConnected = false;

    try {
      es = new EventSource('/api/records/stream');
      es.onopen = () => { sseConnected = true; };
      es.onmessage = () => { if (mounted) refreshStats(); };
      es.onerror = () => {
        console.error('[StatsPanel] SSE connection error, will retry automatically');
        sseConnected = false;
      };
      pollCheckTimeout = setTimeout(() => {
        if (mounted && !sseConnected) {
          console.warn('[StatsPanel] SSE not connected, falling back to polling');
          pollInterval = setInterval(() => { if (mounted) refreshStats(); }, 30000);
        }
      }, 10000);
    } catch (e) {
      console.error('[StatsPanel] EventSource init failed:', e);
    }

    return () => {
      mounted = false;
      if (es) es.close();
      if (pollCheckTimeout) clearTimeout(pollCheckTimeout);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNavigate = (payload: { subject?: string; question_type?: string; tag?: string }) => {
    navigateToRepository(payload);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await ExportService.importFile(file);
      alert(`导入成功: ${result.inserted} 条新增，${result.skipped} 条跳过`);
      triggerRefresh();
    } catch (err: any) {
      console.error('import err', err);
      alert('导入异常: ' + (err.message || '未知错误'));
    }
    e.target.value = '';
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h4 className="text-xs font-bold text-slate-700 mb-3">科目 - 题型 - 知识点</h4>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <button onClick={() => ExportService.downloadJson()} className="text-[12px] bg-slate-50 px-2 py-1 rounded-md text-slate-600 hover:bg-slate-100 min-h-[36px]">导出 JSON</button>
            <button onClick={() => ExportService.downloadCsv()} className="text-[12px] bg-slate-50 px-2 py-1 rounded-md text-slate-600 hover:bg-slate-100 min-h-[36px]">导出 CSV</button>
            <button onClick={() => ExportService.downloadZip()} className="text-[12px] bg-slate-50 px-2 py-1 rounded-md text-slate-600 hover:bg-slate-100 min-h-[36px]">下载 ZIP（含图）</button>
          </div>
          <label className="text-[12px] bg-slate-50 px-2 py-1 rounded-md text-slate-600 hover:bg-slate-100 cursor-pointer min-h-[36px] flex items-center">
            导入
            <input type="file" accept="application/json,text/csv" onChange={handleImport} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {/* Subject tabs */}
      <div className="flex items-center gap-2 overflow-auto pb-1">
        {loading ? <div className="text-slate-400 text-xs">加载中...</div> : (
          hierarchy.map((s) => (
            <button key={s.subject} onClick={() => { setSelectedSubject(s.subject); setExpandedType(null); }}
              className={`px-3 py-1 rounded-full text-[12px] font-medium min-h-[32px] ${selectedSubject === s.subject ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
              {s.subject} · {s.cnt}
            </button>
          ))
        )}
      </div>

      <div className="mt-3">
        {loading ? <div className="text-slate-400">加载中...</div> : (() => {
          const sub = hierarchy.find(h => h.subject === selectedSubject);
          if (!sub) return <div className="text-slate-400">未找到题型</div>;

          return (
            <div className="space-y-2">
              {sub.types.map((t) => (
                <div key={t.question_type} className="border border-slate-100 rounded-lg p-3 bg-white">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setExpandedType(expandedType === t.question_type ? null : t.question_type)} className="p-1 rounded-md text-slate-500 hover:bg-slate-50 min-h-[36px] min-w-[36px] flex items-center justify-center">
                        {expandedType === t.question_type ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      <div className="text-sm font-medium text-slate-700">{t.question_type}</div>
                      <div className="text-[12px] text-slate-400">{t.cnt} 道</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleNavigate({ subject: selectedSubject, question_type: t.question_type })} className="text-[12px] bg-slate-50 px-3 py-1 rounded-md text-slate-600 hover:bg-blue-600 hover:text-white transition-all min-h-[32px]">去练习</button>
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
                              <button onClick={() => handleNavigate({ subject: selectedSubject, question_type: t.question_type, tag: k.tag })} className="text-[12px] bg-slate-50 px-2 py-0.5 rounded-md text-slate-600 hover:bg-blue-600 hover:text-white transition-all min-h-[32px]">去练习</button>
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
        })()}
      </div>
    </div>
  );
}
