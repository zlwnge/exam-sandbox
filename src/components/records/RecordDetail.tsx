'use client';

import React from 'react';
import { normalizeUploadPath } from '@/lib/url';
import { getSubjectStyle } from '@/types/subject';
import { StudyRecord } from '@/types/record';
import Modal from '@/components/ui/Modal';
import { Eye, Star, Tag } from 'lucide-react';

interface RecordDetailProps {
  record: StudyRecord;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function parseTags(tagStr: string): string[] {
  if (!tagStr) return [];
  return tagStr.split(/[,，、]/).map(t => t.trim()).filter(Boolean);
}

function renderStars(num: number) {
  return Array.from({ length: 5 }).map((_, i) => (
    <Star key={i} className={`w-3 h-3 ${i < num ? 'text-amber-500 fill-amber-500' : 'text-slate-200'}`} />
  ));
}

export default function RecordDetail({ record, open, onClose, onEdit, onDelete }: RecordDetailProps) {
  const style = getSubjectStyle(record.subject);

  const handleDelete = async () => {
    const ok = confirm('确认删除该档案？删除后无法恢复。');
    if (!ok) return;
    onDelete();
  };

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-5xl">
      <div className="flex flex-col h-[80vh] max-md:h-[100dvh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/60 shrink-0">
          <div className="space-y-1 pr-10">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 text-[11px] font-black rounded-md ${style.solidBg} text-white`}>
                {record.subject}体系
              </span>
              <span className="px-2 py-0.5 bg-white border border-slate-200 text-slate-600 rounded-md text-[11px] font-bold shadow-2xs">
                {record.question_type}
              </span>
              <div className="flex ml-1">{renderStars(record.importance)}</div>
            </div>
            <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1">
              📍 真题物理源头: <span className="text-blue-600 font-semibold">{record.source}</span>
            </h3>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Left: question + user answer */}
            <div className="space-y-4">
              <div className="border border-slate-200/80 rounded-xl p-4 bg-slate-50/30 space-y-2">
                <h4 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-1.5">
                  📝 原始全量题干材料
                </h4>
                <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed select-text font-normal">
                  {record.content_text}
                </p>
                {record.content_image && (
                  <div className="mt-3 border rounded-lg overflow-hidden bg-white shadow-2xs">
                    <img src={normalizeUploadPath(record.content_image)} alt="题干截图" className="max-h-64 w-full object-contain mx-auto" />
                  </div>
                )}
              </div>

              <div className="border border-red-200 rounded-xl p-4 bg-red-50/5 space-y-1.5">
                <h4 className="text-xs font-bold text-red-600 border-b border-red-100 pb-1.5">
                  ❌ 考场错因现场留痕
                </h4>
                <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed select-text font-mono bg-white p-3 rounded-lg border border-red-100/60 shadow-2xs">
                  {record.user_answer}
                </p>
                {record.user_answer_image && (
                  <div className="mt-2 border rounded-lg overflow-hidden bg-white">
                    <img src={normalizeUploadPath(record.user_answer_image)} alt="作答截图" className="max-h-48 w-full object-contain mx-auto" />
                  </div>
                )}
              </div>
            </div>

            {/* Right: solutions + review */}
            <div className="space-y-4">
              <div className="border border-blue-100 bg-blue-50/5 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 border-b border-blue-100/60 pb-1.5">
                  🔮 各家机构解题思路横向博弈
                </h4>
                <div className="space-y-3">
                  {record.solutions && record.solutions.length > 0 ? (
                    record.solutions.map((sol) => (
                      <div key={sol.id || sol.channel_name} className="bg-white border border-slate-100 p-3 rounded-lg space-y-1.5 shadow-2xs">
                        <div className="flex">
                          <span className="text-[9px] font-black tracking-wide px-2 py-0.5 bg-slate-900 text-white rounded-md uppercase">
                            {sol.channel_name}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed font-normal select-text">
                          {sol.solution_text}
                        </p>
                        {sol.solution_image && (
                          <div className="mt-2 border rounded-lg overflow-hidden bg-white">
                            <img src={normalizeUploadPath(sol.solution_image)} alt={`${sol.channel_name} 截图`} className="max-h-56 w-full object-contain mx-auto" />
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-slate-400 italic py-2">暂未录入任何对比机构解析</p>
                  )}
                </div>
              </div>

              <div className="border border-amber-200 bg-amber-50/10 rounded-xl p-4 space-y-2">
                <h4 className="text-xs font-bold text-amber-800 border-b border-amber-200/60 pb-1.5">
                  💡 终极破题心法与金句收纳
                </h4>
                <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed select-text font-medium">
                  {record.review_notes || '未留下任何复盘总结'}
                </p>
                {record.review_image && (
                  <div className="mt-2 border border-amber-100 rounded-lg overflow-hidden bg-white shadow-2xs">
                    <img src={normalizeUploadPath(record.review_image)} alt="复盘切图" className="max-h-56 w-full object-contain mx-auto" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 shrink-0 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-400">
          <div className="flex flex-wrap gap-1">
            {parseTags(record.tags).map((tag, i) => (
              <span key={i} className="bg-white border border-slate-200 text-slate-500 text-[10px] px-2 py-0.5 rounded-md font-medium shadow-2xs">
                #{tag}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-4 max-md:flex-col max-md:w-full">
            <span className="font-mono text-[11px] text-slate-400">
              演练时刻: {record.practice_date}
            </span>
            <div className="flex items-center gap-2 max-md:w-full max-md:justify-center">
              <button onClick={onEdit} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-xl font-bold text-[11px] transition-all shadow-md active:scale-95 min-h-[40px]">
                编辑档案
              </button>
              <button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-xl font-bold text-[11px] transition-all shadow-md active:scale-95 min-h-[40px]">
                删除档案
              </button>
              <button onClick={onClose} className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-1.5 rounded-xl font-bold text-[11px] transition-all shadow-md active:scale-95 min-h-[40px]">
                关闭
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
