import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * Save a base64 data URL to the uploads directory.
 * Returns the web-accessible API path, or null if the data URL is invalid.
 */
export async function saveDataUrlToFile(dataUrl: string, subfolder = ''): Promise<string | null> {
  try {
    if (!dataUrl || typeof dataUrl !== 'string') return null;
    const match = dataUrl.match(/^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/);
    if (!match) return null;
    const mime = match[1];
    const ext = mime.split('/')[1] === 'jpeg' ? 'jpg' : mime.split('/')[1];
    const base64Data = match[3];

    const uploadsDir = path.join(process.cwd(), 'uploads', subfolder);
    fs.mkdirSync(uploadsDir, { recursive: true });

    const fileName = `${randomUUID()}.${ext}`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

    const webPath = `/api/uploads/${subfolder ? subfolder + '/' : ''}${fileName}`;
    return webPath;
  } catch (err) {
    console.error('saveDataUrlToFile error', err);
    return null;
  }
}
