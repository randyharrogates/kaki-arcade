import { expect, it } from 'vitest';
import type { HostMessage } from '@kaki/protocol';
import type { PhoneReconnectDial } from '@kaki/platform';
import { createPhone, phoneView, offersTeamChoice } from './phone';
import { Clock, MemoryStorage, CODE, SECRET } from './testing.fixture';

function fixture() {
  let dial!: PhoneReconnectDial;
  const sent: unknown[] = [];
  const clock = new Clock();
  let view = phoneView('entry');
  const phone = createPhone({ clock, storage: new MemoryStorage(), dial(options) { dial = options; options.onPeer({ sendPhone: message => { sent.push(message); return true; } }); return { stop: () => undefined }; } }, null, next => { view = next; });
  phone.join(CODE, 'Fern');
  dial.onState('control-open');
  const send = (message: HostMessage) => { dial.onControl(message); };
  send({ v: 1, t: 'seat', seat: 1, colour: 0, name: 'Fern', nameReplaced: false, resumed: false, seatToken: SECRET });
  const privateView = (rev: number, text = 'Locked in') => { send({ v: 1, t: 'view', rev, view: { revision: rev, blocks: [{ kind: 'text', text }] } }); };
  const room = (phase: 'lobby' | 'playing' | 'paused' | 'results') => { send({ v: 1, t: 'room', phase, players: 1, leader: true, team: null }); };
  const picker = (screen: 'picker' | 'starting' = 'starting', id = 'rabakz') => { send({ v: 1, t: 'picker-state', revision: 1, screen, game: { id, name: 'Game', blurb: 'A game', min: 1, max: 8 }, leaderName: 'Fern', reason: null, failed: false }); };
  return { sent, reconnect: () => { clock.advance(1000); dial.onHost(true); dial.onState('control-open'); }, disconnect: () => { dial.onState('closed'); }, phone, send, privateView, room, picker, get view() { return view; } };
}
it('CTRL-003 / PLAT-031 stores validated private content and only replaces it with a newer wire revision', () => {
  const f = fixture(); f.privateView(3); f.privateView(2, 'Old'); f.privateView(3, 'Duplicate');
  expect(f.view.gamePrivateView).toEqual({ revision: 3, blocks: [{ kind: 'text', text: 'Locked in' }] });
  f.privateView(4, 'Reveal'); expect(f.view.gamePrivateView?.revision).toBe(4);
  f.send({ v: 1, t: 'view', rev: 5, view: { revision: 5, blocks: [{ kind: 'script', text: 'Bad' }] } });
  expect(f.view.gamePrivateView?.revision).toBe(4); expect(f.view.gameViewRevision).toBe(4);
  f.send({ v: 1, t: 'view', rev: 6, view: { revision: 0, blocks: [] } });
  expect(f.view.gamePrivateView).toEqual({ revision: 6, blocks: [] }); f.phone.stop();
});
it.each(['lobby', 'picker', 'results', 'seat-loss', 'leave', 'null'] as const)('CTRL-003 / PLAT-031 clears private content on %s', action => {
  const f = fixture(); f.room('playing'); f.privateView(3); expect(f.view.gamePrivateView?.revision).toBe(3);
  if (action === 'lobby' || action === 'results') f.room(action);
  else if (action === 'picker') f.picker('picker');
  else if (action === 'seat-loss') f.send({ v: 1, t: 'close', reason: 'replaced' });
  else if (action === 'leave') f.phone.leave();
  else f.send({ v: 1, t: 'view', rev: 4, view: null });
  expect(f.view.gamePrivateView).toBeNull(); f.phone.stop();
});
it('CTRL-003 / PLAT-031 keeps team setup routing and rejects malformed content from an empty panel', () => {
  const f = fixture(); f.send({ v: 1, t: 'view', rev: 1, view: { blocks: [] } }); expect(f.view.gamePrivateView).toBeNull();
  f.send({ v: 1, t: 'view', rev: 2, view: { kind: 'team-setup', revision: 0, screen: 'teams', enabled: true, players: [], error: null } });
  expect(f.view.teamSetup?.revision).toBe(2); expect(f.view.gamePrivateView).toBeNull(); f.phone.stop();
});
it.each([['rabakz', 'rabakz'], ['peek-poker', 'peek-poker'], ['tabao-rush', 'tabao-rush'], ['unknown', 'console']])('CTRL-003 / PLAT-031 applies the phone theme for %s only during play and pause', (id, theme) => {
  const f = fixture(); f.picker('starting', id); expect(f.view.theme).toBe('console');
  for (const phase of ['playing', 'paused', 'results', 'lobby'] as const) {
    f.room(phase); expect(f.view.theme).toBe(phase === 'playing' || phase === 'paused' ? theme : 'console');
  }
  f.room('playing'); f.send({ v: 1, t: 'close', reason: 'replaced' }); expect(f.view.theme).toBe('console'); f.phone.stop();
});

