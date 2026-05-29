'use client';

import React, { useState, useEffect } from 'react';

export default function MainDashboard() {
  // 核心录入状态流
  const [category, setCategory] = useState<'行测' | '申论' | '面试'>('行测');
  const [path, setPath] = useState('');
  const [content, setContent] = useState('');
  const [imgBase64, setImgBase64] = useState<string | null>(null);
  const [thinking, setThinking] = useState('');
  const [eye, setEye] = useState('');
  const [mastery, setMastery] = useState<'存在盲区' | '路径冗长' | '完美掌握'>('存在盲区');
  const [duration, setDuration] = useState(0);
  const [breakdowns, setBreakdowns] = useState([{ source_name: '默认解析', steps: '' }]);

  // 看板与流数据状态
  const [records, setRecords] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>({ summary: [], paths: [] });
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadAllData();
  }, [search]);

  const loadAllData = async () => {
    const resRepo = await fetch(`/api/repository?search=${encodeURIComponent(search)}`);
    const dataRepo = await resRepo.json();
    if (dataRepo.success) setRecords(dataRepo.records);

    const resAnly = await fetch('/api/analytics');
    const dataAnly = await resAnly.json();
    if (dataAnly.success) setAnalytics(dataAnly);
  };

  // 核心高级交互：捕获系统剪贴板图片自动编码落库
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) setImgBase64(event.target.result as string);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      category, knowledge_path: path, content_text: content,
      image_url: imgBase64, my_thinking_path: thinking, core_eye: eye,
      mastery_level: mastery, duration, breakdowns
    };

    const res = await fetch('/api/repository', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      alert('🌟 成功打破结果论！思维方法论已记入本地大盘。');
      setContent(''); setPath(''); setThinking(''); setEye(''); setImgBase64(null);
      loadAllData();
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen space-y-8 text-slate-800">
      {/* 头部导航横栏 */}
      <div className="flex justify-between items-center border-b pb-4 border-slate-200">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">🎯 考公精细化方法论复盘沙箱</h1>
          <p className="text-xs text-slate-400 mt-1">基于 100% 本地 SQLite 单机物理隔离隔离环境</p >
        </div>
        <input 
          type="text" placeholder="🔍 瞬间穿透知识路径、破题眼、题干..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 border rounded-xl text-xs w-80 outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
        />
      </div>

      {/* 宏观冷热数据看板展示 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {analytics.summary.map((sum: any) => (
          <div key={sum.category} className="bg-white p-4 rounded-xl border shadow-sm space-y-2">
            <div className="flex justify-between items-center"><span className="text-sm font-bold">{sum.category} 大盘漏斗</span><span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500">累计 {sum.total_count} 模型</span></div>
            <div className="text-xs space-y-1 pt-1">
              <div className="flex justify-between"><span>🔴 思维盲区占比</span><span className="text-red-600 font-bold">{sum.blind_count} 题</span></div>
              <div className="flex justify-between"><span>🟡 耗时冗长黑洞</span><span className="text-amber-600 font-bold">{sum.long_path_count} 题</span></div>
              <div className="flex justify-between"><span>⏱️ 复盘总吞噬时间</span><span className="font-mono">{(sum.total_duration / 60).toFixed(1)} 分钟</span></div>
            </div>
          </div>
        ))}
      </div>

      {/* 下层核心区：左侧录入漏斗，右侧流水大盘 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        <form onSubmit={handleSubmit} className="lg:col-span-2 bg-white p-5 rounded-xl border shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b pb-2">录入新思维解构模型</h3>
          <div className="grid grid-cols-2 gap-2">
            <select value={category} onChange={(e) => setCategory(e.target.value as any)} className="border p-2 rounded-lg text-xs bg-slate-50 outline-none">
              <option value="行测">思维行测</option><option value="申论">结构申论</option><option value="面试">高分面试</option>
            </select>
            <input type="text" placeholder="多级知识点(如: 数量/工程问题)" value={path} onChange={(e) => setPath(e.target.value)} className="border p-2 rounded-lg text-xs outline-none" required />
          </div>
          <div>
            <textarea onPaste={handlePaste} placeholder="在此处输入或直接 Ctrl+V 粘贴截图组件（自动读取图层）..." value={content} onChange={(e) => setContent(e.target.value)} rows={3} className="w-full border p-2 rounded-lg text-xs outline-none" required />
            {imgBase64 && < img src={imgBase64} alt="附件预览" className="mt-2 max-h-24 rounded border" />}
          </div>
          <div className="grid grid-cols-1 gap-2">
            <textarea placeholder="🧠 还原高压环境下的第一错觉通路..." value={thinking} onChange={(e) => setThinking(e.target.value)} rows={2} className="border p-2 rounded-lg text-xs bg-amber-50/30 outline-none" />
            <textarea placeholder="👁️ 提炼秒杀公式或材料中的核心真破题眼..." value={eye} onChange={(e) => setEye(e.target.value)} rows={2} className="border p-2 rounded-lg text-xs bg-blue-50/30 outline-none" />
          </div>
          <div className="flex justify-between items-center gap-2">
            <select value={mastery} onChange={(e) => setMastery(e.target.value as any)} className="border p-2 rounded-lg text-xs bg-white outline-none">
              <option value="存在盲区">🔴 存在盲区 (核心卡点)</option><option value="路径冗长">🟡 路径冗长 (死做耗时)</option><option value="完美掌握">🟢 完美掌握 (直觉秒杀)</option>
            </select>
            <div className="text-xs">复盘耗时:<input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-14 border ml-1 p-1 rounded font-mono" />秒</div>
          </div>
          <div className="space-y-2 border-t pt-3">
            <span className="text-[11px] font-bold text-slate-400">⚔️ 横向多源解析解法博弈对比</span>
            <input type="text" placeholder="解析源名称 (如: 粉笔秒杀法)" value={breakdowns[0].source_name} onChange={(e) => setBreakdowns([{ ...breakdowns[0], source_name: e.target.value }])} className="w-full border p-1.5 rounded text-xs outline-none" required />
            <textarea placeholder="具体的推导逻辑、差异化关键步骤..." value={breakdowns[0].steps} onChange={(e) => setBreakdowns([{ ...breakdowns[0], steps: e.target.value }])} rows={2} className="w-full border p-1.5 rounded text-xs outline-none" required />
          </div>
          <button type="submit" className="w-full bg-slate-900 text-white p-2.5 rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors shadow">归档入本地大盘</button>
        </form>

        {/* 右侧：流水账大盘展示 */}
        <div className="lg:col-span-3 space-y-4">
          {records.map((r: any) => (
            <div key={r.id} className="bg-white p-4 rounded-xl border shadow-sm space-y-3">
              <div className="flex justify-between items-center border-b pb-2">
                <div className="flex items-center gap-2"><span className="bg-slate-900 text-white text-[10px] px-2 py-0.5 rounded font-bold">{r.category}</span><span className="text-xs font-bold">{r.knowledge_path}</span></div>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${r.mastery_level === '存在盲区' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{r.mastery_level}</span>
              </div>
              <p className="text-xs text-slate-700 whitespace-pre-wrap bg-slate-50 p-2 rounded border">{r.content_text}</p >
              {r.image_url && < img src={r.image_url} alt="附件" className="max-h-32 rounded border" />}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {r.my_thinking_path && <div className="p-2 bg-amber-50/40 border border-amber-100 rounded"><strong>⚠️ 本能直觉陷阱:</strong> {r.my_thinking_path}</div>}
                {r.core_eye && <div className="p-2 bg-blue-50/40 border border-blue-100 rounded"><strong>👁️ 核心破题真眼:</strong> {r.core_eye}</div>}
              </div>
              {r.breakdowns?.map((b: any, index: number) => (
                <div key={index} className="text-xs bg-slate-50/50 p-2 rounded border border-dashed flex gap-2">
                  <span className="font-bold text-blue-600 shrink-0">[{b.source_name}]</span>
                  <p className="text-slate-600">{b.steps}</p >
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}