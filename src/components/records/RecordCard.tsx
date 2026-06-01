'use client';

import React from 'react';
import { getSubjectStyle } from '@/types/subject';
import { StudyRecord } from '@/types/record';
import { Eye, Star, Tag, Calendar } from 'lucide-react';

interface RecordCardProps {
  record: StudyRecord;
  onView: (record: StudyRecord) => void;
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

export default function RecordCard({ record, onView }: RecordCardProps) {
  const style = getSubjectStyle(record.subject);

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between hover:shadow-lg hover:border-slate-300 transition-all group relative overflow-hidden">
      <div className="space-y-1.5 mb-3">
        <div className="flex justify-between items-center">
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${style.bg} ${style.text} ${style.border}`}>
            {record.subject} · {record.question_type}
          </span>
          <div className="flex gap-0.5">{renderStars(record.importance)}</div>
        </div>
        <p className="text-[10px] text-slate-400 font-medium truncate" title={record.source}>
          📍 {record.source || '未标记真题来源'}
        </p>
      </div>

      <div className="flex-1 min-h-[50px] mb-4">
        <p className="text-xs text-slate-600 font-medium leading-relaxed break-all line-clamp-3">
          {record.content_text}
        </p>
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
          <button
            onClick={() => onView(record)}
            className="bg-slate-50 group-hover:bg-blue-600 text-slate-600 group-hover:text-white px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 text-[11px] border border-slate-200/60 group-hover:border-transparent transition-all shadow-2xs active:scale-95 min-h-[36px]"
          >
            <Eye className="w-3.5 h-3.5" /> 查看档案
          </button>
        </div>
      </div>
    </div>
  );
}
