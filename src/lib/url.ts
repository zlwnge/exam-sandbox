export function normalizeUploadPath(p?: string | null) {
  if (!p) return p || '';
  if (typeof p !== 'string') return String(p);
  if (p.startsWith('/api/uploads/')) return p;
  if (p.startsWith('/uploads/')) return `/api/uploads/${p.replace(/^\/uploads\//, '')}`;
  return p;
}

export default normalizeUploadPath;
