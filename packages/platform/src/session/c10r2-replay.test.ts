import type { PlayerInfo } from '../game/types';
import { expect, it } from 'vitest';
import { applyHostEvent, applyPhoneEvent, createSession, STEP_MS, AXIS_COUNT } from '@kaki/platform';
import { replayMatch, parseRecording } from '@kaki/platform/harness';
import { cloneState, createInputBuffer, encodeState, hashState } from '@kaki/sim-core';
import { tabaoRush } from '../../../../games/tabao-rush/src/index';
import { peekPoker } from '../../../../games/peek-poker/src/rules/game';
import { FakeTransport, joinRoom, makeRoom, token } from './testing.fixture';

for (const [name, game, settings] of [['tabao', tabaoRush, {}], ['peek', peekPoker, { rounds: 3 }]] as const) it(`console recording of ${name} replays in the harness: joins, leaves, disconnect, pause`, () => {
  let room = makeRoom(3);
  const buffer = createInputBuffer<string>({ axisCount: AXIS_COUNT, seqModulus: 65536, staleAfterSteps: 15 });
  const transport = new FakeTransport(); const events: unknown[] = []; let frame: (ms: number) => void = () => undefined;
  const session = createSession({ game: game as never, settings, seed: 77, room, context: { firstInRoom: false, data: {}, saved: null, teams: false }, buffer, transport,
    frames: { subscribe(f) { frame = f; return () => undefined; } },
    publicView() { /**/ }, event() { /**/ }, recordInput(e) { events.push(encodeState(cloneState(e))); } });
  const players = cloneState((session.state as { players: (PlayerInfo | { info: PlayerInfo })[] }).players.map(p => 'info' in p ? p.info : p));
  const initialHash = hashState(session.state);
  const seq = new Map<string, number>();
  const send = (id: string, b: number, x: number): void => { const s = seq.get(id) ?? 0; buffer.receive(id, s, b, [x, -x, 0, 0]); seq.set(id, s + 1); };
  for (let i = 0; i < 900; i++) {
    for (const id of ['seat-1', 'seat-2', 'seat-3', 'seat-4']) send(id, i % 19 < 2 ? 16 : 0, Math.sin(i / 20));
    if (name === 'peek' && i % 7 === 0) for (const c of ['c1', 'c2', 'c3', 'c4']) transport.tap(c, 'grid', i % 16);
    if (i === 100) { room = joinRoom(room, 4); session.updateRoom(room); }
    if (i === 200) transport.receive({ type: 'connection', connectionId: 'c2', connected: false });
    if (i === 260) transport.receive({ type: 'connection', connectionId: 'c2', connected: true });
    if (i === 300) { session.pause('seat-3'); }
    if (i === 340) { session.resume('seat-1'); }
    if (i === 500) { room = applyPhoneEvent(room, { deviceId: 'd3', connectionId: 'c3', seat: 3 }, { type: 'leave' }, 0).state; session.updateRoom(room); }
    if (i === 600) { room = applyHostEvent(room, { type: 'disconnect', seat: 1 }, 600 * STEP_MS).state; session.updateRoom(room); }
    frame(STEP_MS);
  }
  const file = { format: 'kaki-match-3' as const, game: game.meta.id, options: { seed: 77, players, settings, teams: false, context: { data: {}, saved: null } },
    initialHash, initialView: null, views: [], recording: { runs: events.map(event => ({ count: 1, event })), hashes: [{ event: events.length, step: session.step, hash: hashState(session.state) }] } };
  const json = JSON.stringify(file);
  for (let s = 1; s <= 4; s++) expect(json).not.toContain(token(s));
  const replay = replayMatch(game as never, parseRecording(json));
  expect(session.step).toBeGreaterThan(700);
  expect(replay.divergence).toBeNull();
  expect(replay.finalHash).toBe(hashState(session.state));
});
