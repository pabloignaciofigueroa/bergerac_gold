import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
await fs.mkdir('.runtime/cube-framing',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
const page=await browser.newPage({deviceScaleFactor:1});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
const report=[];
// Isolate the canvas pixels without moving surrounding layout. Their actual
// bounds are recorded below so the pixel check also detects content overlaps.
const isolate={style:'.hero-wordmark,.hero-copy,.hero-foot,.site-header{visibility:hidden!important}'};
try{
 for(const width of [601,768,877,916,1024,1289,1440,1920]){
  await page.setViewportSize({width,height:1000});
  await page.goto('http://127.0.0.1:5173/');
  await page.waitForFunction(()=>document.querySelector('#cube-stage').dataset.renderState==='ready');
  await page.waitForTimeout(850);
  const canvas=page.locator('#cube-stage canvas');
  await canvas.scrollIntoViewIfNeeded();await page.waitForTimeout(400);
  const bounds=await canvas.evaluate(el=>{
   const r=el.getBoundingClientRect(),hero=document.querySelector('.hero').getBoundingClientRect();
   return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,heroBottom:hero.bottom,viewport:innerWidth,wordmarkBottom:document.querySelector('.hero-wordmark').getBoundingClientRect().bottom,copyRight:document.querySelector('.hero-copy').getBoundingClientRect().right,headerBottom:document.querySelector('.site-header').getBoundingClientRect().bottom};
  });
  assert(bounds.left>=0&&bounds.right<=width,`Horizontal canvas clipping at ${width}`);
  assert(bounds.bottom<=bounds.heroBottom,`Canvas exceeds hero at ${width}`);
  await canvas.screenshot({...isolate,path:`.runtime/cube-framing/${width}-scrambled.png`});
  await canvas.hover();
  for(let frame=0;frame<3;frame++){
   await page.waitForTimeout(110);
   await canvas.screenshot({...isolate,path:`.runtime/cube-framing/${width}-turn-${frame}.png`});
  }
  await page.waitForFunction(()=>document.querySelector('#cube-stage').dataset.cubeState==='solved');
  await canvas.screenshot({...isolate,path:`.runtime/cube-framing/${width}-solved.png`});
  await canvas.click();
  await page.waitForFunction(()=>document.querySelector('#cube-stage').dataset.cubeState==='scrambled');
  report.push({width,...bounds});
  console.log(`PASS ${width}: canvas inside viewport and hero; both interaction states work`);
 }
 assert.deepEqual(errors,[]);
 await fs.writeFile('.runtime/cube-framing/bounds.json',JSON.stringify(report,null,2));
}finally{await browser.close();}
