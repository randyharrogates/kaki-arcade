import { expect, it, vi } from 'vitest';
import { BUTTON } from '@kaki/protocol';
import { localMapping, localPlayer, tickLocalInput } from './local-player';
import type { Layout } from '@kaki/controller-kit';

const layout: Layout = { revision: 0, controls: [{ kind: 'stick', id: 'move' }, { kind: 'button', id: 'act', button: 'face-bottom', label: 'Act' }] };
it('CTRL-009 maps keyboard and standard pad through layout controls', () => {
  expect(localMapping(layout, new Set(['KeyD', 'Space']), null, false)).toMatchObject({ buttons: BUTTON.faceBottom, stickX: 127, stickY: 0 });
  expect(localMapping(layout, new Set(), { axes: [-1, 0.1], buttons: [{ pressed: true } as GamepadButton] }, false)).toMatchObject({ buttons: BUTTON.faceBottom, stickX: -127, stickY: 0 });
  expect(localMapping({ revision: 0, controls: [] }, new Set(['KeyD', 'Space']), null, false)).toMatchObject({ buttons: 0, stickX: 0 });
  expect(localMapping({ ...layout, controls: [{ kind: 'button', id: 'act', button: 'face-bottom', label: 'Act', audience: 'leader' }] }, new Set(['Space']), null, false).buttons).toBe(0);
});
it('CTRL-009 discards private views and uses the same sequenced receiver as phones', () => {
  const peer = localPlayer(); const receiveInput = vi.fn((frame: { seq: number; stickX: number }) => ({ ...frame })); const pause = vi.fn();
  peer.bindInput({ receiveInput, pause } as unknown as Parameters<typeof peer.bindInput>[0]);
  peer.sendHost({ v: 1, t: 'layout', rev: 0, layout: layout as never });
  peer.sendHost({ v: 1, t: 'view', rev: 0, view: { secret: 'hidden' } });
  peer.tick(new Set(['KeyD']), null); peer.tick(new Set(), null);
  expect(receiveInput.mock.results[0]?.value).toMatchObject({ seq: 0, stickX: 127 });
  expect(receiveInput.mock.results[1]?.value).toMatchObject({ seq: 1, stickX: 0 });
  peer.close(); expect(pause).toHaveBeenCalledOnce();
});

it('CTRL-009 reuses the bound frame and history', () => {
  const peer = localPlayer(); peer.bindInput({ receiveInput() { /* fixture */ }, pause() { /* fixture */ } } as unknown as Parameters<typeof peer.bindInput>[0]);
  const first = peer.tick(new Set(), null); const second = peer.tick(new Set(), null);
  expect(first).toBe(second); expect(first?.history).toBe(second?.history);
});

it('CTRL-009 sends one input per frame with a connected unbound pad and a keyboard seat', () => {
  const peer = localPlayer();
  const receiveInput = vi.fn();
  peer.bindInput({ receiveInput, pause() { /* fixture */ } } as unknown as Parameters<typeof peer.bindInput>[0]);
  peer.sendHost({ v: 1, t: 'layout', rev: 0, layout: layout as never });
  const held = new Set(['KeyD']);
  const pad = { axes: [0, 0], buttons: [] } as unknown as Gamepad;
  for (const binding of [undefined, 0, undefined]) {
    receiveInput.mockClear();
    tickLocalInput('keyboard', binding, peer, held, null);
    tickLocalInput('gamepad', binding, peer, held, pad);
    expect(receiveInput).toHaveBeenCalledOnce();
    expect(receiveInput.mock.calls[0]?.[0]).toMatchObject({ stickX: 127 });
  }
});