it('CTRL-003 / PLAT-031 team setup uses console even with a playing phase', () => {
  const f = fixture(); f.picker(); f.room('playing'); expect(f.view.theme).toBe('rabakz');
  f.send({ v: 1, t: 'view', rev: 2, view: { kind: 'team-setup', revision: 0, screen: 'teams', enabled: true, players: [], error: null } });
  expect(f.view.theme).toBe('console'); f.phone.stop();
});

it('PLAT-031 connection loss clears the view and reconnect mid-game restores the game theme', () => {
  const f = fixture(); f.picker(); f.room('playing'); f.privateView(3);
  expect(f.view.theme).toBe('rabakz');
  f.disconnect();
  expect(f.view.connected).toBe(false); expect(f.view.gamePrivateView).toBeNull(); expect(f.view.theme).toBe('console');
  f.reconnect();
  f.send({ v: 1, t: 'seat', seat: 1, colour: 0, name: 'Fern', nameReplaced: false, resumed: true, seatToken: SECRET });
  f.picker();
  expect(f.view.connected).toBe(true); expect(f.view.theme).toBe('rabakz');
  expect(f.view.gamePrivateView).toBeNull(); f.privateView(4); expect(f.view.gamePrivateView?.revision).toBe(4);
  f.phone.stop();
});
it('PP-032 Results retains only own place and score and clears them for the next match',()=>{
  const f=fixture();f.room('playing');
  f.send({v:1,t:'view',rev:3,view:{revision:3,blocks:[{kind:'stat',label:'Place',value:'=2'},{kind:'stat',label:'Score',value:34},{kind:'text',text:'Private hand'}]}});
  f.room('results');expect(f.view.gamePrivateView).toBeNull();
  expect(f.view.resultStats).toEqual([{label:'Place',value:'=2'},{label:'Score',value:34}]);
  f.room('results');expect(f.view.resultStats).toHaveLength(2);
  f.room('playing');expect(f.view.resultStats).toEqual([]);f.phone.stop();
});

it('PP-032 Results offers teams only when the game offers them', () => {
  const f = fixture();
  for (const teamsOffered of [false, true]) {
    f.send({v:1,t:'view',rev:teamsOffered ? 3 : 2,view:{kind:'team-setup',revision:0,screen:'choice',enabled:false,teamsOffered,teamsReason:null,settings:null,players:[],error:null}});
    f.room('results');
    expect(offersTeamChoice(f.view)).toBe(teamsOffered);
    expect(offersTeamChoice({...f.view,leader:false})).toBe(false);
  }
  f.phone.stop();
});

it('PLAT-023 phone session button sends pause/resume only while connected and authorised', () => {
  const f = fixture(); f.phone.sessionCommand(); expect(f.sent).toHaveLength(1); // hello only
  f.send({ v: 1, t: 'layout', rev: 3, layout: { revision: 3, controls: [] } });
  f.privateView(4); f.room('playing');
  f.phone.sessionCommand(); expect(f.sent.at(-1)).toMatchObject({ t: 'action', rev: 3, viewRev: 4, data: { control: 'console-pause' } });
  f.room('paused'); f.phone.sessionCommand(); expect(f.sent.at(-1)).toMatchObject({ data: { control: 'console-resume' } });
  f.send({ v: 1, t: 'room', phase: 'paused', players: 2, leader: false, team: null });
  const count = f.sent.length; f.phone.sessionCommand(); expect(f.sent).toHaveLength(count);
  f.disconnect(); f.phone.sessionCommand(); expect(f.sent).toHaveLength(count); f.phone.stop();
});
