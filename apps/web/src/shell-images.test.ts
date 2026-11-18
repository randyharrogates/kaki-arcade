import { expect, it } from 'vitest';
import { gameMetas } from './game-registry';
import { shellPictures } from './shell-images';

it('PLAT-020 supplies a shell picture for every installed game', () => {
  for (const game of gameMetas) expect(shellPictures[game.id], game.id).toBeDefined();
});
