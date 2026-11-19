import { tabaoRush as game } from './game';
/** Legacy gameplay fixtures begin after selection; picker tests use the real module. */
export const tabaoRush: typeof game = { ...game, init(...args) {
  const { picks, ...state } = game.init(...args);
  if (!picks) throw new Error('Missing cook selections in gameplay fixture');
  return { ...state, phase: 'play' };
} };
