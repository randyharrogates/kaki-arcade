import type { Layout, LayoutPart } from '../../../packages/controller-kit/src/layout-types';
const faces: LayoutPart[] = [
  { kind:'button',id:'pick',button:'face-bottom',label:'Pick up' },
  { kind:'button',id:'act',button:'face-right',label:'Act' },
  { kind:'button',id:'dash',button:'face-left',label:'Dash' },
  { kind:'button',id:'throw',button:'face-top',label:'Throw' },
];
const answers: LayoutPart = { kind:'options',id:'answers',size:'large',options:[
  { id:'a',label:'Answer one',face:'face-bottom' }, { id:'b',label:'Answer two',face:'face-right' },
  { id:'c',label:'Answer three',face:'face-left' }, { id:'d',label:'Answer four',face:'face-top' },
] };
const grid: LayoutPart = { kind:'grid',id:'grid',rows:4,cols:4,cells:Array.from({ length:16 },(_,i) => ({ label:String(i+1), ...(i === 0 ? { state:'selected' as const } : {}) })) };
export const layoutFixtures: Readonly<Record<string, Layout>> = {
  'stick-faces':{ revision:1,controls:[{ kind:'stick',id:'move' },...faces] },
  'long-answer':{ revision:1,controls:[{ ...answers,options:answers.options.map((o,i) => i === 0 ? { ...o,label:'Modular Interface of Digital Instruments' } : o) }] },
  'hidden-cards':{ revision:1,controls:[{ kind:'cards',id:'hidden',tappable:true,cards:[{ id:'back',label:'Secret',faceDown:true },{ id:'disabled',label:'Secret',faceDown:true,state:'disabled' }] }] },
  'readonly-hidden-cards':{ revision:1,controls:[{ kind:'cards',id:'hidden',tappable:false,cards:[{ id:'back',label:'Secret',face:'face-bottom',colour:'shape-cross',faceDown:true },{ id:'disabled',label:'Secret',faceDown:true,state:'disabled' }] }] },
  options:{ revision:1,controls:[answers] },
  shoulders:{ revision:1,controls:[{ kind:'stick',id:'move' },...faces,{ kind:'button',id:'l',button:'shoulder-left',label:'L' },{ kind:'button',id:'r',button:'shoulder-right',label:'R' }] },
  'disabled-faces':{ revision:1,controls:faces.map(c => ({ ...c,disabled:true })) },
  'disabled-options':{ revision:1,controls:[{ ...answers,options:answers.options.map(o => ({ ...o,state:'disabled' as const })) }] },
  'selected-picker':{ revision:1,controls:[{ ...grid,cells:grid.cells.map(c => ({ ...c,state:'selected' as const })) },{ kind:'options',id:'lock',size:'large',options:[{ id:'lock',label:'Lock in',face:'face-bottom' }] }] },
  watch:{ revision:2,controls:[{ kind:'text',id:'watch',text:'Watch the TV',tone:'title' }] },
  picker:{ revision:1,controls:[grid,{ kind:'options',id:'lock',size:'large',options:[{ id:'lock',label:'Lock in',face:'face-bottom' }] }] },
  'dpad-only':{ revision:1,controls:[{ kind:'dpad',id:'directions' }] },
  'text-only':{ revision:1,controls:[{ kind:'text',id:'watch',text:'Watch the TV',tone:'title' }] },
  cards:{ revision:1,controls:[{ kind:'cards',id:'hand',tappable:true,cards:[{ id:'queen',label:'Q',mark:'spade' },{ id:'ten',label:'10',mark:'heart',state:'disabled' }] }] },
  // Diagnostic catalogue: intentionally exceeds a phone, reported by data-fits=false.
  every:{ revision:1,controls:[{ kind:'stick',id:'move' },{ kind:'dpad',id:'directions' },...faces,{ kind:'button',id:'l',button:'shoulder-left',label:'L' },{ kind:'button',id:'r',button:'shoulder-right',label:'R' },answers,grid,{ kind:'cards',id:'hand',tappable:true,cards:[{ id:'q',label:'Q' }] },{ kind:'text',id:'note',text:'Every kind',tone:'note' },{ kind:'swipe',id:'swipe' },{ kind:'shake',id:'shake',button:'face-bottom' },{ kind:'tilt',id:'tilt' }] },
};

/** Match the platform session: every changed wire layout advances its revision. */
export function nextWireLayout(previous: Layout | null, next: Layout): Layout {
  return { ...next,revision:previous ? previous.revision + (JSON.stringify(previous.controls) === JSON.stringify(next.controls) ? 0 : 1) : next.revision };
}
