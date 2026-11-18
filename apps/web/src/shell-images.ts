import tabao from './images/tabao-rush.webp';
import poker from './images/peek-poker.webp';
import rabakz from './images/rabakz.webp';

export const shellPictures: Record<string, { src: string; alt: string }> = {
  'tabao-rush': { src: tabao, alt: 'Three cooks preparing food together in a hawker kitchen' },
  'peek-poker': { src: poker, alt: 'A hand choosing from a four by four grid of face-down cards on green felt' },
  rabakz: { src: rabakz, alt: 'Four coloured answer cards behind phones used as quiz buzzers' },
};
let ready = false;
export function shellPicturesReady(): boolean { return ready; }
let loading: Promise<void> | undefined;
/** Decode all three before mounting any picker tile; retain the decoded images. */
const decoded: HTMLImageElement[] = [];
export function preloadShellPictures(): Promise<void> {
  return loading ??= Promise.all(Object.values(shellPictures).map(async picture => {
    const image = new Image(); image.src = picture.src;
    await image.decode(); decoded.push(image);
  })).then(() => { ready = true; }).catch((error: unknown) => { loading = undefined; throw error; });
}
