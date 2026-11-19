import { afterEach, expect, it, vi } from 'vitest';
const registryLoaded = vi.fn();
vi.mock('./game-registry', () => { registryLoaded(); return { loadGame: vi.fn() }; });
vi.mock('./controller-image-declarations', () => ({loadControllerImages:vi.fn(() => Promise.resolve({picture:'art/picture.png','picture-mask':'art/mask.png'}))}));
afterEach(()=>{vi.unstubAllGlobals();vi.resetModules();});
it('PERF-020 PERF-023 declares no cold-start requests and preloads hashed pictures once after selection',async()=>{
  const decode=vi.fn(()=>Promise.resolve());
  vi.stubGlobal('Image',class {src='';decode=decode;});
  const fetch=vi.fn(()=>Promise.resolve({ok:true,json:()=>Promise.resolve({rounds:{match:{files:[{source:'art/picture.png',file:'picture.123.webp'},{source:'art/mask.png',file:'mask.123.webp'}]}}})}));
  vi.stubGlobal('fetch',fetch);
  const {preloadControllerImages}=await import('./controller-images');
  expect(fetch).not.toHaveBeenCalled();
  const first=preloadControllerImages('pictures'),second=preloadControllerImages('pictures');
  expect(second).toBe(first);
  const images=await first;
  expect(images.picture).toMatch(/\/picture\.123\.webp$/);
  expect(images['picture-mask']).toMatch(/\/mask\.123\.webp$/);
  expect(fetch).toHaveBeenCalledTimes(1);expect(decode).toHaveBeenCalledTimes(2);
  // The picture preload must not pull in the host game registry (and with it every game module).
  expect(registryLoaded).not.toHaveBeenCalled();
});
it('PERF-023 waits for remaining pictures after a failure, then uses text fallback for the failed picture',async()=>{
  let finishMask:(()=>void)|undefined;
  const decode=vi.fn((source:string)=>source.endsWith('/picture.123.webp') ? Promise.reject(new Error('Picture failed')) : new Promise<void>(resolve=>{finishMask=resolve;}));
  vi.stubGlobal('Image',class {src='';decode(){return decode(this.src);}});
  vi.stubGlobal('fetch',vi.fn(()=>Promise.resolve({ok:true,json:()=>Promise.resolve({rounds:{match:{files:[{source:'art/picture.png',file:'picture.123.webp'},{source:'art/mask.png',file:'mask.123.webp'}]}}})})));
  const {preloadControllerImages}=await import('./controller-images');
  const loading=preloadControllerImages('failed-picture');
  let settled=false;void loading.then(()=>{settled=true;});
  await vi.waitFor(()=>{expect(decode).toHaveBeenCalledTimes(2);});
  expect(settled).toBe(false);
  if(!finishMask)throw Error('Mask request not started');finishMask();
  const images=await loading;
  expect(images.picture).toBeUndefined();expect(images['picture-mask']).toMatch(/\/mask\.123\.webp$/);
});
