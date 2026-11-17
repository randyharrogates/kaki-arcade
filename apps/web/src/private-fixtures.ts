import type { PrivateView } from '../../../packages/controller-kit/src/layout-types';
export const privateFixtures: Readonly<Record<string,PrivateView>> = {
  text:{ revision:1,blocks:[{ kind:'text',tone:'title',text:'Your secret message' },{ kind:'text',text:'Only this phone can see this.' },{ kind:'text',tone:'note',text:'Watch the TV when ready.' }] },
  cards:{ revision:1,blocks:[{ kind:'cards',cards:[{ id:'q',label:'Q',mark:'spade' },{ id:'a',label:'A',mark:'heart',faceDown:true }] }] },
  revealed:{ revision:2,blocks:[{ kind:'cards',cards:[{ id:'q',label:'Q',mark:'spade' },{ id:'a',label:'A',mark:'heart' }] }] },
  stats:{ revision:1,blocks:[{ kind:'stat',label:'Points',value:100 },{ kind:'stat',label:'Streak',value:3 }] },
  grid:{ revision:1,blocks:[{ kind:'grid',rows:4,cols:4,cells:Array.from({ length:16 },(_,i) => ({ label:String(i+1),...(i === 1 || i === 10 ? { state:'selected' as const } : {}) })) }] },
  'cards-1':{ revision:1,blocks:[{ kind:'cards',cards:[{ id:'a',label:'A',mark:'heart' }] }] },
  'cards-3':{ revision:1,blocks:[{ kind:'cards',cards:Array.from({ length:3 },(_,i) => ({ id:String(i),label:String(i+1) })) }] },
  'cards-5':{ revision:1,blocks:[{ kind:'cards',cards:Array.from({ length:5 },(_,i) => ({ id:String(i),label:String(i+1) })) }] },
  rabakz:{ revision:1,blocks:[{ kind:'stat',label:'Points',value:100 },{ kind:'stat',label:'Streak',value:3 },{ kind:'stat',label:'Place',value:1 },{ kind:'text',text:'Wait for the next question.' }] },
  'stats-second':{ revision:1,blocks:[{ kind:'stat',label:'Round points',value:12345 },{ kind:'stat',label:'Team streak',value:12 }] },
  'long-text':{ revision:1,blocks:[{ kind:'text',text:'Your secret message '.repeat(8) }] },
  'text-cards':{ revision:1,blocks:[{ kind:'text',text:'Your hand' },{ kind:'cards',cards:[{ id:'a',label:'A' }] }] },
  'grid-words':{ revision:1,blocks:[{ kind:'grid',rows:2,cols:3,cells:['Kitchen','Counter','Steamer','Dumplings','Wonton','Chicken'].map(label => ({ label })) }] },
  empty:{ revision:1,blocks:[] },
  picker:{ revision:1,blocks:[{ kind:'text',text:'Your picks are secret',tone:'note' }] },
};
