import { CLOSED_ROOM_REASON } from './team-setup';
import { REFUSAL_HOLD_MS } from './team-setup';
import type { SetupRefusal } from './game-setup-route';
import { reconcileSettings, settingChange, settingsView } from './game-setup';
import type { PreparedSetup, SettingsValues } from './game-setup';
import { LOCAL_CONNECTION } from './local-player';
import type { SessionPeer } from './session-links';
import { wireJson } from './session-adapter';
import { splitTeams, reconcileTeams, switchTeam } from '@kaki/platform';
import { roomPlayers } from './team-setup';
import type { TeamSetupView } from './team-setup';
import { duration } from '@kaki/ui';
import { validatePhoneMessage } from '@kaki/protocol';
import type { PhoneMessage, PickerInput } from '@kaki/protocol';
import type { HostEvent, RoomState, SessionEvent } from '@kaki/platform';
import { gameMetas, validGameSelection, sessionRegistrations } from './game-registry';
import { initialPicker, pickerInput, pickerRoom, pickerView, pickerFailed } from '@kaki/platform';
import { createHostCheckpoints, createHostSnapshotStore, createReconnectRoom, createRoom, restoreHost } from '@kaki/platform';
import type { HostCredentials, HostSnapshotInput, ReconnectClock, ReconnectHostPeer, ReconnectStorage } from '@kaki/platform';
import type { LinkSnapshot } from '@kaki/netcode';
import type { PairingState, LobbyInput } from './view-model';

