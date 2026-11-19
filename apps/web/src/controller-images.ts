import type { AssetManifest } from '../../../tools/assets/manifest';
const pending = new Map<string, Promise<Readonly<Record<string, string>>>>();
/** Selection-only: no manifest, module or picture request during controller cold start. */
export function preloadControllerImages(id: string): Promise<Readonly<Record<string, string>>> {
  const existing = pending.get(id);
  if (existing) return existing;
  const task = (async () => {
    const declared = await (await import('./controller-image-declarations')).loadControllerImages(id);
    if (Object.keys(declared).length === 0) return {};
    const manifestURL = new URL('../../../assets/dist/manifest.json', import.meta.url);
    const response = await fetch(manifestURL);
    if (!response.ok) throw new Error('Controller pictures unavailable');
    const manifest = await response.json() as AssetManifest;
    const files = Object.values(manifest.rounds).flatMap(round => round.files);
    const outcomes = await Promise.allSettled(Object.entries(declared).map(async ([key, source]) => {
      const packed = files.find(file => file.source === source);
      if (!packed) throw new Error('Controller picture missing from packed assets');
      const url = new URL(packed.file, manifestURL).href;
      const image = new Image(); image.src = url; await image.decode();
      return [key, url] as const;
    }));
    // Finish every request before controls unlock, including when a picture fails.
    return Object.fromEntries(outcomes.flatMap(result => result.status === 'fulfilled' ? [result.value] : []));
  })();
  pending.set(id, task);
  void task.catch(() => { pending.delete(id); });
  return task;
}
