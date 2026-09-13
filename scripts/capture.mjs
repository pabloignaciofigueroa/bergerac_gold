import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';

await fs.mkdir('.runtime/captures',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
await page.goto('http://127.0.0.1:5173/',{waitUntil:'networkidle'});
await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
await page.waitForTimeout(3500);
await page.screenshot({path:'.runtime/captures/01-hero-desktop.png'});
for (const [id,name,offset] of [['nosotros','02-nosotros',100],['punto-de-partida','03-punto',100],['metodo','04-metodo',0],['trabajos','07-trabajos',100],['comencemos','08-comencemos',100]]) {
  await page.evaluate(({id,offset})=>scrollTo(0,document.getElementById(id).getBoundingClientRect().top+scrollY-offset),{id,offset});
  await page.waitForTimeout(850);
  await page.screenshot({path:`.runtime/captures/${name}.png`});
}
await page.evaluate(()=>{location.hash='desarrollar';});
await page.waitForTimeout(1000);
await page.screenshot({path:'.runtime/captures/05-desarrollar.png'});
console.log('DESKTOP',await page.evaluate(()=>({theme:document.documentElement.dataset.theme,height:document.documentElement.scrollHeight,width:document.documentElement.scrollWidth,step:document.querySelector('.method').dataset.activeStep,video:[...document.querySelectorAll('.project-video')].map(v=>({width:v.videoWidth,height:v.videoHeight,duration:v.duration,src:v.currentSrc}))})));
await page.setViewportSize({width:390,height:844});
await page.goto('http://127.0.0.1:5173/',{waitUntil:'networkidle'});
await page.waitForTimeout(2200);
await page.screenshot({path:'.runtime/captures/09-hero-mobile.png',fullPage:false});
for (const [id,name] of [['nosotros','10-nosotros-mobile'],['desarrollar','11-metodo-mobile'],['trabajos','12-trabajos-mobile'],['comencemos','13-contact-mobile']]){
  if(id==='desarrollar')await page.evaluate(()=>{location.hash='desarrollar';});
  else await page.evaluate(id=>scrollTo(0,document.getElementById(id).getBoundingClientRect().top+scrollY-100),id);
  await page.waitForTimeout(850);
  await page.screenshot({path:`.runtime/captures/${name}.png`});
}
console.log('MOBILE',await page.evaluate(()=>({theme:document.documentElement.dataset.theme,height:document.documentElement.scrollHeight,width:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('h1,h2,h3,p,.site-header')].filter(el=>{const r=el.getBoundingClientRect();return r.right>innerWidth+2||r.left< -2}).map(el=>el.className)})));
console.log('ERRORS',errors);
await browser.close();
