import { expect, it } from 'vitest';
import { createSession, AXIS_COUNT, STEP_MS } from '@kaki/platform';
import { createInputBuffer } from '@kaki/sim-core';
import { fixture } from '../../../packages/platform/src/session/session.fixture';
import { FakeTransport, makeRoom } from '../../../packages/platform/src/session/testing.fixture';
it('CTRL-003 routes A only to A, public rendering only publicView, and sends on revision change', () => {
  let revision = 0;
  const transport = new FakeTransport();
  const publicViews: unknown[] = [];
  const session = createSession({ game:{ ...fixture, privateView:(_state,id) => ({ revision,blocks:[{ kind:'text',text:`secret-${id}` }] }) }, settings:{ steps:100 }, seed:1,room:makeRoom(2),context:{ firstInRoom: false, data: {}, saved:null, teams:false },transport,
    buffer:createInputBuffer<string>({ axisCount:AXIS_COUNT,seqModulus:65536,staleAfterSteps:15 }),publicView:view => { publicViews.push(view); },event:() => { /* No event handling needed. */ } });
  const views = () => transport.sent.filter(s => s.type === 'view');
  expect(views()).toHaveLength(2);
  for (let i = 0; i < 3; i++) session.advance(STEP_MS);
  expect(views()).toHaveLength(2);
  revision++;
  session.advance(STEP_MS);
  expect(views()).toHaveLength(4);
  expect(JSON.stringify(views().filter(s => s.connection === 'c1'))).toContain('secret-seat-1');
  expect(JSON.stringify(transport.sent.filter(s => s.connection === 'c2'))).not.toContain('secret-seat-1');
  expect(JSON.stringify(views().filter(s => s.connection === 'c2'))).toContain('secret-seat-2');
  expect(JSON.stringify(transport.sent.filter(s => s.connection === 'c1'))).not.toContain('secret-seat-2');
  expect(JSON.stringify(publicViews)).not.toContain('secret-');
  expect(publicViews.length).toBeGreaterThan(0);

});
