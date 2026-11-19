/* eslint-disable @typescript-eslint/prefer-for-of -- Indexed hot loops avoid iterator allocation. */
import { PLAYER_COLOURS, TEAM_THEMES, ON_COLOUR } from '../../../packages/ui/src/colour';
import { RECIPES } from '../src/rules/recipes';
import type { View } from './model';
export const RECIPE_LABELS = new Map(RECIPES.map(recipe => [recipe.id, {
  name: recipe.name,
  steps: [...new Set(recipe.ingredients.flatMap(part => part.steps)), ...recipe.assembly].map(step=>step.charAt(0).toUpperCase()+step.slice(1)).join(' '), // Capitalised words, space-separated: ' · ' needs three lines on a 123 px card; placeholder until A-11 icons.
}]));
/** Fixed storage, updated in place; only displayed text/quantised bars dirty the raster. */
export class ViewModel {
  readonly ids: Int32Array;
  readonly positions: Float64Array;
  readonly cards = Array.from({length:6},()=>({id:-1,dish:'',patience:-1,warning:false}));
  score=0; tips=0; stars=0; seconds=-1; count=0; dirty=true;
  constructor(capacity=3292){this.ids=new Int32Array(capacity);this.positions=new Float64Array(capacity*2);this.positions.fill(NaN);}
  update(view:View):void {
    let score=0,tips=0,stars=0,count=0;
    this.dirty=false;
    for(let ki=0;ki<view.kitchens.length;ki++){const kitchen=view.kitchens[ki];if(!kitchen)continue;score+=kitchen.score;tips+=kitchen.tips;stars=Math.max(stars,kitchen.stars);
      for(let oi=0;oi<kitchen.orders.length;oi++){const order=kitchen.orders[oi];if(!order)continue;if(count===6)break;const card=this.cards[count++];if(!card)continue;
        const patience=Math.ceil(order.remaining/order.total*89);
        if(card.id!==order.id||card.dish!==order.dish||card.patience!==patience||card.warning!==order.warning)this.dirty=true;
        card.id=order.id;card.dish=order.dish;card.patience=patience;card.warning=order.warning;
      }
    }
    const seconds=Math.ceil(view.timer.remaining/60);
    if(score!==this.score||tips!==this.tips||stars!==this.stars||seconds!==this.seconds||count!==this.count)this.dirty=true;
    this.score=score;this.tips=tips;this.stars=stars;this.seconds=seconds;this.count=count;
  }
}

export function playerFor(view:View,id:string){for(let i=0;i<view.players.length;i++){const player=view.players[i];if(player?.id===id)return player;}return undefined;}
const COLOURS=new Map<string,string>(PLAYER_COLOURS.map(player=>[player.token,player.colour]));
export function colourFor(view:View,index:number){const cook=view.cooks[index],player=cook?playerFor(view,cook.id):undefined;if(player?.team !== undefined)return player.team === 0 ? TEAM_THEMES.red.colour : TEAM_THEMES.blue.colour;return COLOURS.get(player?.colour ?? 'seat-1') ?? PLAYER_COLOURS[index%8]?.colour ?? '';}

const TINTS=new Map<string,number>(PLAYER_COLOURS.map(player=>[player.colour,Number.parseInt(player.colour.slice(1),16)]));
export function tintFor(colour:string){return TINTS.get(colour) ?? Number.parseInt(ON_COLOUR.slice(1),16);}
