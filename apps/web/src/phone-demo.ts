import { pickerView } from '@kaki/platform';
import { pickerDemo } from './picker-demo';
import { gameMetas } from './game-registry';
import { phoneCopy, phoneView } from './phone';
import type { PhoneState } from './phone';
export function phoneDemo(state: string, params: URLSearchParams) {
  if (state === 'picker-leader' || state === 'picker-watcher') {
    const demo = pickerDemo(params);
    return { ...phoneView('lobby', { seat: state === 'picker-leader' ? 1 : 2, name: params.get('names') === 'wide' ? 'WWWWWWWWWWWW' : state === 'picker-leader' ? 'Cloud Noodle' : 'Pebble Puff', colour: state === 'picker-leader' ? 'var(--ka-seat-1)' : 'var(--ka-seat-2)', leader: state === 'picker-leader' }), picker: demo.picker ? pickerView(demo.picker, demo.room, gameMetas) : null };
  }
  const key: PhoneState = Object.hasOwn(phoneCopy, state) ? state as PhoneState : 'entry';
  return phoneView(key, { code: 'H7KQ9MXR', name: params.get('names') === 'wide' ? 'WWWWWWWWWWWW' : params.get('names') === 'long' ? '天地玄黃宇宙洪荒日月盈昃' : 'Ah Boy',
    seat: ['entry', 'invalid-code', 'blank', 'too-long', 'bad-characters', 'room-full', 'room-not-found', 'connecting', 'could-not-connect'].includes(key) ? null : 3,
    colour: 'var(--ka-seat-3)', leader: params.get('leader') === '1',
    notice: key === 'name-taken' || key === 'name-replaced' ? phoneCopy[key][1] : '' });
}
