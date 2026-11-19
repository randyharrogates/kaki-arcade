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

import { applyPhoneEvent, createRoom, createTick } from '@kaki/platform';
import { createInputBuffer } from '@kaki/sim-core';

import { sessionLinks } from './session-links';

it.each(['Space', 'Enter', 'pad'])('CTRL-009 local %s readies once while held, with a phone and solo', source => {
  for (const withPhone of [true, false]) {
    const links = sessionLinks();
    let room = createRoom();
    for (const id of withPhone ? ['tv', 'phone'] : ['tv']) room = applyPhoneEvent(room, { deviceId: id, connectionId: id }, { type: 'join', name: id, seatToken: id.padEnd(32, 'x') }, 0).state;
    const players = room.players.map(p => ({ id: `seat-${String(p.seat)}`, seat: p.seat, name: p.name, colour: 'seat-1' as const }));
    const game = {
      init: () => ({ phase: 'pick', tick: 0, ready: new Set<string>() }),
      step(state: { phase: string; tick: number; ready: Set<string> }, inputs: ReturnType<typeof createTick>) {
        for (const action of inputs.actions) if (action.control === 'ready') state.ready.add(action.player);
        if (state.ready.size === players.length) state.phase = 'play';
        return state;
      },
      controllerLayout: (): Layout => ({ revision: 7, controls: [{ kind: 'options', id: 'ready', options: [{ id: 'ready', label: 'Ready' }] }] }),
    };
    let state = game.init();
    const taps: string[] = [];
    const peer = localPlayer();
    links.peer('tv', peer);
    links.peer('phone', { sendHost: () => true, bindInput() { /* Phone binary input unused during picking. */ } });
    links.setup(room, createInputBuffer<string>({ seqModulus: 65536, staleAfterSteps: 15, axisCount: 4 }));
    links.transport.subscribe(event => {
      if (event.type !== 'tap') return;
      taps.push(event.connectionId);
      const player = room.players.find(p => p.connectionId === event.connectionId);
      state = game.step(state, createTick({ actions: [{ ...event.action, player: `seat-${String(player?.seat)}` }] }));
    });
    for (const p of room.players) {
      links.transport.sendLayout(p.connectionId, game.controllerLayout());
      links.transport.sendPrivateView(p.connectionId, null);
    }
    peer.tick(new Set(), null);
    const held = new Set(source === 'pad' ? [] : [source]);
    const pad = source === 'pad' ? { axes: [], buttons: [{ pressed: true } as GamepadButton] } : null;
    peer.tick(held, pad); peer.tick(held, pad);
    expect([...state.ready]).toEqual(['seat-1']);
    expect(taps).toEqual(['tv']);
    if (withPhone) {
      expect(state.phase).toBe('pick');
      links.control('phone', { v: 1, t: 'action', rev: 0, viewRev: 0, data: { control: 'ready', value: 'ready' } });
    }
    expect(state.phase).toBe('play');
    peer.close(); links.stop();
  }
});

it('CTRL-009 primary options respect audience and disabled state', () => {
  const peer = localPlayer(), send = vi.fn();
  peer.bindControl(send);
  peer.bindInput({ receiveInput() { /* fixture */ }, pause() { /* fixture */ } } as unknown as Parameters<typeof peer.bindInput>[0]);
  for (const part of [
    { kind: 'options', id: 'leader', audience: 'leader', options: [{ id: 'go', label: 'Go' }] },
    { kind: 'options', id: 'disabled', options: [{ id: 'go', label: 'Go', state: 'disabled' }] },
    { kind: 'options', id: 'multiple', options: [{ id: 'one', label: 'One' }, { id: 'two', label: 'Two' }] },
  ]) {
    peer.sendHost({ v: 1, t: 'layout', rev: 0, layout: { revision: 0, controls: [part] } as never });
    peer.tick(new Set(['Space']), null); peer.tick(new Set(), null);
  }
  expect(send).not.toHaveBeenCalled();
});

it('CTRL-009 ignores pad A held across bind and rebind until release and a new press', () => {
  const peer = localPlayer(), send = vi.fn();
  const input = { receiveInput() { /* fixture */ }, pause() { /* fixture */ } } as unknown as Parameters<typeof peer.bindInput>[0];
  const pad = { axes: [], buttons: [{ pressed: true } as GamepadButton] };
  for (let binding = 0; binding < 2; binding++) {
    peer.bindInput(input); peer.bindControl(send);
    peer.sendHost({ v: 1, t: 'layout', rev: 0, layout: { revision: 0, controls: [{ kind: 'options', id: 'ready', options: [{ id: 'ready', label: 'Ready' }] }] } as never });
    send.mockClear();
    peer.tick(new Set(), pad); peer.tick(new Set(), pad);
    expect(send).not.toHaveBeenCalled();
    peer.tick(new Set(), null);
    peer.tick(new Set(), pad); peer.tick(new Set(), pad);
    expect(send).toHaveBeenCalledOnce();
    peer.close();
  }
});
