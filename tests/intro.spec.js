import {test,expect} from '@playwright/test';

test('slow CSS keeps graphite and does not discard the logo after 1.6 seconds',async({page})=>{
  let release;
  const held=new Promise(resolve=>{release=resolve;});
  await page.route('**/src/styles/main.css',async route=>{await held;await route.continue();});
  try {
    await page.goto('/',{waitUntil:'commit'});
    await expect(page.locator('html')).toHaveAttribute('data-intro',/prepared|playing/);
    expect(await page.evaluate(()=>getComputedStyle(document.documentElement).backgroundColor)).toBe('rgb(40, 40, 40)');
    await page.waitForTimeout(2200);
    await expect(page.locator('html')).toHaveAttribute('data-intro',/prepared|playing/);
    await expect(page.locator('#site-intro')).toBeVisible();
    expect(await page.evaluate(()=>getComputedStyle(document.documentElement).backgroundColor)).toBe('rgb(40, 40, 40)');
    await page.screenshot({path:'.runtime/phase-1/slow-styles-logo.png',timeout:3000});
    release();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('#site-intro')).toHaveCount(0);
    await expect(page.locator('html')).toHaveAttribute('data-intro','finished');
  }finally{release();}
});

test('outline, fill and opening preserve the Hero layout without waiting for the app',async({page})=>{
  await page.route('**/src/main.js',route=>route.abort());
  await page.goto('/',{waitUntil:'domcontentloaded'});
  const cover=page.locator('#site-intro');
  // Seek the real CSS animations for deterministic visual and state verification.
  await cover.evaluate(el=>el.getAnimations({subtree:true}).forEach(a=>{a.pause();a.currentTime=350;}));
  const outline=await cover.locator('.iso-piece--purple').evaluate(el=>({fill:getComputedStyle(el).fillOpacity,dash:getComputedStyle(el).strokeDashoffset}));
  expect(Number(outline.fill)).toBe(0);
  expect(parseFloat(outline.dash)).toBeLessThan(.1);
  const before=await page.locator('.hero').boundingBox();
  await page.screenshot({path:'.runtime/phase-1/outline.png'});
  await cover.evaluate(el=>el.getAnimations({subtree:true}).forEach(a=>{a.currentTime=950;}));
  expect(await cover.locator('.iso-piece--blue').evaluate(el=>getComputedStyle(el).fillOpacity)).toBe('1');
  await page.screenshot({path:'.runtime/phase-1/filled.png'});
  await cover.evaluate(el=>el.getAnimations({subtree:true}).forEach(a=>a.play()));
  await expect(cover).toHaveCount(0);
  expect(await page.locator('.hero').boundingBox()).toEqual(before);
  await expect(page.locator('.hero-cta')).toBeVisible();
});

