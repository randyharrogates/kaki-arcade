/* eslint-disable @typescript-eslint/no-empty-function, @typescript-eslint/require-await -- Minimal Pixi/DOM stubs count allocations without a browser. */
/// <reference lib="dom" />
import { afterEach, expect, it, vi } from 'vitest';
import ts from 'typescript';
import type * as Pixi from 'pixi.js';
import { fileURLToPath } from 'node:url';
import { loadLevel } from '../src/levels/loader';
import { FULL_KITCHEN } from '../src/levels/catalogue';
import { tabaoRush } from '../src/rules/game';
import { projectX, projectY, TILE } from './model';
import type { View } from './model';
const apps=vi.hoisted(()=>({stages:[] as {children:{children:{zIndex:number;visible:boolean}[]}[]}[]}));
const metrics=vi.hoisted(()=>({nodes:0,textures:0,rasters:0,writes:0,sorts:0,encodes:0,uploads:0}));
vi.mock('pixi.js/prepare',()=>({}));
vi.mock('pixi.js',()=>{
  class Point{x=0;y=0;set(x:number,y=x){this.x=x;this.y=y;}}
  class Container{
    children:Container[]=[];parent:Container|undefined;position=new Point();scale=new Point();pivot=new Point();zIndex=0;visible=true;alpha=1;sortableChildren=false;
    get x(){return this.position.x;}get y(){return this.position.y;}
    constructor(){metrics.nodes++;this.children.sort=(...args:Parameters<Container[]['sort']>)=>{metrics.sorts++;return Array.prototype.sort.apply(this.children,args) as Container[];};}
    removeChild(node:Container){this.children.splice(this.children.indexOf(node),1);node.parent=undefined;}
    addChild(...nodes:Container[]){for(const node of nodes){this.children.push(node);node.parent=this;}}
  }
  class Texture{dynamic=false;frame={width:0,height:0};orig={width:0,height:0};source={update(){metrics.uploads++;},resize(){}};update(){}constructor(){metrics.textures++;}static from(){return new Texture();}destroy(){}}
  class Sprite extends Container{texture:Texture|undefined;tint=0;constructor(texture?:Texture){super();this.texture=texture;}}
  class Application{stage=new Container();canvas={style:{},setAttribute(){}};renderer={prepare:{async upload(){}}};async init(){apps.stages.push(this.stage);}stop(){}render(){}destroy(){}}
  return {Container,Texture,Sprite,Application};
});
vi.mock('./assets',async()=>{
  const {Texture}=await import('pixi.js');
  const packed={texture:new Texture(),frame:{rect:[0,0,89,89],trim:[0,0],sourceSize:[89,89],anchor:[0,0],anchors:{root:[0,0],hands:[0,-55],head:[0,-89]},metadata:{handsInFront:true}}};
  return {preload:async()=>({frames:new Map(['body','head-cap-e','head-cap-e-mask','item-chicken-raw','fire-0'].map(id=>[id,packed])),animations:new Map([['tabao-rush-effects:fire',{fps:1,frames:['fire-0']}],['tabao-rush-cook-body:idle',{action:'idle',fps:1,loop:true,directions:{e:['body']}}],['tabao-rush-cook-body:carry-walk',{action:'carry-walk',fps:1,loop:true,directions:{e:['body']}}]]),divisor:1,destroy(){}})};
});
afterEach(()=>vi.unstubAllGlobals());
it('drives the mounted update through changing cooks, items, station progress and panels without growing render storage (PERF-001)',async()=>{
  const drawn:string[]=[];
  const ctx=new Proxy({fillText:(value:string)=>{drawn.push(value);},measureText:(value:string)=>({width:value.length*8}),createLinearGradient:()=>({addColorStop(){}})}, {get(target,key){return key in target?target[key as keyof typeof target]:()=>{};}});
  vi.stubGlobal('document',{fonts:{load:async()=>[],ready:Promise.resolve()},createElement(){metrics.rasters++;return {width:0,height:0,getContext:()=>ctx,toDataURL:()=>{metrics.encodes++;return ''}};}});
  vi.stubGlobal('matchMedia',()=>({matches:false}));let render:FrameRequestCallback=()=>{};vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>{render=callback;return 1;});vi.stubGlobal('cancelAnimationFrame',()=>{});
  const dataset=new Proxy<Record<string,string>>({},{set(target,key,value:string){metrics.writes++;target[String(key)]=value;return true;}});
  const root={append(){},dataset,style:{}} as unknown as HTMLElement;
  const state=loadLevel(FULL_KITCHEN,707,[{id:'a',name:'A',seat:1,colour:'seat-1'}]).state;if(!state)throw new Error('Fixture');
  const view=tabaoRush.publicView(state) as View;
  // Prepare views outside the measured update path; no unchanged-view identity tautology.
  const views=Array.from({length:32},(_,i)=>({...view,tick:120+i,cooks:view.cooks.map(c=>({...c,x:2+i/32,y:3,facing:0 as const})),items:[{id:1,kind:'raw' as const,ingredient:'chicken' as const,place:{kind:'held' as const,cook:'a'}}],kitchens:[{id:'coop',score:120,tips:20,stars:2,orders:Array.from({length:6},(_,n)=>({id:n,dish:'chicken-rice',remaining:2400-i*60,total:3600,warning:false,arrivalStep:0}))}],orderEvents:[{type:'served' as const,kitchen:'coop',order:i%6,dish:'chicken-rice',step:120+i,cook:'a',seat:1,points:100,tip:i%2?12:0,delta:100}],stations:view.stations.map(s=>({...s,progress:i+1,total:60}))}));
  const {createScreen}=await import('./screen');const screen=await createScreen(root,{view:views[0],width:1920,height:1080},()=>false);expect(screen).toBeDefined();
  for(const next of views)screen?.update({view:next,width:1920,height:1080});
  const before={...metrics};
  for(let i=0;i<3600;i++){screen?.update({view:views[i%32],width:1920,height:1080});render(performance.now()+16);}
  expect(metrics.nodes).toBe(before.nodes);expect(metrics.textures).toBe(before.textures);expect(metrics.rasters).toBe(before.rasters);expect(metrics.writes).toBe(before.writes);expect(metrics.sorts).toBe(before.sorts);
  expect(drawn).toContain('+100 · tip +12');expect(drawn).toContain('+100');expect(metrics.encodes).toBe(before.encodes);expect(drawn.some(value=>value.startsWith('Tips '))).toBe(false);
  const {createPanels}=await import('./panels');const {Container}=await import('pixi.js');
  const stage=new Container();const panels=createPanels(stage,{frames:new Map()} as Parameters<typeof createPanels>[1],view.stations.length);
  const north=view.stations.find(s=>Math.floor(s.tile/view.level.width)===0);if(!north)throw new Error('North station');
  panels.update({...view,cooks:view.cooks.map(c=>({...c,x:north.tile%view.level.width+0.5,y:1.5}))},false);
  const seat=stage.children.find(s=>s.zIndex===30000);expect(seat).toBeDefined();
  expect(stage.children.every(s=>s.zIndex<=30000||s.zIndex===100000)).toBe(true);
  expect(panels.stations[view.stations.indexOf(north)]?.sprite.zIndex).toBeLessThan(seat?.zIndex ?? 0);
  expect(panels.stations.every(s=>s.cue.sprite.zIndex<(seat?.zIndex ?? 0)&&s.note.sprite.zIndex<(seat?.zIndex ?? 0))).toBe(true);
  expect(seat?.position.x).toBe(projectX(north.tile%view.level.width+0.5,view.level.width)-27.5);
  const firstCook=view.cooks[0];if(!firstCook)throw new Error('Cook');
  for(const x of [1.2,1.5,2.2,view.level.width-1.2]){
    panels.update({...view,cooks:[{...firstCook,x,y:1.5},{...firstCook,x:x+0.4,y:1.5,id:'b'}]},false);
    const markers=stage.children.filter(s=>s.zIndex===30000&&s.visible);
    expect(markers[0]?.position.x).toBe(projectX(x,view.level.width)-27.5);
    expect((markers[1]?.position.x ?? 0)-(markers[0]?.position.x ?? 0)).toBeCloseTo(0.4*TILE);
  }
  const cookDepth=projectY(1.5,view.level.height)*10;
  expect(panels.stations[view.stations.indexOf(north)]?.sprite.zIndex).toBeLessThan(cookDepth);
  expect(panels.stations.every(s=>s.cue.sprite.zIndex>cookDepth&&s.cue.sprite.zIndex<30000)).toBe(true);
  expect(drawn.some(value=>['Empty','Work','Done','Fire','Burnt'].includes(value))).toBe(false);
  // A raw progress sweep publishes only the eight changes in visible cell count.
  const working:View['stations'][number]={...north,status:'working',fire:false,total:800,progress:0};
  const sweep={...view,orderEvents:[],stations:[working]};
  const isolated=createPanels(new Container(),{frames:new Map()} as Parameters<typeof createPanels>[1],1);
  isolated.update(sweep,false);const uploads=metrics.uploads;
  for(let progress=1;progress<=800;progress++){working.progress=progress;isolated.update(sweep,false);}
  expect(metrics.uploads-uploads).toBe(8);
  working.status='done';isolated.update({...sweep,tick:900},false);
  isolated.render(907,false);expect(isolated.stations[0]?.cue.sprite.scale.x).toBeGreaterThan(1);
  isolated.render(914,false);expect(isolated.stations[0]?.cue.sprite.scale.x).toBe(1);
  isolated.render(907,true);expect(isolated.stations[0]?.cue.sprite.scale.x).toBe(1);
  const burning={...view,stations:view.stations.map(s=>({...s,fire:true})),cooks:view.cooks.map(c=>({...c,y:view.level.height-1.5}))};
  screen?.update({view:burning,width:1920,height:1080});
  const actual=apps.stages[0]?.children[0]?.children ?? [];
  const fires=actual.filter(s=>s.visible&&s.zIndex===19999.5);
  expect(fires.length).toBeGreaterThan(0);
  const expectedCook=projectY(view.level.height-1.5,view.level.height)*10;
  const cookSprites=actual.filter(s=>s.visible&&Math.abs(s.zIndex-expectedCook)<0.2);
  expect(cookSprites.length).toBeGreaterThan(0);
  const deepestCook=Math.max(...cookSprites.map(s=>s.zIndex));
  for(const fire of fires){expect(fire.zIndex).toBeGreaterThan(deepestCook);expect(fire.zIndex).toBeLessThan(panels.stations[0]?.cue.sprite.zIndex ?? 0);}
  const remount=createPanels(new Container(),{frames:new Map()} as Parameters<typeof createPanels>[1],1);
  remount.update({...sweep,tick:900},false);remount.render(907,false);expect(remount.stations[0]?.cue.sprite.scale.x).toBe(1);remount.destroy();
  working.rejection={code:'dirty'};isolated.update({...sweep,tick:915},false);
  const note=isolated.stations[0]?.note.sprite,held=[note?.x,note?.y];
  isolated.render(916,false);isolated.update({...sweep,tick:916,cooks:view.cooks.map(c=>({...c,x:7,y:4}))},false);
  expect([note?.x,note?.y]).toEqual(held);
  for(let i=0;i<isolated.hud.length;i++){
    const panel=isolated.hud[i];expect(panel?.canvas.width).toBe(377);
    expect(panel?.texture.dynamic).toBe(true);
    expect(panel?.texture.frame.width).toBe(panel?.drawnWidth);
    if(i>0){const previous=isolated.hud[i-1];expect((panel?.drawnBox.x ?? 0)-(previous?.drawnBox.x ?? 0)-(previous?.drawnBox.width ?? 0)).toBe(13);}
  }
  const beforeTypeChange=metrics.uploads;working.type=working.type==='sink'?'chop':'sink';isolated.update({...sweep,tick:917},false);expect(metrics.uploads-beforeTypeChange).toBe(2);
  isolated.destroy();
  panels.destroy();screen?.destroy();
});
it('rejects per-step object/array construction in the real update, place, draw and panel functions',()=>{
  const forbidden:string[]=[];
  const program=ts.createProgram(['screen.ts','panels.ts','view-model.ts','model.ts','text.ts','item-model.ts','station-cue.ts'].map(file=>fileURLToPath(new URL(file,import.meta.url))),{target:ts.ScriptTarget.Latest,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,strict:true,skipLibCheck:true});
  const checker=program.getTypeChecker();
  for(const file of ['screen.ts','panels.ts','view-model.ts','model.ts','text.ts','item-model.ts']){
    const path=fileURLToPath(new URL(file,import.meta.url));const source=program.getSourceFile(path);if(!source)throw new Error(path);
    const scan=(node:ts.Node):void=>{if(ts.isObjectLiteralExpression(node)||ts.isArrayLiteralExpression(node)||ts.isNewExpression(node)||ts.isArrowFunction(node)||ts.isFunctionExpression(node)||ts.isForOfStatement(node))forbidden.push(`${file}:${String(source.getLineAndCharacterOfPosition(node.pos).line+1)}`);ts.forEachChild(node,scan);};
    const visit=(node:ts.Node):void=>{if((ts.isFunctionDeclaration(node)||ts.isMethodDeclaration(node))&&node.name&&['update','place','drawItems','drawItem','render','animation','fitHud','cookIndex','action','setDepth','fittedText','displayName','rejectionText','positionNotes','add','layers','itemModel','rebuild','setHudWidth'].includes(node.name.getText(source))&&node.body)scan(node.body);else ts.forEachChild(node,visit);};visit(source);
  }
  // Follow local/imported calls with their publication context; arbitrary !== guards do not qualify.
  const dirtyGuards=new Set([
    'hudSeconds!==vm.seconds','hudScore!==vm.score','hudStars!==vm.stars',
    'card.patience!==patience||card.urgency!==urgency',
    'r.nameLevel!==view.level||r.nameTile!==station.tile||r.nameType!==station.type',
    'r.rejection!==rejection','colour!==r.colour||seat!==r.seat',
    'cached.name!==name','!backgroundTexture || previous.level!==view.level',
    'viewportWidth!==options.width||viewportHeight!==options.height',
    '(import.meta as ImportMeta & {env:{DEV:boolean}}).env.DEV',
  ]);
  const seen=new Set<string>();
  const walk=(node:ts.Node,dirty:boolean):void=>{
    const source=node.getSourceFile();
    if(ts.isBlock(node)){
      let changed=dirty;
      for(const statement of node.statements){
        walk(statement,changed);
        if(ts.isIfStatement(statement)&&statement.expression.getText(source)==='known'&&ts.isContinueStatement(statement.thenStatement))changed=true;
        if(ts.isIfStatement(statement)&&statement.expression.getText(source)==='model.id===item.id&&model.kind===item.kind&&model.ingredient===item.ingredient&&model.container===item.container&&model.contents===item.contents&&model.cup===item.cup&&model.processes===item.processes'&&ts.isReturnStatement(statement.thenStatement))changed=true;
      }
      return;
    }
    if(ts.isConditionalExpression(node)&&node.condition.getText(source)==='station.rejection===r.rejectionRef'){
      walk(node.condition,dirty);walk(node.whenTrue,dirty);walk(node.whenFalse,true);return;
    }
    if(ts.isIfStatement(node)){
      walk(node.expression,dirty);walk(node.thenStatement,dirty||dirtyGuards.has(node.expression.getText(source)));if(node.elseStatement)walk(node.elseStatement,dirty);return;
    }
    const plus=ts.isBinaryExpression(node)&&node.operatorToken.kind===ts.SyntaxKind.PlusToken&&(checker.getTypeAtLocation(node).flags&ts.TypeFlags.StringLike)!==0;
    const call=ts.isCallExpression(node);
    const conversion=call&&(node.expression.getText(source)==='String'||ts.isPropertyAccessExpression(node.expression)&&node.expression.name.text==='padStart');
    if(!dirty&&(ts.isTemplateExpression(node)||ts.isNoSubstitutionTemplateLiteral(node)||plus||conversion))forbidden.push(`${source.fileName}:string:${String(source.getLineAndCharacterOfPosition(node.pos).line+1)}`);
    if(call){
      const declaration=checker.getResolvedSignature(node)?.declaration;
      if(declaration&&'body' in declaration&&declaration.body&&!declaration.getSourceFile().isDeclarationFile&&!declaration.getSourceFile().fileName.includes('/node_modules/')){
        const key=`${declaration.getSourceFile().fileName}:${String(declaration.pos)}:${String(dirty)}`;
        if(!seen.has(key)){seen.add(key);walk(declaration.body,dirty);}
      }
    }
    ts.forEachChild(node,child=>{walk(child,dirty);});
  };
  for(const path of program.getRootFileNames()){
    const source=program.getSourceFile(path);if(!source)continue;
    const roots=(node:ts.Node):void=>{if((ts.isFunctionDeclaration(node)||ts.isMethodDeclaration(node))&&node.name&&['update','render'].includes(node.name.getText(source))&&node.body)walk(node.body,false);else ts.forEachChild(node,roots);};roots(source);
  }
  expect(forbidden).toEqual([]);
});

it('keeps real Pixi HUD drawn width equal to layout through score changes without resizing the source (TR-001)',async()=>{
  const {Texture,TextureSource,Sprite}=await vi.importActual<typeof Pixi>('pixi.js');
  const {setHudWidth}=await import('./panels');
  const source=new TextureSource({width:377,height:102});const texture=new Texture({source,dynamic:true});const sprite=new Sprite(texture);
  for(const width of [178,233,144,377,178]){sprite.didViewUpdate=false;setHudWidth(texture,width);expect(sprite.didViewUpdate).toBe(true);expect(sprite.width).toBe(width);expect(texture.frame.width).toBe(width);expect(source.width).toBe(377);}
  sprite.destroy();texture.destroy(true);
});
