export const runtime = 'nodejs';

import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';

function getContentType(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.svg':
      return 'image/svg+xml';
    case '.mp4':
      return 'video/mp4';
    case '.webm':
      return 'video/webm';
    case '.pdf':
      return 'application/pdf';
    default:
      return 'application/octet-stream';
  }
}

export async function GET(request: Request, { params }: { params: { path?: string[] } }) {
  const parts = params?.path ?? [];
  if (!parts || parts.length === 0) return new Response('Not Found', { status: 404 });

  const uploadsRoot = path.join(process.cwd(), 'uploads');
  const rel = parts.join(path.sep);
  const filePath = path.resolve(uploadsRoot, rel);

  if (!filePath.startsWith(uploadsRoot)) return new Response('Forbidden', { status: 403 });

  try {
    const stat = await fs.promises.stat(filePath);
    if (!stat.isFile()) return new Response('Not Found', { status: 404 });

    const total = stat.size;
    const range = request.headers.get('range');
    const headers = new Headers();
    const contentType = getContentType(filePath) || 'application/octet-stream';
    headers.set('Content-Type', contentType);
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Cache-Control', 'public, max-age=0, s-maxage=60');

    if (range) {
      const m = range.match(/bytes=(\d*)-(\d*)/);
      if (!m) return new Response('Bad Request', { status: 416 });
      let start = m[1] ? parseInt(m[1], 10) : 0;
      let end = m[2] ? parseInt(m[2], 10) : total - 1;
      if (isNaN(start) || isNaN(end) || start > end) return new Response('Requested Range Not Satisfiable', { status: 416 });
      if (end >= total) end = total - 1;
      const chunkSize = end - start + 1;
      const rs = fs.createReadStream(filePath, { start, end });
      const webStream = Readable.toWeb(rs);
      headers.set('Content-Range', `bytes ${start}-${end}/${total}`);
      headers.set('Content-Length', String(chunkSize));
      return new Response(webStream as unknown as BodyInit, { status: 206, headers });
    }

    const rs = fs.createReadStream(filePath);
    const webStream = Readable.toWeb(rs);
    headers.set('Content-Length', String(total));
    return new Response(webStream as unknown as BodyInit, { status: 200, headers });
  } catch (err) {
    return new Response('Not Found', { status: 404 });
  }
}
