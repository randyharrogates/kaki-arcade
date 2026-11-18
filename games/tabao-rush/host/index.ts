import { createScreen } from './screen';
import type { Options } from './screen';
export const ConsoleScreen = {
  mount(root: HTMLElement, initial: Options) {
    let latest=initial, destroyed=false;
    let screen: Awaited<ReturnType<typeof createScreen>>;
    const ready=createScreen(root,initial,()=>destroyed).then(prepared=>{screen=prepared; if(destroyed) screen?.destroy(); else screen?.update(latest);});
    return {ready,update(options:Options){latest=options;screen?.update(options);},destroy(){destroyed=true;screen?.destroy();}};
  },
};
export { publicViewKey, createPublicViewKey } from './view-key';
