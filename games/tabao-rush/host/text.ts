import { fontStack, tvType } from '../../../packages/ui/src/type';
import type { Rejection } from '../src/rules/recipes';
const names:Readonly<Record<string,string>>={'return-counter':'Return',extinguisher:'Extinguisher',serving:'Serve',plating:'Plate','dish-rack':'Rack',rice:'Rice pot','laksa-broth':'Broth','kway-teow':'Kway teow',noodles:'Noodles'};
export const processing=new Set(['chop','wok','pot','grill','rice','drinks','plating','sink']);
export function displayName(value:string):string{return names[value] ?? value.charAt(0).toUpperCase()+value.slice(1);}
const reasons:Readonly<Record<Rejection['code'],string>>={'not-ordered':'Not on the order board','wrong-container':'Needs a different dish','missing-ingredient':'Missing an ingredient','missing-step':'A step is missing','extra-step':'Cooked one step too many','extra-ingredient':'Something extra is in it',burnt:'It is burnt','unknown-combination':'That is not a dish','nothing-to-serve':'Nothing to serve','missing-return-counter':'No return counter here',dirty:'Plate is dirty'};
export function rejectionText(reason:Rejection):string{return reason.code==='missing-ingredient'?'Missing '+(reason.ingredient==='rice'?'rice':displayName(reason.ingredient).toLowerCase()):reasons[reason.code];}
/** D-257: station and crate names wrap at body size before using the label token.
 * Keep this entry point separate from cards, state words, rejection notes and HUD. */
export function nameText(ctx:CanvasRenderingContext2D,value:string,x:number,y:number,width:number,maxLines=2){
  fittedText(ctx,value,x,y,tvType.body,width,false,tvType.label,maxLines);
}
/** Whole-word wrapping; only names and recipe placeholders may shrink to the TV label floor.
 * An impossible word is omitted rather than painted beyond the region. */
export function fittedText(ctx:CanvasRenderingContext2D,value:string,x:number,y:number,size:number,width:number,display=false,minimum=size,maxLines=2){
  let candidate=size;
  while(candidate>=minimum){
    ctx.font=`${String(candidate)}px ${display?fontStack.display:fontStack.body}`;
    let start=0,lines=1,valid=true;
    while(start<value.length){let end=value.indexOf(' ',start);if(end<0)end=value.length;let best=start;
      while(end<=value.length&&ctx.measureText(value.slice(start,end)).width<=width){best=end;if(end===value.length)break;end=value.indexOf(' ',end+1);if(end<0)end=value.length;}
      if(best===start){valid=false;break;}start=best+1;if(start<value.length)lines++;
    }
    if(valid&&lines<=maxLines)break;
    if(candidate===minimum)return;
    candidate=Math.max(minimum,tvType.label);
  }
  let start=0,line=0;
  while(start<value.length&&line<maxLines){let end=value.indexOf(' ',start);if(end<0)end=value.length;let best=start;
    while(end<=value.length&&ctx.measureText(value.slice(start,end)).width<=width){best=end;if(end===value.length)break;end=value.indexOf(' ',end+1);if(end<0)end=value.length;}
    if(best===start)return;ctx.fillText(value.slice(start,best),x,y+line*candidate);start=best+1;line++;
  }
}

/** Insets only where another labelled tile shares the row. */
export function nameInset(level:{width:number;extinguisherTile?:number;tiles:readonly {kind:string}[]},tile:number,side:number):number {
  const neighbour=tile+side;
  return Math.floor(neighbour/level.width)===Math.floor(tile/level.width)&&(level.tiles[neighbour]?.kind==='station'||neighbour===level.extinguisherTile)?5:0;
}
