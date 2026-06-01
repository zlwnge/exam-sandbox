import EventEmitter from 'events';

const CHANNEL = 'exam:records';
const ee = new EventEmitter();

let redisPub: any = null;
let redisSub: any = null;
let usingRedis = false;
let initPromise: Promise<void> | null = null; // cache to prevent double-init races

async function tryInitRedis() {
  if (usingRedis || typeof process === 'undefined') return;
  const url = process.env.REDIS_URL || process.env.REDIS; // env flexibility
  if (!url) return;
  // Return cached promise so concurrent callers don't double-initialize
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      // lazy require so environments without ioredis don't break
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const IORedis = require('ioredis');
      redisPub = new IORedis(url);
      redisSub = new IORedis(url);
      redisSub.subscribe(CHANNEL, (err: any) => {
        if (err) console.error('redis subscribe error', err);
      });
      redisSub.on('message', (_ch: string, message: string) => {
        try {
          ee.emit('records:changed', message);
        } catch (e) {
          console.error('redis message emit error', e);
        }
      });
      usingRedis = true;
      console.info('serverEventBus: using Redis pub/sub');
    } catch (e) {
      console.warn('serverEventBus: ioredis not available or failed to init, falling back to in-process only');
    }
  })();
  return initPromise;
}

export async function emitRecordChange(payload: any) {
  const msg = typeof payload === 'string' ? payload : JSON.stringify(payload);
  try {
    // local emit
    ee.emit('records:changed', msg);
  } catch (e) {
    console.error('emitRecordChange local emit error', e);
  }

  try {
    await tryInitRedis();
    if (usingRedis && redisPub) {
      redisPub.publish(CHANNEL, msg).catch((err: any) => console.error('redis publish error', err));
    }
  } catch (e) {
    // ignore pub failures
  }
}

export async function onRecordChange(fn: (msg: string) => void) {
  await tryInitRedis();
  ee.on('records:changed', fn);
  return () => ee.off('records:changed', fn);
}

export default { emitRecordChange, onRecordChange };
