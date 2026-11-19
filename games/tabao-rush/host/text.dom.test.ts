import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { fontStack, tvType } from '../../../packages/ui/src/type';
import { CARD_LAYOUT } from './panels';
import { RECIPE_LABELS } from './view-model';
import { chromium } from 'playwright';
import { expect, it } from 'vitest';

it('fits placeholder recipe steps with the renderer TV font on a real canvas (TR-001)',async()=>{
  const source=readFileSync(new URL('./text.ts',import.meta.url),'utf8').replace(/^import .*;$/gm,'');
  const production=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
  const code=`
    const fontStack=${JSON.stringify(fontStack)},tvType=${JSON.stringify(tvType)},CARD=${String(CARD_LAYOUT.width)};
    ${production}
    window.measureSteps=async()=>{
      await Promise.all([document.fonts.load('34px '+fontStack.body,'Time Score Stars Tips 0123456789 ★☆'),document.fonts.load('bold 34px '+fontStack.body),document.fonts.ready]);
      const ctx=document.createElement('canvas').getContext('2d');
      ctx.font='bold 34px '+fontStack.body;
      for(const seat of '12345678'){
        const glyph=ctx.measureText(seat);
        if(glyph.actualBoundingBoxAscent+glyph.actualBoundingBoxDescent>25)throw new Error('Seat glyph exceeds centred 25 px envelope');
      }
      return ${JSON.stringify([...RECIPE_LABELS.values()])}.map(recipe=>{
        const lines=[];
        ctx.fillText=value=>lines.push({value,width:ctx.measureText(value).width,font:ctx.font});
        fittedText(ctx,recipe.steps,0,tvType.label,tvType.label,CARD-55);
        return {steps:recipe.steps,lines};
      });
    };
  `;
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage();await page.addScriptTag({type:'module',content:code});
    await page.waitForFunction(()=>Reflect.has(window,'measureSteps'));
    const measured=await page.evaluate(async()=>await (Reflect.get(window,'measureSteps') as ()=>Promise<{steps:string;lines:{value:string;width:number;font:string}[]}[]>)());
    expect(measured.length).toBeGreaterThan(0);
    for(const {steps,lines} of measured){
      expect(lines.map(line=>line.value).join(' '),steps).toBe(steps);
      expect(lines.length).toBeLessThanOrEqual(2);
      for(const line of lines){expect(line.width).toBeLessThanOrEqual(CARD_LAYOUT.width-55);expect(line.font.startsWith('21px')).toBe(true);}
    }
  }finally{await browser.close();}
},30000);