export interface HostLink { credentials: HostCredentials; stop(): void }
export interface DialCallbacks {
  retryAfter?(ms: number): void;
  peer(id: string, peer: ReconnectHostPeer): void;
  control(id: string, message: unknown): void;
  dropped(id: string): void;
  quality(id: string, link: LinkSnapshot): void;
  state(state: PairingState): void;
}
export interface HostDependencies {
  clock: ReconnectClock;
  storage: ReconnectStorage;
  mintToken(): string;
  dial(credentials: HostCredentials | undefined, callbacks: DialCallbacks,
    registerStop: (stop: () => void) => void): Promise<HostLink & { reopened: boolean }>;
  session?: { localPeer?(id: string, peer: SessionPeer): void; command?(action: 'pause' | 'resume' | 'quit', id: string): void; continueResults?(): void; setup?(gameId: string, teams: boolean): Promise<PreparedSetup>; start(gameId: string, room: RoomState, settings?: object): Promise<unknown>; prefetch?(gameId: string): Promise<unknown>; updateRoom?(room: RoomState): void; stop?(): void; control?(id: string, message: unknown): void; dropped?(id: string): void };
  online?: { subscribe(callback: () => void): () => void };
  lifecycle?: { subscribe(callback: (event?: 'pageshow' | 'pagehide' | 'hidden') => void): () => void };
}
/** All credentials and peers remain inside this closure; subscribers receive a projection later. */
export function createHost(deps: HostDependencies, changed: (input: Omit<LobbyInput, 'origin'>) => void) {
  const store = createHostSnapshotStore({ storage: deps.storage, clock: deps.clock, validateSelection: validGameSelection });
  let picker = initialPicker(gameMetas);
  let teamSetup: (TeamSetupView & { refusal?: SetupRefusal | null }) | null = null;
  let teamRevision = 0;
  let refusalTimer: unknown;
  const chosenSettings = new Map<string, SettingsValues>();
  const preparedSetups = new Map<string, PreparedSetup>();
  let setupGeneration = 0;
  let setupLoading = false;
  let setupProblem: string | null = null;
  function updateSettingsView(): void {
    if (!teamSetup) return;
    const setup = preparedSetups.get(picker.focus);
    teamSetup = { ...teamSetup, teamsOffered: gameMetas.find(g => g.id === picker.focus)?.teams === 'optional',
      teamsReason: (roomAdapter?.room.players.length ?? 0) < 2 ? 'Teams need 2 players' : null,
      settings: setupLoading ? { loading: true, problem: null, fields: [] } : setupProblem ? { loading: false, problem: setupProblem, fields: [] } : setup?.schema.fields.length ? settingsView(setup.schema, chosenSettings.get(picker.focus) ?? {}) : null };
  }
  function openSetup(enabled = gameMetas.find(g => g.id === picker.focus)?.teams === 'required', rebuild = true): void {
    deps.clock.cancel(refusalTimer);
    const gameId = picker.focus;
    const offered = gameMetas.find(g => g.id === gameId)?.teams === 'optional';
    teamSetup = { kind: 'team-setup', revision: ++teamRevision, screen: 'choice', enabled, teamsOffered: offered, teamsReason: null, settings: null, players: [], error: null };
    const generation = ++setupGeneration;
    const cached = preparedSetups.get(gameId);
    setupLoading = deps.session?.setup !== undefined && (rebuild || cached?.context.teams !== enabled); setupProblem = null;
    updateSettingsView(); sendTeams(); publish();
    if (!setupLoading || !deps.session?.setup) { if (!offered && !cached?.schema.fields.length) { teamSetup = null; sendTeams(); publish(); } return; }
    void deps.session.setup(gameId, enabled).then(setup => {
      if (stopped || generation !== setupGeneration || picker.focus !== gameId || picker.screen !== 'start') return;
      preparedSetups.set(gameId, setup);
      chosenSettings.set(gameId, reconcileSettings(setup.schema, chosenSettings.get(gameId)));
      setupLoading = false; updateSettingsView();
      if (!offered && !setup.schema.fields.length) { teamSetup = null; teamRevision++; sendTeams(); publish(); }
      else reviseTeams();
    }).catch(() => {
      if (stopped || generation !== setupGeneration || picker.focus !== gameId || picker.screen !== 'start') return;
      setupLoading = false; setupProblem = 'Settings could not be loaded. Go back and try again.'; updateSettingsView(); reviseTeams();
    });
  }
  function settingsBlocked(): boolean {
    const setup = preparedSetups.get(picker.focus);
    return setupLoading || setupProblem !== null || Boolean(setup && settingsView(setup.schema, chosenSettings.get(picker.focus) ?? {}).problem);
  }
  let savedTeams: TeamSetupView | null = null;
  let runningAllowsJoin = false;
  const teamNotices = new Map<number, { notice: string; refused: boolean }>();
  let confirmingTeams = false;
  const peers = new Map<string, ReconnectHostPeer>();
  let pairing: PairingState = 'creating';
  let code = '';
  let stopped = false;
  let attempt = 0;
  let link: HostLink | undefined;
  let stopDial: (() => void) | undefined;
  let roomAdapter: ReturnType<typeof createReconnectRoom> | undefined;
  let checkpoints: ReturnType<typeof createHostCheckpoints> | undefined;
  let snapshot: HostSnapshotInput | undefined;
  const links = new Map<string, LinkSnapshot>();
  let retry: unknown;
  let failures = 0;
  let creationAttempts = 0;
  let creationAllowedAt = 0;
  let retryAfter = 0;
  const qualityRuns = new Map<string, { quality: LinkSnapshot['quality']; count: number }>();
  function scheduleRetry(): void {
    deps.clock.cancel(retry);
    const delay = Math.max(Math.min(30000, 1000 * 2 ** Math.min(failures++, 5)), retryAfter - deps.clock.now(), (store.read() ? 0 : creationAllowedAt) - deps.clock.now());
    retry = deps.clock.schedule(() => { void start(); }, delay);
  }
  const unsubscribeOnline = deps.online?.subscribe(() => { if (pairing === 'unreachable') void start(); });
  function publish(): void {
    if (!stopped) changed({ room: roomAdapter?.room ?? createRoom(), links, pairing, code, picker, teamSetup });
  }
  function sendTeams(): void {
    if (!roomAdapter) return;
    for (const p of roomAdapter.room.players) if (p.disconnectedAt === null) peers.get(p.connectionId)?.sendHost({ v: 1, t: 'view', rev: teamRevision,
      view: wireJson(teamSetup ? { ...teamSetup, error: null, ...teamNotices.get(p.seat) } : null) });
  }
  function reviseTeams(): void {
    if (!teamSetup) return;
    teamSetup = { ...teamSetup, revision: ++teamRevision }; sendTeams(); publish();
  }
  function teamInput(id: string, message: PhoneMessage): void {
    if (!roomAdapter || !teamSetup || message.t !== 'action' || message.viewRev !== teamSetup.revision) return;
    const actor = roomAdapter.room.players.find(p => p.connectionId === id && p.disconnectedAt === null);
    const data = message.data;
    if (!actor || !data || typeof data !== 'object' || Array.isArray(data)) return;
    const leader = actor.seat === roomAdapter.room.leader;
    teamNotices.delete(actor.seat);
    if (data.control === 'setting' && leader && teamSetup.screen === 'choice' && !setupLoading && setupProblem === null) {
      const setup = preparedSetups.get(picker.focus);
      if (!setup || typeof data.id !== 'string') return;
      const result = settingChange(setup.schema, chosenSettings.get(picker.focus) ?? {}, data.id, data.value);
      deps.clock.cancel(refusalTimer);
      teamSetup = { ...teamSetup, refusal: result.reason ? { field: data.id, sentence: result.reason, revision: teamRevision + 1 } : null };
      if (result.reason) {
        const refusal = teamSetup.refusal;
        refusalTimer = deps.clock.schedule(() => {
          if (stopped || !teamSetup || teamSetup.refusal !== refusal) return;
          teamSetup = { ...teamSetup, refusal: null }; reviseTeams();
        }, REFUSAL_HOLD_MS);
      } else chosenSettings.set(picker.focus, result.settings);
      updateSettingsView(); reviseTeams(); return;
    }
    if (data.control === 'teams-dismiss') { teamSetup = { ...teamSetup, error: null }; reviseTeams(); return; }
    if (data.control === 'teams-toggle' && leader && teamSetup.screen === 'choice') {
      if (!teamSetup.enabled && (!teamSetup.teamsOffered || teamSetup.teamsReason)) return;
      teamSetup = { ...teamSetup, enabled: !teamSetup.enabled };
      if (savedTeams) savedTeams = { ...savedTeams, enabled: teamSetup.enabled };
      openSetup(teamSetup.enabled);
    } else if (teamSetup.screen === 'teams') {
      if (data.control === 'teams-back' && leader) {
        savedTeams = null; teamNotices.clear();
        teamSetup = null; teamRevision++; picker = { ...picker, screen: 'picker', revision: picker.revision + 1 }; sendTeams(); sendPicker(); publish();
      } else if (data.control === 'teams-start' && leader && teamSetup.players.length >= 2) {
        if (settingsBlocked()) return;
        const game = gameMetas.find(g => g.id === picker.focus);
        if (!game || teamSetup.players.length < game.players.min || teamSetup.players.length > game.players.max) return;
        savedTeams = { ...teamSetup, error: null };
        teamNotices.clear();
        confirmingTeams = true;
        for (const p of teamSetup.players) roomAdapter.host({ type: 'team', seat: p.seat, team: p.team === 0 ? 'red' : 'blue' });
        teamSetup = null; teamRevision++; sendTeams();
        picker = { ...picker, screen: 'start' }; acceptedAt = -Infinity;
        input(id, { v: 1, t: 'picker-input', revision: picker.revision, input: 'start' });
        confirmingTeams = false;
      } else if (data.control === 'teams-switch' || (data.control === 'teams-move' && leader)) {
        const target = data.control === 'teams-switch' ? `seat-${String(actor.seat)}` : typeof data.value === 'string' ? data.value : '';
        const p = teamSetup.players.find(p => p.id === target);
        const game = gameMetas.find(g => g.id === picker.focus);
        if (!p || !game) return;
        const result = switchTeam(teamSetup.players, target, p.team === 0 ? 1 : 0);
        const team = p.team === 0 ? 'Red' : 'Blue';
        if (result.reason) teamNotices.set(actor.seat, { notice: result.reason, refused: true });
        else if (data.control === 'teams-move' && p.seat !== actor.seat) teamNotices.set(p.seat, {
          notice: `${actor.name} moved you to ${p.team === 0 ? 'Blue' : 'Red'}.`, refused: false });
        teamSetup = { ...teamSetup, players: [...result.players], error: result.reason ? `${p.name} can't leave ${team}: it needs at least one player.` : null }; reviseTeams();
      }
    }
  }
  function sessionInput(id: string, message: PhoneMessage): void {
    if (message.t !== 'action' || !roomAdapter) return;
    const data = message.data;
    if (!data || typeof data !== 'object' || Array.isArray(data)) return;
    const actor = roomAdapter.room.players.find(p => p.connectionId === id && p.disconnectedAt === null);
    if (!actor) return;
    if (data.control === 'console-pause' && roomAdapter.room.phase === 'playing') deps.session?.command?.('pause', `seat-${String(actor.seat)}`);
    if (data.control === 'console-resume' && roomAdapter.room.phase === 'paused' && actor.seat === roomAdapter.room.leader) deps.session?.command?.('resume', `seat-${String(actor.seat)}`);
    if (data.control === 'console-quit' && roomAdapter.room.phase === 'paused' && actor.seat === roomAdapter.room.leader) deps.session?.command?.('quit', `seat-${String(actor.seat)}`);
  }
  function sendPicker(): void {
    if (!roomAdapter) return;
    const base = pickerView(picker, roomAdapter.room, gameMetas);
    const message = pairing === 'closed-room' && roomAdapter.room.phase === 'lobby' ? { ...base, reason: CLOSED_ROOM_REASON } : base;
    for (const player of roomAdapter.room.players) if (player.disconnectedAt === null) peers.get(player.connectionId)?.sendHost(message);
  }
  let loadAttempt = 0;
  let acceptedAt = -Infinity;
  let acceptedLeader: number | null = null;
  let queued: { id: string; revision: number; moves: number; beforeAction: number; action?: PickerInput } | undefined;
  let flushing = false;
  let trailing: unknown;
  function input(id: string, message: PhoneMessage): void {
    if (stopped || !roomAdapter || message.t !== 'picker-input' || (pairing === 'closed-room' && roomAdapter.room.phase !== 'results')) return;
    const room = roomAdapter.room;
    // Validate now to prevent an unauthorised/stale packet replacing a deliberate press.
    if (message.revision !== picker.revision || !room.players.some(player =>
      player.connectionId === id && player.seat === room.leader && player.disconnectedAt === null)) return;
    if (room.phase === 'results') {
      if (message.input === 'open') returnToPicker();
      else if (message.input === 'select') continueResults();
      else if (message.input === 'start' && picker.screen !== 'starting') playAgain();
      return;
    }
    if (!flushing && acceptedLeader === roomAdapter.room.leader && deps.clock.now() - acceptedAt < duration.fast) {
      queued ??= { id, revision: message.revision, moves: 0, beforeAction: 0 };
      if (message.input === 'next' || message.input === 'previous') {
        queued.moves = (queued.moves + (message.input === 'next' ? 1 : -1)) % gameMetas.length;
      } else {
        queued.action = message.input;
        queued.beforeAction = (queued.beforeAction + queued.moves) % gameMetas.length; queued.moves = 0;
      }
      if (trailing === undefined) trailing = deps.clock.schedule(() => {
        trailing = undefined;
        const pending = queued; queued = undefined;
        if (pending?.revision !== picker.revision) return;
        const navigation = (count: number): PickerInput[] => Array.from({ length: Math.abs(count) }, () => count > 0 ? 'next' : 'previous');
        const actions: PickerInput[] = [...navigation(pending.beforeAction), ...(pending.action ? [pending.action] : []), ...navigation(pending.moves)];
        flushing = true;
        try { for (const action of actions) input(pending.id, { v: 1, t: 'picker-input', revision: picker.revision, input: action }); }
        finally { flushing = false; }
        sendPicker(); publish();
      }, duration.fast - (deps.clock.now() - acceptedAt));
      return;
    }
    deps.clock.cancel(trailing); trailing = undefined; queued = undefined;
    if (teamSetup?.screen === 'teams' && !confirmingTeams) return;
    const game = gameMetas.find(g => g.id === picker.focus);
    if (picker.screen === 'start' && message.input === 'start' && settingsBlocked()) return;
    if (!confirmingTeams && picker.screen === 'start' && message.input === 'start' && game &&
      (game.teams === 'required' || teamSetup?.enabled)) {
      if (room.players.length < Math.max(2, game.players.min) || room.players.length > game.players.max) return;
      teamSetup = { kind: 'team-setup', revision: ++teamRevision, screen: 'teams', enabled: true,
        players: savedTeams ? reconcileTeams(savedTeams.players, roomPlayers(room), room.leader) : splitTeams(roomPlayers(room), room.leader), error: null }; sendTeams(); publish(); return;
    }
    const before = picker;
    picker = pickerInput(picker, roomAdapter.room, gameMetas, id, message.input, message.revision);
    if (picker === before) return;
    if (picker.screen === 'picker') savedTeams = null;
    if (before.screen === 'starting' && picker.screen !== 'starting') { loadAttempt++; deps.session?.stop?.(); }
    if (picker.screen === 'start' && before.screen === 'picker') {
      savedTeams = null; teamNotices.clear(); openSetup();
    } else if (teamSetup && picker.screen !== 'start') { setupGeneration++; teamSetup = null; teamRevision++; sendTeams(); }
    // Draining queued presses must not start another throttle window.
    if (!flushing) acceptedAt = deps.clock.now();
    acceptedLeader = roomAdapter.room.leader;
    if (!flushing) { sendPicker(); publish(); }
    if (before.screen === 'picker' && picker.screen === 'start') void deps.session?.prefetch?.(picker.focus).catch(() => undefined);
    if (picker.screen === 'starting') {
      if (!confirmingTeams) for (const p of roomAdapter.room.players) if (p.team !== null) roomAdapter.host({ type: 'team', seat: p.seat, team: null });
      const loading = ++loadAttempt; const gameId = picker.focus;
      const teamsInUse = confirmingTeams && savedTeams?.enabled === true;
      const allowRunningJoin = (gameMetas.find(meta => meta.id === gameId)?.midGameJoin ?? false) && !teamsInUse;
      void (chosenSettings.has(picker.focus) ? deps.session?.start(picker.focus, roomAdapter.room, chosenSettings.get(picker.focus)) : deps.session?.start(picker.focus, roomAdapter.room))?.then(() => {
        if (!stopped && loading === loadAttempt && picker.screen === 'starting' && roomAdapter?.room.phase === 'lobby') {
          runningAllowsJoin = allowRunningJoin;
          roomAdapter.host({ type: 'phase', phase: 'playing', allowRunningJoin });
        }
      }).catch(() => {
        if (stopped || loading !== loadAttempt || picker.screen !== 'starting' || picker.focus !== gameId) return;
        picker = pickerFailed(picker, gameMetas);
        openSetup(roomAdapter?.room.players.every(p => p.team !== null) ?? false);
        sendPicker(); publish();
      });
    }
  }
  function terminal(): boolean { return pairing === 'replaced' || pairing === 'expired'; }
  function retire(): void {
    setupGeneration++; setupLoading = false; setupProblem = null; teamSetup = null;
    deps.clock.cancel(trailing); trailing = undefined; queued = undefined;
    if (picker.screen === 'starting') picker = pickerFailed(picker, gameMetas);
    loadAttempt++; acceptedAt = -Infinity; acceptedLeader = null;
    deps.clock.cancel(refusalTimer);
    checkpoints?.stop(); checkpoints = undefined;
    roomAdapter?.stop(); roomAdapter = undefined;
    link?.stop(); link = undefined;
    stopDial?.(); stopDial = undefined;
    links.clear(); qualityRuns.clear(); peers.clear(); deps.session?.stop?.();
  }
  async function start(fresh = false): Promise<void> {
    if (stopped) return;
    deps.clock.cancel(retry);
    const wait = Math.max(retryAfter, store.read() ? 0 : creationAllowedAt) - deps.clock.now();
    if (wait > 0) { retry = deps.clock.schedule(() => { void start(fresh); }, wait); return; }
    const generation = ++attempt;
    // Preserve the latest room before a manual retry.
    checkpoints?.flush(); retire();
    picker = initialPicker(gameMetas);
    if (fresh) { store.clear(); chosenSettings.clear(); preparedSetups.clear(); }
    pairing = store.read() && !fresh ? 'restoring' : 'creating'; code = ''; publish();
    const pending: (() => void)[] = [];
    const current = (): boolean => !stopped && generation === attempt;
    const run = (action: () => void): void => {
      if (!current() || terminal()) return;
      if (roomAdapter) action(); else pending.push(action);
    };
    const callbacks: DialCallbacks = {
      retryAfter: ms => { if (current() && Number.isFinite(ms)) retryAfter = Math.max(retryAfter, deps.clock.now() + ms); },
      peer: (id, peer) => { if (pairing === 'closed-room') { peer.close(); return; } run(() => { peers.set(id, peer); roomAdapter?.attach(id, peer); }); },
      control: (id, message) => { if (pairing === 'closed-room' && !roomAdapter?.room.players.some(p => p.connectionId === id && p.disconnectedAt === null)) return; const checked = validatePhoneMessage(message); if (!checked.ok) return;
        run(() => { const value = checked.value;
          if (value.t === 'action' && value.data && typeof value.data === 'object' && !Array.isArray(value.data) && typeof value.data.control === 'string' && value.data.control.startsWith('console-')) { sessionInput(id, value); return; }
          teamInput(id, value); input(id, value); roomAdapter?.receive(id, value); deps.session?.control?.(id, value);
        }); },
      dropped: id => { run(() => { deps.session?.dropped?.(id); peers.delete(id); links.delete(id); qualityRuns.delete(id); roomAdapter?.dropped(id); }); },
      quality: (id, quality) => { run(() => {
        const previous = links.get(id);
        if (previous?.quality === quality.quality) { qualityRuns.delete(id); return; }
        const run = qualityRuns.get(id);
        const count = run?.quality === quality.quality ? run.count + 1 : 1;
        qualityRuns.set(id, { quality: quality.quality, count });
        if (!previous || count >= 3) {
          links.set(id, quality); qualityRuns.delete(id);
          if (roomAdapter?.room.players.some(player => player.connectionId === id && player.disconnectedAt === null)) publish();
        }
      }); },
      state: state => {
        if (!current() || terminal() || (pairing === 'closed-room' && state !== 'replaced')) return;
        if (state === 'expired' && (roomAdapter?.room.phase === 'playing' || roomAdapter?.room.phase === 'paused') && [...peers.keys()].some(id => roomAdapter?.room.players.some(p => p.connectionId === id && p.disconnectedAt === null))) {
          pairing = 'closed-room'; checkpoints?.stop(); store.clear(); code = ''; publish(); return;
        }
        pairing = state;
        if (state === 'replaced' || state === 'expired') {
          // Never let the losing tab overwrite the winner's checkpoint or reopen automatically.
          deps.clock.cancel(retry); checkpoints?.stop(); store.clear(); retire();
        }
        publish();
        // Once open, signalling recovery belongs to netcode; keep the room and peers.
        if (state === 'ready') { failures = 0; deps.clock.cancel(retry); }
      },
    };
    const registerStop = (stop: () => void): void => {
      if (!current()) stop(); else stopDial = stop;
    };
    try {
      const hadSnapshot = store.read() !== null;
      const restored = await restoreHost({ store, clock: deps.clock,
        reopen: async (credentials, register) => {
          const opened = await deps.dial(credentials, callbacks, stop => { register(stop); registerStop(stop); });
          return { link: opened, ...opened.credentials, reopened: opened.reopened };
        } });
      if (!current()) { if (restored && !restored.retryable) restored.link.stop(); return; }
      if (terminal()) return;
      if (restored?.retryable) { pairing = 'unreachable'; publish(); scheduleRetry(); return; }
      if (hadSnapshot && !restored) { pairing = 'expired'; publish(); return; }
      if (restored) {
        link = restored.link;
        snapshot = restored;
      } else {
        creationAttempts++;
        if (creationAttempts >= 8) creationAllowedAt = deps.clock.now() + 60000;
        const opened = await deps.dial(undefined, callbacks, registerStop);
        if (!current()) { opened.stop(); return; }
        link = opened;
        snapshot = { credentials: opened.credentials, createdAt: deps.clock.now(), room: createRoom(), scores: {}, results: [], selection: null };
      }
      if (terminal()) { retire(); return; }
      code = link.credentials.code;
      const captured = snapshot;
      let previousRoom = captured.room;
      roomAdapter = createReconnectRoom({ room: captured.room, clock: deps.clock, mintToken: () => deps.mintToken(),
        changed: room => {
          if (snapshot) snapshot.scores = Object.fromEntries(Object.entries(snapshot.scores).filter(([id]) => room.players.some(p => id === `seat-${String(p.seat)}`)));
          if (!room.players.length) { savedTeams = null; teamNotices.clear(); teamSetup = null; teamRevision++; sendTeams(); }
          if (savedTeams && !confirmingTeams) savedTeams = { ...savedTeams, players: reconcileTeams(savedTeams.players, roomPlayers(room), room.leader) };
          if (teamSetup?.screen === 'teams') {
            teamNotices.clear();
            teamSetup = { ...teamSetup, players: reconcileTeams(teamSetup.players, roomPlayers(room), room.leader), error: null, revision: ++teamRevision };
          }
          if (teamSetup?.screen === 'choice') { updateSettingsView(); teamSetup = { ...teamSetup, revision: ++teamRevision }; }
          const wasStarting = picker.screen === 'starting'; picker = pickerRoom(picker, room, previousRoom); if (wasStarting && picker.screen !== 'starting') { loadAttempt++; deps.session?.stop?.(); } previousRoom = room; deps.session?.updateRoom?.(room); checkpoints?.checkpoint(); sendPicker(); if (teamSetup) sendTeams(); publish(); } });
      checkpoints = createHostCheckpoints({ store, clock: deps.clock,
        capture: () => { const room = roomAdapter?.room ?? captured.room; const players = room.players.filter(p => p.connectionId !== LOCAL_CONNECTION); return { ...captured, room: { ...room, players, leader: players.some(p => p.seat === room.leader) ? room.leader : players.filter(p => p.disconnectedAt === null).reduce<number | null>((seat, p) => seat === null ? p.seat : Math.min(seat, p.seat), null) } }; },
        ...(deps.lifecycle ? { lifecycle: deps.lifecycle } : {}) });
      failures = 0; retryAfter = 0;
      deps.clock.cancel(retry);
      pairing = 'ready';
      for (const action of pending.splice(0)) action();
      checkpoints.checkpoint(); publish();
    } catch (error) {
      if (current() && !terminal()) {
        stopDial?.();
        if (error && typeof error === 'object' && 'retryAfterMs' in error && typeof error.retryAfterMs === 'number') retryAfter = deps.clock.now() + error.retryAfterMs;
        pairing = 'unreachable'; publish(); scheduleRetry();
      }
    }
  }
  function restoreTeamChoice(): void {
    if (teamSetup?.screen === 'choice') return;
    openSetup(savedTeams?.enabled ?? gameMetas.find(g => g.id === picker.focus)?.teams === 'required', false);
    teamNotices.clear(); sendTeams();
  }
  function continueResults(): void {
    if (roomAdapter?.room.phase !== 'results' || picker.screen !== 'starting') return;
    deps.session?.continueResults?.();
    picker = { ...picker, screen: 'start', revision: picker.revision + 1 }; restoreTeamChoice(); sendPicker(); publish();
  }
  function playAgain(): void {
    if (pairing === 'closed-room') { returnToPicker(); return; }
    if (roomAdapter?.room.phase !== 'results') return;
    deps.session?.stop?.();
    roomAdapter.host({ type: 'phase', phase: 'lobby', allowRunningJoin: false });
    picker = { ...picker, screen: 'start', revision: picker.revision + 1 };
    restoreTeamChoice();

    acceptedAt = -Infinity;
    const leader = roomAdapter.room.players.find(p => p.seat === roomAdapter?.room.leader);
    if (leader) input(leader.connectionId, { v: 1, t: 'picker-input', input: 'start', revision: picker.revision });
  }
  function discardTeams(): void {
    savedTeams = null; teamNotices.clear(); teamSetup = null;
    if (!roomAdapter) return;
    for (const p of roomAdapter.room.players) if (p.team !== null) roomAdapter.host({ type: 'team', seat: p.seat, team: null });
  }
  // Fence any unresolved start completion before stopping the results session and reopening the picker.
  function returnToPicker(): void { if (roomAdapter?.room.phase !== 'results') return; loadAttempt++; deps.session?.stop?.(); discardTeams(); roomAdapter.host({ type: 'phase', phase: 'lobby', allowRunningJoin: false }); picker = { ...picker, screen: pairing === 'closed-room' ? 'lobby' : 'picker', revision: picker.revision + 1 }; sendPicker(); publish(); }
  return {
    start, playAgain, continueResults,
    joinLocal(peer: ReconnectHostPeer & SessionPeer): boolean {
      if (!roomAdapter || pairing !== 'ready' || roomAdapter.room.phase !== 'lobby') return false;
      if (roomAdapter.room.players.some(p => p.connectionId === LOCAL_CONNECTION)) return true;
      peers.set(LOCAL_CONNECTION, peer); roomAdapter.attach(LOCAL_CONNECTION, peer);
      deps.session?.localPeer?.(LOCAL_CONNECTION, peer);
      roomAdapter.receive(LOCAL_CONNECTION, { v: 1, t: 'hello', name: null });
      return roomAdapter.room.players.some(p => p.connectionId === LOCAL_CONNECTION);
    },
    leaveLocal(): void {
      roomAdapter?.receive(LOCAL_CONNECTION, { v: 1, t: 'leave' });
      deps.session?.dropped?.(LOCAL_CONNECTION);
    },
    // Setup only: these are exactly the actions the authenticated leader can perform.
    keyboard(action: PickerInput | 'teams-toggle' | 'teams-back' | 'teams-start' | 'teams-move' | 'pause' | 'resume' | 'quit', value?: string): void {
      if (!roomAdapter || (pairing !== 'ready' && pairing !== 'closed-room')) return;
      const leader = roomAdapter.room.players.find(p => p.seat === roomAdapter?.room.leader && p.disconnectedAt === null);
      if (!leader) return;
      if (action.startsWith('teams-')) teamInput(leader.connectionId, { v: 1, t: 'action', rev: 0, viewRev: teamSetup?.revision ?? 0, data: { control: action, ...(value ? { value } : {}) } });
      else if (action === 'pause' || action === 'resume' || action === 'quit') deps.session?.command?.(action, `seat-${String(leader.seat)}`);
      else if (action === 'open' || action === 'previous' || action === 'next' || action === 'select' || action === 'start' || action === 'back') input(leader.connectionId, { v: 1, t: 'picker-input', revision: picker.revision, input: action });
    },
    teamInput(id: string, control: string, value?: string): void { teamInput(id, { v: 1, t: 'action', rev: 0, viewRev: teamSetup?.revision ?? 0, data: { control, ...(value === undefined ? {} : { value }) } }); },
    get teamSetup() { return teamSetup; },
    get picker() { return picker; },
    get room() { return roomAdapter?.room ?? createRoom(); },
    leaderInput(connection: string, action: PickerInput, revision = picker.revision): void { input(connection, { v: 1, t: 'picker-input', input: action, revision }); },
    roomInput(event: HostEvent): void { roomAdapter?.host(event); },
    sessionEvent(event: SessionEvent): void {
      if (event.type === 'paused') roomAdapter?.host({ type: 'phase', phase: event.paused ? 'paused' : 'playing', allowRunningJoin: runningAllowsJoin });
      else if (event.type === 'results') {
        if (snapshot && roomAdapter?.room.phase !== 'results') {
          const gameId = gameMetas.find(game => game.id === picker.focus)?.id;
          if (gameId) snapshot.scores = { ...snapshot.scores, ...Object.fromEntries(event.results.players.map(p => {
            const games = snapshot?.scores[p.id] ?? {};
            return [p.id, { ...games, [gameId]: (games[gameId] ?? 0) + p.score }];
          })) };
          snapshot.results = [event.results];
        }
        picker = { ...picker, screen: sessionRegistrations[picker.focus]?.finalScreen ? 'starting' : 'start', revision: picker.revision + 1 };
        roomAdapter?.host({ type: 'phase', phase: 'results', allowRunningJoin: false }); restoreTeamChoice(); sendPicker(); publish();
      }
      else {
        deps.session?.stop?.(); discardTeams();
        roomAdapter?.host({ type: 'phase', phase: 'lobby', allowRunningJoin: false });
        picker = pairing === 'closed-room' ? { ...picker, screen: 'lobby', revision: picker.revision + 1 } : event.type === 'error' ? pickerFailed(picker, gameMetas) : { ...picker, screen: 'picker', revision: picker.revision + 1 };
        sendPicker(); publish();
      }
    },
    returnToPicker,
    stop(): void { stopped = true; deps.clock.cancel(retry); unsubscribeOnline?.(); attempt++; checkpoints?.flush(); retire(); },
  };
}
