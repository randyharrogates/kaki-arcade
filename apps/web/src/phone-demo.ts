import { phoneCopy, phoneView } from './phone';
import type { PhoneState } from './phone';
export function phoneDemo(state: string, params: URLSearchParams) {
  const key: PhoneState = Object.hasOwn(phoneCopy, state) ? state as PhoneState : 'entry';
  return phoneView(key, { code: 'H7KQ9MXR', name: params.get('names') === 'long' ? '天地玄黃宇宙洪荒日月盈昃' : 'Ah Boy',
    seat: ['entry', 'invalid-code', 'blank', 'too-long', 'bad-characters', 'room-full', 'room-not-found', 'connecting'].includes(key) ? null : 3,
    colour: 'var(--ka-seat-3)', leader: params.get('leader') === '1',
    notice: key === 'name-taken' || key === 'name-replaced' ? phoneCopy[key][1] : '' });
}