for(const width of [1440,390])test(`every home load and reload presents the logo at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});
  await page.addInitScript(()=>{
    // An old session marker must no longer suppress the intro.
    sessionStorage.setItem('bergerac:intro:v1','seen');
    window.introStates=[];
    window.introFrames=[];
    function sample(){
      const state=document.documentElement.dataset.intro;
      if(state==='prepared'||state==='playing')introFrames.push(getComputedStyle(document.documentElement).backgroundColor);
      if(state!=='finished'&&state!=='cancelled')requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
    new MutationObserver(()=>{
      const state=document.documentElement.dataset.intro;
      if(state)introStates.push(state);
    }).observe(document,{subtree:true,attributes:true,attributeFilter:['data-intro']});
  });
  for(let i=0;i<5;i++){
    if(i===0)await page.goto('/',{waitUntil:'domcontentloaded'});
    else await page.reload({waitUntil:'domcontentloaded'});
    await expect(page.locator('html')).toHaveAttribute('data-intro',/prepared|playing|opening/);
    // Browser-generated scroll events must not cancel the entry.
    await page.evaluate(()=>window.dispatchEvent(new Event('scroll')));
    await expect(page.locator('#site-intro')).toHaveCount(0);
    await expect(page.locator('html')).toHaveAttribute('data-intro','finished');
    const states=await page.evaluate(()=>introStates);
    expect(states).toContain('playing');
    expect(states).toContain('opening');
    expect(states).not.toContain('cancelled');
    const frames=await page.evaluate(()=>introFrames);
    expect(frames.length).toBeGreaterThan(0);
    expect(frames.every(color=>color==='rgb(40, 40, 40)')).toBe(true);
  }
  await page.locator('.site-header .brand').click();
  await expect(page.locator('#site-intro')).toHaveCount(0);
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.locator('html')).toHaveAttribute('data-intro',/prepared|playing|opening/);
  await expect(page.locator('#site-intro')).toHaveCount(0);
});

test('keyboard immediately releases the cover and preserves the skip link',async({page})=>{
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.keyboard.press('Tab');
  await expect(page.locator('#site-intro')).toHaveCount(0);
  await expect(page.locator('.skip-link')).toBeFocused();
});

test('deep links and reduced motion bypass the opening',async({page})=>{
  await page.goto('/#desarrollar');
  await expect(page.locator('#site-intro')).toHaveCount(0);
  await expect(page.locator('.method')).toHaveAttribute('data-active-step','2');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  await expect(page.locator('#site-intro')).toHaveCount(0);
  await expect(page.locator('.hero-title')).toBeVisible();
});

test('blocked storage and disabled JavaScript never cover the page',async({browser,baseURL})=>{
  for(const javaScriptEnabled of [true,false]){
    const context=await browser.newContext({javaScriptEnabled});
    if(javaScriptEnabled)await context.addInitScript(()=>Object.defineProperty(window,'sessionStorage',{get(){throw new Error('blocked');}}));
    const page=await context.newPage();
    await page.goto(baseURL);
    if(javaScriptEnabled){
      await expect(page.locator('html')).toHaveAttribute('data-intro',/prepared|playing|opening/);
      await expect(page.locator('#site-intro')).toHaveCount(0);
      await expect(page.locator('html')).toHaveAttribute('data-intro','finished');
    }else await expect(page.locator('#site-intro')).toBeHidden();
    await expect(page.locator('.hero-title')).toBeVisible();
    await context.close();
  }
});

test('mobile opening fits and changing motion preference releases it',async({page})=>{
  await page.setViewportSize({width:360,height:600});
  await page.goto('/',{waitUntil:'domcontentloaded'});
  const mark=await page.locator('#site-intro svg').boundingBox();
  expect(mark.width).toBeLessThan(162);
  expect(mark.height).toBeLessThan(240);
  await page.screenshot({path:'.runtime/phase-1/mobile.png'});
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(page.locator('#site-intro')).toHaveCount(0);
});

test('a hidden page waits, then pauses and resumes the complete logo sequence',async({page})=>{
  await page.addInitScript(()=>{
    window.testHidden=true;
    Object.defineProperty(document,'hidden',{get:()=>window.testHidden});
  });
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('html')).toHaveAttribute('data-intro','prepared');
  await page.waitForTimeout(1800);
  await expect(page.locator('html')).toHaveAttribute('data-intro','prepared');
  await page.evaluate(()=>{testHidden=false;document.dispatchEvent(new Event('visibilitychange'));});
  await expect(page.locator('html')).toHaveAttribute('data-intro','playing');
  await page.evaluate(()=>{testHidden=true;document.dispatchEvent(new Event('visibilitychange'));});
  const clock=await page.locator('#site-intro').evaluate(el=>el.getAnimations()[0].currentTime);
  await page.waitForTimeout(1800);
  await expect(page.locator('html')).toHaveAttribute('data-intro','playing');
  expect(Math.abs(await page.locator('#site-intro').evaluate(el=>el.getAnimations()[0].currentTime)-clock)).toBeLessThan(50);
  await page.evaluate(()=>{testHidden=false;document.dispatchEvent(new Event('visibilitychange'));});
  await expect(page.locator('#site-intro')).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('data-intro','finished');
});
