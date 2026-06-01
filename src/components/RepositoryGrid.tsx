'use client';

import React, { useState, useEffect } from 'react';
import { normalizeUploadPath } from '@/lib/url';
import { Search, Eye, Star, Tag, Calendar, X, BookOpen, Layers } from 'lucide-react';
import RecordForm from './RecordForm';

interface Solution {
  id: string;
  channel_name: string;
  solution_text: string;
  solution_image?: string | null;
}

interface StudyRecord {
  id: string;
  source: string;
  subject: string;
  question_type: string;
  content_text: string;
  content_image: string | null;
  user_answer: string;
  user_answer_image?: string | null;
  tags: string;
  importance: number;
  practice_date: string;
  review_notes: string;
  review_image: string | null;
  created_at: string;
  solutions: Solution[];
}

export default function RepositoryGrid({ initialFilters }: { initialFilters?: { subject?: string; question_type?: string; tag?: string; autoRun?: boolean } } = {}) {
  const [records, setRecords] = useState<StudyRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // 综合联动筛选状态
  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [dynamicTypes, setDynamicTypes] = useState<string[]>([]);

  // 查看详情弹窗控制
  const [activeRecord, setActiveRecord] = useState<StudyRecord | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);

  // Track auto-run state with a ref (avoids fragile multi-useEffect cascade)
  const autoRunRef = React.useRef(false);
  const desiredTypeRef = React.useRef<string | null>(null);

  // 联动管道：监听科目变更，实时更新题型选单字典
  useEffect(() => {
    fetch(`/api/question-types?subject=${encodeURIComponent(selectedSubject)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setDynamicTypes(data.types);
          if (desiredTypeRef.current) {
            if (data.types.includes(desiredTypeRef.current)) {
              setSelectedType(desiredTypeRef.current);
            }
            desiredTypeRef.current = null;
          }
        }
      })
      .catch((err) => console.error('读取联动筛选字典失败:', err));
  }, [selectedSubject]);

  // 核心数据检索 — accepts optional explicit filters to avoid stale closure issues
  const fetchRecords = async (explicitFilters?: { search?: string; subject?: string; question_type?: string; tag?: string }) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const s = explicitFilters?.search ?? search;
      const sub = explicitFilters?.subject ?? selectedSubject;
      const qt = explicitFilters?.question_type ?? selectedType;
      const tg = explicitFilters?.tag ?? selectedTag;
      if (s) params.append('search', s);
      if (sub) params.append('subject', sub);
      if (qt) params.append('question_type', qt);
      if (tg) params.append('tag', tg);

      const res = await fetch(`/api/records?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setRecords(data.records);
      }
    } catch (err) {
      console.error('抓取档案资产流失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // Apply initialFilters once on mount / when they change
  useEffect(() => {
    if (initialFilters && Object.keys(initialFilters).length > 0) {
      autoRunRef.current = false;
      if (initialFilters.subject) setSelectedSubject(initialFilters.subject);
      if (initialFilters.question_type) {
        desiredTypeRef.current = initialFilters.question_type;
        setSelectedType(initialFilters.question_type); // set directly for immediate UI feedback
      }
      if (initialFilters.tag) {
        setSelectedTag(initialFilters.tag);
        setSearch(initialFilters.tag); // 填入搜索框，用户可见
      }
      // Use explicit filters to bypass stale state closure — all filter values
      // are passed directly from initialFilters, not read from React state.
      fetchRecords({
        subject: initialFilters.subject || '',
        question_type: initialFilters.question_type || '',
        tag: initialFilters.tag || ''
      });
      autoRunRef.current = true;
    } else {
      // No filters — reset and show all
      setSearch('');
      setSelectedSubject('');
      setSelectedType('');
      setSelectedTag('');
      autoRunRef.current = false;
      fetchRecords();
    }
  }, [initialFilters]);

  const renderStars = (num: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star key={i} className={`w-3 h-3 ${i < num ? 'text-amber-500 fill-amber-500' : 'text-slate-200'}`} />
    ));
  };

  const parseTags = (tagStr: string) => {
    if (!tagStr) return [];
    return tagStr.split(/[,，、]/).map(t => t.trim()).filter(Boolean);
  };

  return (
    <div className="space-y-5">
      {/* 综合联动筛选舱 */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col md:flex-row gap-3 items-center shadow-xs">
        <div className="relative w-full md:flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input type="text" placeholder="全局深搜：输入题干关键词、多源考点、标签或心得..." value={search} onChange={(e) => setSearch(e.target.value)}
                 onKeyDown={(e) => { if (e.key === 'Enter') fetchRecords(); }}
                 className="w-full bg-slate-50/50 pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200/80 outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-700" />
        </div>

        <div className="w-full md:w-44">
          <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full bg-white px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-blue-500 transition-all text-slate-700 font-medium">
            <option value="">📂 全部硬核科目</option>
            <option value="行测">📊 行测体系</option>
            <option value="申论">✍️ 申论大局</option>
            <option value="面试">🗣️ 面试战术</option>
          </select>
        </div>

        <div className="w-full md:w-48">
          <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full bg-white px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-blue-500 transition-all text-slate-700">
            <option value="">⚡ 全部细分题型 ({dynamicTypes.length})</option>
            {dynamicTypes.map((t, idx) => (
              <option key={idx} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="w-full md:w-44 flex items-center justify-end">
          <button onClick={() => fetchRecords()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md active:scale-95">查询</button>
        </div>
      </div>

      {/* 核心高聚合方块矩阵 */}
      {loading ? (
        <div className="text-center py-12 text-xs text-slate-400 font-mono tracking-widest animate-pulse">
          ⚡ LOADING ASSETS DATABASE...
        </div>
      ) : records.length === 0 ? (
        <div className="bg-white border border-dashed rounded-2xl py-16 text-center text-xs text-slate-400 space-y-2">
          <p>📭 沙箱检索空域，未能捕获对应的题目切片。</p >
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {records.map((record) => (
            <div key={record.id} className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between hover:shadow-lg hover:border-slate-300 transition-all group relative overflow-hidden">
              <div className="space-y-1.5 mb-3">
                <div className="flex justify-between items-center">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                    record.subject === '行测' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                    record.subject === '申论' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                    'bg-amber-50 text-amber-700 border border-amber-100'
                  }`}>
                    {record.subject} · {record.question_type}
                  </span>
                  <div className="flex gap-0.5">{renderStars(record.importance)}</div>
                </div>
                <p className="text-[10px] text-slate-400 font-medium truncate" title={record.source}>
                  📍 {record.source || '未标记真题来源'}
                </p >
              </div>

              <div className="flex-1 min-h-[50px] mb-4">
                <p className="text-xs text-slate-600 font-medium leading-relaxed break-all line-clamp-3">
                  {record.content_text}
                </p >
              </div>

              <div className="border-t border-slate-100 pt-3 mt-auto space-y-2.5">
                <div className="flex flex-wrap gap-1 max-h-[18px] overflow-hidden">
                  {parseTags(record.tags).map((tag, i) => (
                    <span key={i} className="bg-slate-50 text-slate-500 border border-slate-100 text-[9px] px-1.5 py-0.5 rounded-sm flex items-center gap-0.5">
                      <Tag className="w-2 h-2" /> {tag}
                    </span>
                  ))}
                </div>

                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400 font-mono flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {record.practice_date}
                  </span>
                  <button onClick={() => setActiveRecord(record)} className="bg-slate-50 group-hover:bg-blue-600 text-slate-600 group-hover:text-white px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 text-[11px] border border-slate-200/60 group-hover:border-transparent transition-all shadow-2xs active:scale-95">
                    <Eye className="w-3.5 h-3.5" /> 查看档案
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ⚡ 优化重点：沉浸式多维解构透视舱（重构为：固定双端 + 独立中央滚动区） */}
      {activeRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-fadeIn">
          
          {/* 主窗体：严格锁死大轮廓高度为当前视窗的 80%，采用 flex 纵向拦截，内部组件严禁溢出 */}
          <div className="bg-white w-full max-w-5xl h-[80vh] flex flex-col rounded-2xl border border-slate-200/80 shadow-2xl overflow-hidden text-slate-700">
            
            {/* 👑 头部固定座 (Header) - 始终静止，关闭按钮雷打不动 */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/60 shrink-0 flex items-center justify-between relative">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-[11px] font-black rounded-md ${
                    activeRecord.subject === '行测' ? 'bg-blue-600 text-white' :
                    activeRecord.subject === '申论' ? 'bg-purple-600 text-white' :
                    'bg-amber-600 text-white'
                  }`}>
                    {activeRecord.subject}体系
                  </span>
                  <span className="px-2 py-0.5 bg-white border border-slate-200 text-slate-600 rounded-md text-[11px] font-bold shadow-2xs">
                    {activeRecord.question_type}
                  </span>
                  <div className="flex ml-1">{renderStars(activeRecord.importance)}</div>
                </div>
                <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  📍 真题物理源头: <span className="text-blue-600 font-semibold">{activeRecord.source}</span>
                </h3>
              </div>

              {/* 核心改动：关闭按钮绑定在固定非滚动头部，支持随时秒级安全退出 */}
              <button onClick={() => setActiveRecord(null)} className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-200/50 transition-all border border-transparent hover:border-slate-200 shadow-2xs" title="安全退出档案">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 👑 独立中央滚动身躯 (Body) - 彻底移除限制，恢复原生舒适的滚动条 */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white scrollbar-thin scrollbar-thumb-slate-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                
                {/* 左舷：原始题干与考场错因残骸 */}
                <div className="space-y-4">
                  {/* 原始全量题干 */}
                  <div className="border border-slate-200/80 rounded-xl p-4 bg-slate-50/30 space-y-2">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1 border-b border-slate-100 pb-1.5">
                      📝 原始全量题干材料
                    </h4>
                    <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed select-text font-normal">
                      {activeRecord.content_text}
                    </p >
                    {activeRecord.content_image && (
                      <div className="mt-3 border rounded-lg overflow-hidden bg-white shadow-2xs">
                        <img src={normalizeUploadPath(activeRecord.content_image)} alt="题干截图" className="max-h-64 w-full object-contain mx-auto" />
                      </div>
                    )}
                  </div>

                  {/* 考场留痕 */}
                  <div className="border border-red-200 rounded-xl p-4 bg-red-50/5 space-y-1.5">
                    <h4 className="text-xs font-bold text-red-600 flex items-center gap-1 border-b border-red-100 pb-1.5">
                      ❌ 考场错因现场留痕
                    </h4>
                    <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed select-text font-mono bg-white p-3 rounded-lg border border-red-100/60 shadow-2xs">
                      {activeRecord.user_answer}
                    </p >
                    {activeRecord.user_answer_image && (
                      <div className="mt-2 border rounded-lg overflow-hidden bg-white">
                        <img src={normalizeUploadPath(activeRecord.user_answer_image)} alt="作答截图" className="max-h-48 w-full object-contain mx-auto" />
                      </div>
                    )}
                  </div>
                </div>

                {/* 右舷：高频博弈解析与复盘方法论 */}
                <div className="space-y-4">
                  {/* 多源解法对照 */}
                  <div className="border border-blue-100 bg-blue-50/5 rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1 border-b border-blue-100/60 pb-1.5">
                      🔮 各家机构解题思路横向博弈
                    </h4>
                    <div className="space-y-3">
                      {activeRecord.solutions && activeRecord.solutions.length > 0 ? (
                        activeRecord.solutions.map((sol) => (
                          <div key={sol.id} className="bg-white border border-slate-100 p-3 rounded-lg space-y-1.5 shadow-2xs">
                            <div className="flex">
                              <span className="text-[9px] font-black tracking-wide px-2 py-0.5 bg-slate-900 text-white rounded-md uppercase">
                                {sol.channel_name}
                              </span>
                            </div>
                                <p className="text-xs text-slate-600 leading-relaxed font-normal select-text">
                                  {sol.solution_text}
                                </p >
                                {sol.solution_image && (
                                  <div className="mt-2 border rounded-lg overflow-hidden bg-white">
                                    <img src={normalizeUploadPath(sol.solution_image)} alt={`${sol.channel_name} 截图`} className="max-h-56 w-full object-contain mx-auto" />
                                  </div>
                                )}
                          </div>
                        ))
                      ) : (
                        <p className="text-[11px] text-slate-400 italic py-2">暂未录入任何对比机构解析</p >
                      )}
                    </div>
                  </div>

                  {/* 复盘心法 */}
                  <div className="border border-amber-200 bg-amber-50/10 rounded-xl p-4 space-y-2">
                    <h4 className="text-xs font-bold text-amber-800 flex items-center gap-1 border-b border-amber-200/60 pb-1.5">
                      💡 终极破题心法与金句收纳
                    </h4>
                    <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed select-text font-medium">
                      {activeRecord.review_notes || '未留下任何复盘总结'}
                    </p >
                    {activeRecord.review_image && (
                      <div className="mt-2 border border-amber-100 rounded-lg overflow-hidden bg-white shadow-2xs">
                        <img src={normalizeUploadPath(activeRecord.review_image)} alt="复盘切图" className="max-h-56 w-full object-contain mx-auto" />
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* 👑 底部固定防框 (Footer) - 常驻视窗下沿，提供二次逃逸按钮 */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/80 shrink-0 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-400">
              <div className="flex flex-wrap gap-1">
                {parseTags(activeRecord.tags).map((tag, i) => (
                  <span key={i} className="bg-white border border-slate-200 text-slate-500 text-[10px] px-2 py-0.5 rounded-md font-medium shadow-2xs">
                    #{tag}
                  </span>
                ))}
              </div>
                <div className="flex items-center gap-4">
                <span className="font-mono text-[11px] text-slate-400">
                  演练时刻: {activeRecord.practice_date}
                </span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowEditForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-xl font-bold text-[11px] transition-all shadow-md active:scale-95">
                    编辑档案
                  </button>
                  <button onClick={async () => {
                    const ok = confirm('确认删除该档案？删除后无法恢复。');
                    if (!ok) return;
                    try {
                      const res = await fetch('/api/records', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: activeRecord.id })
                      });
                      const data = await res.json();
                      if (res.ok && data.success) {
                        alert('🗑️ 档案已删除');
                        setActiveRecord(null);
                        fetchRecords();
                      } else {
                        alert('删除失败: ' + (data.error || '未知错误'));
                      }
                    } catch (err) {
                      console.error('删除请求失败', err);
                      alert('删除请求失败，请查看控制台');
                    }
                  }} className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-xl font-bold text-[11px] transition-all shadow-md active:scale-95">
                    删除档案
                  </button>
                  <button onClick={() => setActiveRecord(null)} className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-1.5 rounded-xl font-bold text-[11px] transition-all shadow-md active:scale-95">
                    结束并关闭档案
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
      {showEditForm && activeRecord && (
        <RecordForm
          record={activeRecord}
          onRecordUpdated={() => {
            fetchRecords();
            setShowEditForm(false);
            setActiveRecord(null);
          }}
          onClose={() => setShowEditForm(false)}
        />
      )}
    </div>
  );
}