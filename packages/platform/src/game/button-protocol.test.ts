import { describe, expect, it } from 'vitest';
import { BUTTON as WIRE_BUTTON } from '@kaki/protocol';
import { BUTTON } from './types';

describe('CTRL-001, CTRL-003, NET-005 game and wire button positions', () => {
  it('matches every wire mask bit for bit, without runtime coupling', () => {
    const masks = {
      DPAD_UP: WIRE_BUTTON.up,
      DPAD_DOWN: WIRE_BUTTON.down,
      DPAD_LEFT: WIRE_BUTTON.left,
      DPAD_RIGHT: WIRE_BUTTON.right,
      FACE_BOTTOM: WIRE_BUTTON.faceBottom,
      FACE_RIGHT: WIRE_BUTTON.faceRight,
      FACE_LEFT: WIRE_BUTTON.faceLeft,
      FACE_TOP: WIRE_BUTTON.faceTop,
      SHOULDER_LEFT: WIRE_BUTTON.l,
      SHOULDER_RIGHT: WIRE_BUTTON.r,
      START: WIRE_BUTTON.start,
      SHAKE: WIRE_BUTTON.shake,
    };
    expect(Object.keys(masks)).toHaveLength(Object.keys(WIRE_BUTTON).length);
    expect(Object.keys(masks)).toEqual(Object.keys(BUTTON));
    for (const name of Object.keys(masks) as (keyof typeof BUTTON)[]) {
      expect(1 << BUTTON[name], name).toBe(masks[name]);
    }
    expect(Object.values(masks)).toEqual(Array.from({ length: 12 }, (_, bit) => 1 << bit));
  });
});
