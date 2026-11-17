import { meta } from './meta';
import { ageOrders, arriveOrders, ensureOrders, resizeOrders, stars } from './orders';
import { createRng } from '@kaki/sim-core';
import { secondsToSteps } from '@kaki/platform';
import type { ControllerLayout, GameModule, PlayerInfo } from '@kaki/platform';
import { prepareStations, advanceStations, stationViews } from './stations';
import { TEST_LEVEL } from './level';
import { dropLeaving, floorPickup, interactItems, landItems, actionPreview } from './items';
import { moveCooks } from './movement';
import { inventory, items, participant, SOFT_SEPARATION } from './state';
import type { Cook, TabaoState } from './state';
import { targetTile } from './target';

export const ROUND_STEPS = secondsToSteps(210);
/** Level data may override the default before the first step; the endpoint then stays fixed. */
function endTick(state: TabaoState): number {
  if (state.tick !== 0 || state.level.roundSeconds === undefined) return state.endTick;
  const steps = secondsToSteps(state.level.roundSeconds);
  if (!Number.isSafeInteger(steps) || steps < 1) throw new Error('Round length must be positive');
  return steps;
}
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
    ...(at.kitchen ? { kitchen: at.kitchen } : {}),
    facing: at.facing ?? 2,
    targetTile: targetTile(state.level, at.x, at.y, at.facing ?? 2),
  };
}

export const tabaoRush: GameModule<TabaoState> = {
  meta,
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
    const end = endTick(state);
    if (state.tick >= end) return state.orderEvents?.length || state.serviceEvents?.length
      ? { ...state, orderEvents: [], serviceEvents: [] } : state;
    if (end !== state.endTick) state = { ...state, endTick: end };
    const ready = ensureOrders({ ...state, serviceEvents: [], orderEvents: [] });
    const interacted = ageOrders(advanceStations(interactItems(prepareStations(ready), inputs)));
    const next = landItems({
      ...interacted,
      tick: state.tick + 1,
      cooks: moveCooks(state.level, state.cooks, inputs, state.tick),
    });
    return next.tick < next.endTick ? arriveOrders(next) : next;
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
    return resizeOrders({
      ...dropped,
      players: state.players.filter((entry) => entry.id !== id),
      cooks: state.cooks.filter((cook) => cook.id !== id),
    });
  },
  publicView(state) {
    const prepared = prepareStations(ensureOrders(state));
    const inTransit = new Set(prepared.returns?.map((r) => r.item.id));
    return {
      level: state.level,
      items: items(prepared).filter((item) => !inTransit.has(item.id)),
      stations: stationViews(prepared),
      serviceEvents: state.serviceEvents ?? [],
      kitchens: (prepared.kitchens ?? []).map((k) => ({ id: k.id, orders: k.orders,
        score: k.score, tips: k.tips, expired: k.expired, completed: k.completed,
        cooks: k.cooks, maximum: k.maximum, targetMaximum: k.targetMaximum,
        thresholds: k.thresholds, stars: stars(k) })),
      orderEvents: state.orderEvents ?? [],
      timer: { remaining: Math.max(0, endTick(state) - state.tick), total: endTick(state) },
      players: state.players,
      cooks: state.cooks.map((cook) => ({ ...cook,
        floorItem: floorPickup(state, cook)?.id ?? null,
        actions: actionPreview(prepared, cook),
      })),
      tick: state.tick,
      endTick: endTick(state),
    };
  },
  privateView: () => null,
  controllerLayout(state, id) {
    return state.players.some((player) => player.id === id && !player.spectating)
      ? Object.values(state.stations ?? {}).some((s) => s.type !== 'return-counter' && s.type !== 'dish-rack' && s.type !== 'serving' && s.type !== 'bin')
        ? STATION_LAYOUT : PLAY_LAYOUT
      : WATCH_LAYOUT;
  },
  isOver: (state) => state.tick >= endTick(state),
  results: (state) => {
    const kitchens = ensureOrders(state).kitchens ?? [];
    const score = kitchens.reduce((sum, k) => sum + k.score, 0);
    return {
      mode: 'coop', score,
      ...(state.players.length ? { extras: { stars: kitchens[0] ? stars(kitchens[0]) : 0 } } : {}),
      players: state.players.map((player) => ({
        id: player.id, place: 1, score, joinedMidGame: player.joinedMidGame,
      })),
    };
  },
  assets: () => [],
  secrets: () => [],
};
