import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const browser = await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
const page = await browser.newPage({viewport:{width:1440,height:900}});
const errors = [];
page.on('pageerror',error=>errors.push(error.message));
page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
try {
  for (const entry of ['/', '/bergerac.html']) {
    await page.goto(`http://127.0.0.1:4173${entry}`,{waitUntil:'networkidle'});
    await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
    assert.equal(await page.locator('html').getAttribute('data-theme'),'blue');
    await page.waitForFunction(()=>document.querySelector('.hero-object').classList.contains('has-webgl'));
    await page.locator('.nav-pill [href="#metodo"]').focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.documentElement.dataset.theme==='purple');
    const focus = await page.locator('#metodo').evaluate(el=>({focused:el===document.activeElement,style:getComputedStyle(el).outlineStyle,color:getComputedStyle(el).outlineColor,ink:getComputedStyle(el).color}));
    assert.equal(focus.focused,true);
    assert.equal(focus.style,'solid');
    assert.equal(focus.color,focus.ink);
    await page.evaluate(()=>{location.hash='desarrollar';});
    await page.waitForFunction(()=>document.querySelector('.method').dataset.activeStep==='2'&&document.documentElement.dataset.theme==='pink');
    await page.evaluate(()=>scrollTo(0,document.getElementById('trabajos').offsetTop+430));
    await page.waitForFunction(()=>document.querySelector('.project-video').currentTime>0);
    assert.equal(await page.locator('.project-video').first().evaluate(v=>v.videoWidth),1742);
    console.log(`PASS ${entry}: fonts, cube, navigation, theme and video`);
  }
  await page.setViewportSize({width:1440,height:600});
  await page.waitForFunction(()=>!document.querySelector('.method').classList.contains('is-sticky'));
  await page.waitForFunction(()=>[...document.querySelectorAll('.method-step')].every(el=>getComputedStyle(el).visibility==='visible'));
  for (const id of ['estudiar','definir','desarrollar','afinar']) {
    assert.equal(await page.locator('#'+id).evaluate(el=>getComputedStyle(el).visibility),'visible');
  }
  assert.deepEqual(errors,[]);
  console.log('PASS low-height flow and no browser/resource errors');
} finally {
  await browser.close();
}
