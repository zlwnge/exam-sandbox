export const SUBJECTS = ['行测', '申论', '面试'] as const;
export type Subject = typeof SUBJECTS[number];

export interface SubjectStyle {
  bg: string;
  text: string;
  border: string;
  solidBg: string;
  label: string;
  icon: string;
}

export const SUBJECT_STYLES: Record<Subject, SubjectStyle> = {
  '行测': {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-100',
    solidBg: 'bg-blue-600',
    label: '行测体系',
    icon: '📊',
  },
  '申论': {
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    border: 'border-purple-100',
    solidBg: 'bg-purple-600',
    label: '申论大局',
    icon: '✍️',
  },
  '面试': {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-100',
    solidBg: 'bg-amber-600',
    label: '面试战术',
    icon: '🗣️',
  },
};

export function getSubjectStyle(subject: string): SubjectStyle {
  if (subject in SUBJECT_STYLES) return SUBJECT_STYLES[subject as Subject];
  return {
    bg: 'bg-slate-50',
    text: 'text-slate-600',
    border: 'border-slate-100',
    solidBg: 'bg-slate-600',
    label: subject,
    icon: '📂',
  };
}
