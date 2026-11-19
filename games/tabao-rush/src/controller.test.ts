import { describe, expect, it } from 'vitest';
import { BUTTON, createTick, EMPTY_SETUP, STEP_MS, STEPS_PER_SECOND } from '@kaki/platform';
import { checkLayout, checkPrivateView } from '@kaki/platform/kit';
import { placeController } from '@kaki/platform/private-placement';
import { tabaoRush as realGame } from './rules/game';
import { tabaoRush } from './rules/playing.fixture';
import { DASH_DISTANCE, WALK_SPEED } from './rules/state';
import type { TabaoState } from './rules/state';
import { prepareStations } from './rules/stations';
import { twin } from '../../../packages/platform/src/session/testing.fixture';
const player = { id: 'seat-1', seat: 1, name: 'Cook', colour: 'seat-1' as const };
function initial() { return tabaoRush.init(42, [player], {}, EMPTY_SETUP); }
function input(button = 0, pressed = button, x = 0, y = 0) {
  return createTick({ frames: new Map([[player.id, { held: button, pressed, released: 0,
    axes: [x,y,0,0], age: 0, seq: 0 }]]) });
}
function step(state: TabaoState, button = 0, pressed = button, x = 0, y = 0) {
  return tabaoRush.step(state, input(button,pressed,x,y), STEP_MS);
}
function crate() {
  const state = initial();
  return { ...state, cooks: state.cooks.map(c => ({ ...c, x:3.5,y:2.2,facing:6 as const,targetTile:13 })) };
}
describe('TR-020 phone controls', () => {
  it('valid pick/play layouts with cook picks fit each phone with kit floors', () => {
    const pick = realGame.init(42,[player,{ ...player,id:'seat-2',seat:2,colour:'seat-2' }],{},EMPTY_SETUP);
    const play = { ...pick, phase: 'play' as const };
    expect(play.picks).toHaveLength(2);
    for (const state of [pick, play]) {
      const layout = realGame.controllerLayout(state,player.id), view = realGame.privateView(state,player.id);
      expect(checkLayout(layout)).toEqual([]);
      if (view) expect(checkPrivateView(view)).toEqual([]);
      for (const [width,height] of [[844,390],[667,375],[932,430]] as const) {
        const placed = placeController(layout,view,{width,height:height-68},true,{}, {width,height});
        expect(placed.fits, `${String(width)} ${String(state.phase)}`).toBe(true);
        const buttons = placed.parts.filter(p => p.control.kind === 'button');
        if (state.phase === 'play') expect(buttons).toHaveLength(4);
        for (const part of buttons) {
          expect(part.width).toBeCloseTo(({ 667: 103.033333, 844: 112.2, 932: 123.2 })[width]);
          expect(part.width).toBeGreaterThanOrEqual((width >= 844 ? 110 : 89)-0.01);
          expect(part.height).toBe(part.width);
        }
      }
    }
    const view = realGame.privateView({ ...pick,phase:'play' },player.id);
    expect(view).toBeNull();
    expect(JSON.stringify(view)).not.toContain('Uncle');
    expect(realGame.privateView(pick,player.id)).toBeNull();
    expect(realGame.privateView({ ...pick,phase:'play' },'unknown')).toBeNull();
  });
  it('each face maps to its rule action; Cross and Triangle use press edges', () => {
    const controls = tabaoRush.controllerLayout(initial(),player.id).controls;
    expect(controls.filter(c => c.kind === 'button').map(c => [c.id,c.button,c.disabled ?? false])).toEqual([
      ['cross','face-bottom',false],['circle','face-right',false],['square','face-left',false],['triangle','face-top',false],
    ]);
    const taken = step(crate(),1 << BUTTON.FACE_BOTTOM);
    expect(taken.inventory.held[player.id]?.ingredient).toBe('cucumber');
    expect(step(taken,1 << BUTTON.FACE_BOTTOM,0).inventory.held[player.id]).toBeDefined();
    const thrown = step(taken,1 << BUTTON.FACE_TOP);
    expect(thrown.inventory.held[player.id]).toBeUndefined();
    expect(thrown.inventory.flights).toHaveLength(1);
    const walk = step(initial(),0,0,1,0), dash = step(initial(),1 << BUTTON.FACE_LEFT,undefined,1,0);
    expect((dash.cooks[0]?.x ?? 0)-(walk.cooks[0]?.x ?? 0)).toBeCloseTo(DASH_DISTANCE);
    expect(step(dash,1 << BUTTON.FACE_LEFT,0).cooks[0]?.x).toBe(dash.cooks[0]?.x);
    const cooled = step(dash,1 << BUTTON.FACE_LEFT);
    expect(cooled.cooks[0]?.x).toBe(dash.cooks[0]?.x);
    expect(step({ ...cooled,tick:60 },1 << BUTTON.FACE_LEFT).cooks[0]?.x).toBeGreaterThan(dash.cooks[0]?.x ?? 0);
  });
  it('Circle continues extinguishing with held frames and stops on release', () => {
    const base = crate();
    let state = prepareStations({ ...base, level: { ...base.level,
      tiles: base.level.tiles.map((tile,i) => i === 13
        ? { kind: 'station', stationId: 'chop', stationType: 'chop' } : tile) } });
    const station = state.stations?.[13]; if (!station) throw new Error('Missing station');
    state = { ...state, stations:{ ...state.stations,13:{ ...station,fire:true,extinguish:0 } },
      inventory:{ ...state.inventory,held:{ [player.id]:{id:99,kind:'extinguisher',place:{kind:'held',cook:player.id}} } } };
    const pressed = step(state,1 << BUTTON.FACE_RIGHT);
    const held = step(pressed,1 << BUTTON.FACE_RIGHT,0);
    expect(pressed.stations?.[13]?.extinguish).toBe(1);
    expect(held.stations?.[13]?.extinguish).toBe(2);
    expect(step(held).stations?.[13]?.extinguish).toBe(0);
  });
  it('input boundary applies the newly arrived stick on the next step and stops immediately', () => {
    const t = twin({game:tabaoRush,seed:42,players:1,settings:{}});
    const before = t.session.state?.cooks[0]?.x; if (before === undefined) throw new Error('Missing cook');
    t.buffer.receive(player.id,0,0,[1,0,0,0]);
    expect(t.session.state?.cooks[0]?.x).toBe(before);
    t.session.advance(STEP_MS);
    expect(t.session.state?.cooks[0]?.x).toBeCloseTo(before+WALK_SPEED/STEPS_PER_SECOND);
    t.buffer.receive(player.id,1,0,[-1,0,0,0]);t.session.advance(STEP_MS);
    expect(t.session.state?.cooks[0]?.x).toBeCloseTo(before);
    t.buffer.receive(player.id,2,0,[0,0,0,0]);t.session.advance(STEP_MS);
    expect(t.session.state?.cooks[0]?.x).toBeCloseTo(before);
  });
});
