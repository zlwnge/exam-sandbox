'use client';

import React, { useState, useEffect } from 'react';
import { normalizeUploadPath } from '@/lib/url';
import { Plus, Trash2, X } from 'lucide-react';

interface RecordFormProps {
  onRecordAdded?: () => void;
  onRecordUpdated?: () => void;
  onClose: () => void;
  record?: any; // optional existing record for edit
}

export default function RecordForm({ onRecordAdded, onRecordUpdated, onClose, record }: RecordFormProps) {
  const [source, setSource] = useState('');
  // ⚡ 变更 1：科目默认为三大硬核体系之首“行测”
  const [subject, setSubject] = useState('行测');
  // ⚡ 变更 2：题型改写为开放文本框
  const [questionType, setQuestionType] = useState('');
  // ⚡ 变更 3：存储服务端吐出的该科目专属高频题型历史词典
  const [historySuggestions, setHistorySuggestions] = useState<string[]>([]);
  
  const [contentText, setContentText] = useState('');
  const [contentImage, setContentImage] = useState<string | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [userAnswerImage, setUserAnswerImage] = useState<string | null>(null);
  const [tags, setTags] = useState('');
  const [importance, setImportance] = useState(3);
  const [practiceDate, setPracticeDate] = useState('2026-05-28');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewImage, setReviewImage] = useState<string | null>(null);
   const [solutions, setSolutions] = useState([{ channel_name: '粉笔', solution_text: '', solution_image: null as string | null }]); 
   const [errors, setErrors] = useState<{ [key: string]: any }>({});

  // populate form when editing an existing record
  useEffect(() => {
    if (record) {
      setSource(record.source || '');
      setSubject(record.subject || '行测');
      setQuestionType(record.question_type || '');
      setContentText(record.content_text || '');
      setContentImage(record.content_image || null);
      setUserAnswer(record.user_answer || '');
      setUserAnswerImage(record.user_answer_image || null);
      setTags(record.tags || '');
      setImportance(record.importance ?? 3);
      setPracticeDate(record.practice_date || new Date().toISOString().split('T')[0]);
      setReviewNotes(record.review_notes || '');
      setReviewImage(record.review_image || null);
      if (Array.isArray(record.solutions) && record.solutions.length > 0) {
        setSolutions(record.solutions.map((s: any) => ({ channel_name: s.channel_name || '', solution_text: s.solution_text || '', solution_image: s.solution_image || null })));
      }
    }
  }, [record]);

  // 监听科目变更：实时联动拉取该科目名下的历史常用题型词典
  useEffect(() => {
    if (subject) {
      fetch(`/api/question-types?subject=${encodeURIComponent(subject)}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setHistorySuggestions(data.types);
          }
        })
        .catch(err => console.error('拉取动态题型记忆链失败:', err));
    }
  }, [subject]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setPracticeDate(today);
  }, []);

  const handlePasteCapture = (e: React.ClipboardEvent, target: 'content' | 'review' | 'userAnswer' | 'solution', solIndex?: number) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) {
              const dataUrl = event.target.result as string;
              if (target === 'content') setContentImage(dataUrl);
              if (target === 'review') setReviewImage(dataUrl);
              if (target === 'userAnswer') setUserAnswerImage(dataUrl);
              if (target === 'solution' && typeof solIndex === 'number') {
                const updated = [...solutions];
                updated[solIndex] = { ...updated[solIndex], solution_image: dataUrl };
                setSolutions(updated);
              }
            }
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const addChannelRow = () => {
    setSolutions([...solutions, { channel_name: '', solution_text: '', solution_image: null }]);
  };

  const removeChannelRow = (index: number) => {
    const updated = [...solutions];
    updated.splice(index, 1);
    setSolutions(updated);
  };

  const handleChannelChange = (index: number, field: 'channel_name' | 'solution_text', value: string) => {
    const updated = [...solutions];
    updated[index][field] = value;
    setSolutions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      source,
      subject,
      question_type: questionType.trim() || '未分类题型',
      content_text: contentText,
      content_image: contentImage,
      user_answer: userAnswer,
      user_answer_image: userAnswerImage,
      tags,
      importance: Number(importance),
      practice_date: practiceDate,
      review_notes: reviewNotes,
      review_image: reviewImage,
      solutions
    };
    const validationErrors: { [key: string]: any } = {};
    if (!source || !String(source).trim()) {
      validationErrors.source = '请填写题目来源';
    }
    if (!subject || !String(subject).trim()) {
      validationErrors.subject = '请选择所属科目';
    }
    if (!questionType || !String(questionType).trim()) {
      validationErrors.questionType = '请填写细分题型';
    }

    if (!contentText || !String(contentText).trim()) {
      if (!contentImage) validationErrors.content = '请提供题干文本或粘贴题干图片';
    }

    if (!userAnswer || !String(userAnswer).trim()) {
      if (!userAnswerImage) validationErrors.userAnswer = '请提供作答文本或粘贴作答图片';
    }

    // 复盘笔记：文本为空时图片也可视为已填写
    if (!reviewNotes || !String(reviewNotes).trim()) {
      if (!reviewImage) validationErrors.review = '请提供复盘笔记文本或粘贴复盘图片';
    }

    // validate solutions: each must have channel_name and (text or image)
    const solErrors: string[] = [];
    solutions.forEach((s, idx) => {
      const ch = (s.channel_name || '').toString().trim();
      const txt = (s.solution_text || '').toString().trim();
      const img = s.solution_image;
      if (!ch) solErrors[idx] = '请填写渠道来源';
      if (!txt && !img) solErrors[idx] = (solErrors[idx] ? solErrors[idx] + '，' : '') + '请填写参考答案或粘贴截图';
    });
    if (solErrors.length) validationErrors.solutions = solErrors;

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      // scroll to first error field? simple alert for now
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // decide create vs update
    let res;
    if (record && record.id) {
      const body = { id: record.id, ...payload };
      res = await fetch('/api/records', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } else {
      res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    const responseData = await res.json();
    if (res.ok && responseData.success) {
      if (record && record.id) {
        alert('✅ 档案已更新');
        onRecordUpdated && onRecordUpdated();
      } else {
        alert('📦 新档案已入库');
        onRecordAdded && onRecordAdded();
      }
      onClose();
    } else {
      alert(`❌ 操作失败: ${responseData.error || '服务器返回未知错误'}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto p-7 rounded-2xl border border-slate-200/80 shadow-2xl space-y-6 text-slate-700 relative animate-fadeIn scrollbar-hide">
        
        <button onClick={onClose} type="button" className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-all">
          <X className="w-5 h-5" />
        </button>

        <div className="border-b pb-4 pr-10">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            📝 考公题库精细化档案录入
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            100% 物理单机私有环境。支持多机构解题思路博弈对照，集成题型时空记忆功能。
          </p >
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 第一行：元数据联动区块 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">题目来源</label>
              <input type="text" placeholder="如: 2026年国考省级行测" value={source} onChange={(e) => setSource(e.target.value)}
                     className="w-full border border-slate-200 p-2.5 rounded-xl text-xs outline-none focus:border-blue-500 bg-slate-50/50 transition-all" required />
            </div>
            
            {/* ⚡ 优化：所属科目固化为高级下拉框 */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">所属科目</label>
              <select value={subject} onChange={(e) => setSubject(e.target.value)}
                      className="w-full border border-slate-200 p-2.5 rounded-xl text-xs bg-white outline-none focus:border-blue-500 transition-all" required>
                <option value="行测">行测</option>
                <option value="申论">申论</option>
                <option value="面试">面试</option>
              </select>
            </div>

            {/* ⚡ 优化：题型全面改写为开放输入+历史推荐数据流总线 */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                细分题型 <span className="text-[10px] text-blue-500 font-normal">(支持无限自由扩充)</span>
              </label>
              <input type="text" placeholder="可自由录入或从下方历史记忆中点选" value={questionType} onChange={(e) => setQuestionType(e.target.value)}
                     list="history-qtypes-datalist" // 绑定数据源指引
                     className="w-full border border-slate-200 p-2.5 rounded-xl text-xs outline-none focus:border-blue-500 bg-slate-50/50 transition-all" required />
              
              {/* HTML5 原生高性能记忆容器，在用户点击或输入时自动弹窗匹配 */}
              <datalist id="history-qtypes-datalist">
                {historySuggestions.map((typeString, i) => (
                  <option key={i} value={typeString} />
                ))}
              </datalist>
            </div>
          </div>

          {/* 第二行：原始题干正文框 */}
          <div className="border border-slate-200 rounded-2xl p-4 space-y-2">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-slate-700">原始题干正文</span>
              <span className="text-blue-500 font-normal text-[11px]">可在下方区域直接用 Ctrl+V 粘贴错题截图</span>
            </div>
            <div className="relative">
              <textarea onPaste={(e) => handlePasteCapture(e, 'content')}
                        placeholder="请输入题目文本内容，支持长材料，也可直接粘贴屏幕截图文件..."
                        value={contentText} onChange={(e) => setContentText(e.target.value)} rows={4}
                        className="w-full text-xs outline-none resize-none leading-relaxed text-slate-600" />
              {errors.content && <div className="text-red-500 text-xs mt-1">{errors.content}</div>}
              {contentImage && (
                <div className="mt-2 relative inline-block border rounded-lg overflow-hidden bg-slate-50">
                  <img src={normalizeUploadPath(contentImage)} alt="题干截图" className="max-h-24 object-contain" />
                  <button type="button" onClick={() => setContentImage(null)} className="absolute top-0 right-0 bg-red-500 text-white text-[9px] px-1 rounded-bl">静态擦除</button>
                </div>
              )}
            </div>
          </div>

          {/* 第三行：高亮全真作答记录框 */}
          <div className="border border-red-200 bg-red-50/10 rounded-2xl p-4 space-y-2">
            <div className="text-xs font-bold text-red-600 flex items-center gap-1">
              ❌ 你的作答记录内容
            </div>
            <textarea onPaste={(e) => handlePasteCapture(e, 'userAnswer')}
                      placeholder="输入你当时的作答选项或申论草稿推演大段文字，或直接粘贴截图..."
                      value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} rows={3}
                      className="w-full text-xs bg-transparent outline-none resize-none leading-relaxed text-slate-600" />
            {errors.userAnswer && <div className="text-red-500 text-xs mt-1">{errors.userAnswer}</div>}
            {userAnswerImage && (
              <div className="mt-2 relative inline-block border rounded-lg overflow-hidden bg-slate-50">
                <img src={normalizeUploadPath(userAnswerImage)} alt="作答截图" className="max-h-24 object-contain" />
                <button type="button" onClick={() => setUserAnswerImage(null)} className="absolute top-0 right-0 bg-red-500 text-white text-[9px] px-1 rounded-bl">移除</button>
              </div>
            )}
          </div>

          {/* 第四行：多渠道对照 */}
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
                    <textarea onPaste={(e) => handlePasteCapture(e, 'solution', idx)}
                              placeholder="参考答案 或 核心解题思路，支持粘贴截图"
                              value={sol.solution_text} onChange={(e) => handleChannelChange(idx, 'solution_text', e.target.value)}
                              className="w-full border-b border-slate-200 py-1.5 text-xs outline-none bg-transparent focus:border-blue-500 resize-none" rows={2} />
                    {errors.solutions && errors.solutions[idx] && <div className="text-red-500 text-xs mt-1">{errors.solutions[idx]}</div>}
                    {sol.solution_image && (
                      <div className="mt-2 relative inline-block border rounded-lg overflow-hidden bg-slate-50">
                        <img src={normalizeUploadPath(sol.solution_image)} alt={`渠道${idx}截图`} className="max-h-24 object-contain" />
                        <button type="button" onClick={() => {
                          const updated = [...solutions];
                          updated[idx] = { ...updated[idx], solution_image: null };
                          setSolutions(updated);
                        }} className="absolute top-0 right-0 bg-red-500 text-white text-[9px] px-1 rounded-bl">移除</button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <input type="text" placeholder="渠道来源(如:粉笔)" value={sol.channel_name} onChange={(e) => handleChannelChange(idx, 'channel_name', e.target.value)}
                           className="w-full border border-slate-200 p-1.5 rounded-lg text-xs outline-none bg-white text-center focus:border-blue-500" required />
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

          {/* 第五行：属性快照 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-slate-100 p-4 rounded-2xl bg-slate-50/40">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">知识点标签快照 <span className="text-[10px] text-slate-400 font-normal">(用逗号或、分隔)</span></label>
              <input type="text" placeholder="如: 增长率、资料分析 或 增长率, 资料分析" value={tags} onChange={(e) => setTags(e.target.value)}
                     className="w-full border border-slate-200 p-2 rounded-xl text-xs outline-none bg-white focus:border-blue-500" required />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">核心考点重要程度 (1-5 星级)</label>
              <input type="number" min={1} max={5} value={importance} onChange={(e) => setImportance(Number(e.target.value))}
                     className="w-full border border-slate-200 p-2 rounded-xl text-xs outline-none bg-white font-mono text-center focus:border-blue-500" required />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">演练做题日期</label>
              <input type="date" value={practiceDate} onChange={(e) => setPracticeDate(e.target.value)}
                     className="w-full border border-slate-200 p-2 rounded-xl text-xs outline-none bg-white font-mono focus:border-blue-500" required />
            </div>
          </div>

          {/* 第六行：图文全维笔记舱 */}
          <div className="border border-amber-200 bg-amber-50/10 rounded-2xl p-4 space-y-2">
            <div className="flex justify-between items-center text-xs font-bold text-amber-700">
              <span>💡 核心复盘笔记 / 心得 / 金句总结</span>
              <span className="text-[11px] font-normal text-amber-600">同样支持直接在这个框 Ctrl+V 粘贴脑图或公式截图</span>
            </div>
            <div className="relative">
              <textarea onPaste={(e) => handlePasteCapture(e, 'review')}
                        placeholder="记录解题思维导图、公式秒杀技巧、踩坑归纳或高级申论全句范文..."
                        value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} rows={4}
                        className={`w-full text-xs bg-transparent outline-none resize-none leading-relaxed text-slate-600 focus:ring-0 ${errors.review ? 'border border-red-300 bg-red-50' : ''}`} />
              {errors.review && <div className="text-red-500 text-xs mt-1">{errors.review}</div>}
              {reviewImage && (
                <div className="mt-2 relative inline-block border border-amber-200 rounded-lg overflow-hidden bg-white">
                  <img src={normalizeUploadPath(reviewImage)} alt="复盘动态思维导图" className="max-h-36 object-contain" />
                  <button type="button" onClick={() => setReviewImage(null)} className="absolute top-0 right-0 bg-red-500 text-white text-[9px] px-1 rounded-bl">静态解构</button>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} type="button" className="border border-slate-200 text-slate-500 px-5 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all">
              取消并返回列表
            </button>
            <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-md">
              确认归档入库
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}