import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { createRoom, applyPhoneEvent } from './room';
import { join, resume, host, identity, invariants } from './test-helpers';
it('PLAT-003 deterministic builds and golden hash', () => {
  const run = () => {
    let s = createRoom();
    let rng = 42;
    let now = 0;
    const random = (n: number) => {
      rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0;
      return rng % n;
    };
    for (let i = 0; i < 2500; i++) {
      now += random(8000);
      const id = random(12) + 1;
      const seat = random(8) + 1;
      const names = ['Sam', 'Sa\u200cm', 'Ｓａｍ', 'abcdefghijkl', 'abcdefghijklm',
        'f u c k', 'Kok Wei', '👩‍💻'.repeat(12), null];
      const type = random(7);
      const before = JSON.stringify(s);
      const r = type === 0 ? join(s, id, names[random(names.length)], now)
        : type === 1 ? resume(s, id, now)
          : type === 2 ? applyPhoneEvent(s, identity(id, seat), { type: 'leave' }, now)
            : type === 3 ? host(s, { type: 'disconnect', seat }, now)
              : type === 4 ? host(s, {
                type: 'phase', phase: 'playing',
                allowRunningJoin: true
              }, now)
                : type === 5 ? host(s, { type: 'restore' }, now) : host(s, { type: 'expire' }, now);
      expect(JSON.stringify(s)).toBe(before);
      s = r.state;
      invariants(s);
    }
    return JSON.stringify(s);
  };
  const a = run();
  expect(run()).toBe(a);
  expect(createHash('sha256').update(a).digest('hex')).toBe(
    // PLAT-034 admission keys and retained claim metadata are part of the deterministic host state.
    '6d593dca258b3c7cf3860d9b36e97829962b4ef115e54ed2fb49702bd03fddb5',
  );
});
