import { createElement, render } from 'preact';
import { HostGameScreen } from './host-game-screen';
import { loadSessionGame } from './session-loading';
import type { ScreenProps } from './session-adapter';
/** T-07 review entry: exercise the real registry and MountedScreen without pairing. */
export async function mountTabaoRenderer(root:HTMLElement,initial:ScreenProps){
  const {Screen,viewKey}=await loadSessionGame('tabao-rush');
  let last:unknown,lastWidth=-1,lastHeight=-1;
  if(!Screen)throw new Error('Missing Tabao Rush screen registration');
  let resolveReady: (()=>void)|undefined;
  const ready=new Promise<void>(resolve=>{resolveReady=resolve;});
  const draw=(options:ScreenProps)=>{const key=viewKey?.(options.view);if(key!==undefined&&key===last&&options.width===lastWidth&&options.height===lastHeight)return;last=key;lastWidth=options.width;lastHeight=options.height;render(createElement(HostGameScreen,{...options,Screen,ready:(error?:unknown)=>{
    if(error)throw new Error('Tabao Rush preparation failed',{cause:error});
    document.documentElement.dataset.trProductionReady='1';resolveReady?.();
  }}),root);};
  draw(initial);return {ready,update:draw,destroy(){render(null,root);}};
}

export async function start(){
  // Runtime-only dev URL keeps the fixture outside the app's production TS project.
  const url=new URLSearchParams(location.search).get('fixture');
  if(!url?.startsWith('/@fs/'))throw new Error('UAT fixture module URL required');
  const fixture=await import(/* @vite-ignore */ url) as {startRenderer(mount:(root:HTMLElement,options:{view:unknown;width:number;height:number})=>ReturnType<typeof mountTabaoRenderer>):Promise<void>};
  await fixture.startRenderer((root,options)=>mountTabaoRenderer(root,{...options,view:options.view as never}));
}
