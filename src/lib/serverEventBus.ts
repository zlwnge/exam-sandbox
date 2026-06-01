import EventEmitter from 'events';

const ee = new EventEmitter();

export function emitRecordChange(payload: any) {
  try {
    ee.emit('records:changed', typeof payload === 'string' ? payload : JSON.stringify(payload));
  } catch (e) {
    console.error('emitRecordChange error', e);
  }
}

export function onRecordChange(fn: (msg: string) => void) {
  ee.on('records:changed', fn);
  return () => ee.off('records:changed', fn);
}

export default { emitRecordChange, onRecordChange };
