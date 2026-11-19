import { RECIPES } from '../src/rules/recipes';
import type { Item } from '../src/rules/state';
/** Complete, rule-valid servings for the renderer review (TR-040, TR-041). */
export function servedDishes(drink='kopi'):Item[]{
  return RECIPES.map((recipe,index)=>{
    const contents=recipe.ingredients.map((part,i)=>({id:1000+index*10+i,ingredient:part.ingredient==='drink'?drink:part.ingredient,kind:part.steps.includes('chop')&&!part.steps.includes('wok')&&!part.steps.includes('grill')?'chopped' as const:'cooked' as const,processes:part.steps}));
    const cup=recipe.id==='kaya-toast'?{id:2000,kind:'plate' as const,container:'cup' as const,place:{kind:'counter' as const,tile:0},contents:contents.slice(1)}:undefined;
    return {id:800+index,kind:'plate',container:recipe.container,contents:cup?contents.slice(0,1):contents,processes:recipe.assembly,...(cup?{cup}:{}),place:{kind:'counter',tile:0}};
  });
}
