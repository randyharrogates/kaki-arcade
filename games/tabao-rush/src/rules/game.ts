import { createRng } from '@kaki/sim-core';
import { secondsToSteps } from '@kaki/platform';
import type { ControllerLayout, GameModule, PlayerInfo } from '@kaki/platform';
import { prepareStations, advanceStations, stationViews } from './stations';
import { TEST_LEVEL } from './level';
import { dropLeaving, floorPickup, interactItems, landItems } from './items';
import { moveCooks } from './movement';
import { inventory, items, participant, SOFT_SEPARATION } from './state';
import type { Cook, TabaoState } from './state';
import { targetTile } from './target';

export const ROUND_STEPS = secondsToSteps(210);
const PLAY_LAYOUT: ControllerLayout = {
  revision: 0,
  controls: [
    { kind: 'stick', id: 'move' },
    { kind: 'button', id: 'cross', button: 'face-bottom', label: 'Pick / place' },
    { kind: 'button', id: 'circle', button: 'face-right', label: 'Act', disabled: true },
    { kind: 'button', id: 'square', button: 'face-left', label: 'Dash', disabled: true },
    { kind: 'button', id: 'triangle', button: 'face-top', label: 'Throw' },
  ],
};
const STATION_LAYOUT: ControllerLayout = {
  revision: 1,
  controls: PLAY_LAYOUT.controls.map((control) => control.id === 'circle'
    ? { kind: 'button', id: 'circle', button: 'face-right', label: 'Act' } : control),
};
const WATCH_LAYOUT: ControllerLayout = {
  revision: 0,
  controls: [{ kind: 'text', id: 'watch', text: 'Watch until the next round' }],
};

function spawn(state: TabaoState, player: PlayerInfo): Cook {
  const at = state.level.spawns.find((point) => state.cooks.every((cook) =>
    Math.hypot(cook.x - point.x, cook.y - point.y) >= SOFT_SEPARATION));
  if (at === undefined) throw new Error('Movement fixture needs a free spawn');
  return {
    id: player.id,
    x: at.x,
    y: at.y,
    vx: 0,
    vy: 0,
    facing: 2,
    targetTile: targetTile(state.level, at.x, at.y, 2),
  };
}

export const tabaoRush: GameModule<TabaoState> = {
  meta: {
    id: 'tabao-rush',
    name: 'Tabao Rush',
    blurb: 'Move together around a Singapore hawker stall.',
    players: { min: 1, max: 8 },
    teams: 'none',
    coop: true,
    solo: true,
  },
  settings: { fields: [] },
  init(seed, players) {
    let state: TabaoState = {
      inventory: inventory(),
      nextItemId: 0,
      rng: createRng(seed),
      level: TEST_LEVEL,
      players: [],
      cooks: [],
      tick: 0,
      endTick: ROUND_STEPS,
    };
    for (const player of players) state = tabaoRush.join(state, player);
    return state;
  },
  step(state, inputs) {
    if (state.tick >= state.endTick) return state;
    const interacted = advanceStations(interactItems(prepareStations(state), inputs));
    return landItems({
      ...interacted,
      tick: state.tick + 1,
      cooks: moveCooks(state.level, state.cooks, inputs, state.tick),
    });
  },
  join(state, player) {
    if (state.players.some((entry) => entry.id === player.id) || state.players.length >= 8) {
      return state;
    }
    const players = [...state.players, participant(player, state.tick)]
      .sort((a, b) => a.seat - b.seat);
    const cooks = state.tick === 0 ? [...state.cooks, spawn(state, player)] : state.cooks;
    return { ...state, players, cooks };
  },
  leave(state, id) {
    if (!state.players.some((entry) => entry.id === id)) return state;
    const dropped = dropLeaving(state, id);
    return {
      ...dropped,
      players: state.players.filter((entry) => entry.id !== id),
      cooks: state.cooks.filter((cook) => cook.id !== id),
    };
  },
  publicView(state) {
    const prepared = prepareStations(state);
    return {
      level: state.level,
      items: items(prepared),
      stations: stationViews(prepared),
      players: state.players,
      cooks: state.cooks.map((cook) => ({ ...cook,
        floorItem: floorPickup(state, cook)?.id ?? null,
      })),
      tick: state.tick,
      endTick: state.endTick,
    };
  },
  privateView: () => null,
  controllerLayout(state, id) {
    return state.players.some((player) => player.id === id && !player.spectating)
      ? Object.keys(state.stations ?? {}).length > 0
        ? STATION_LAYOUT : PLAY_LAYOUT
      : WATCH_LAYOUT;
  },
  isOver: (state) => state.tick >= state.endTick,
  results: (state) => ({
    mode: 'coop',
    score: 0,
    players: state.players.map((player) => ({
      id: player.id, place: 1, score: 0, joinedMidGame: player.joinedMidGame,
    })),
  }),
  assets: () => [],
  secrets: () => [],
};
