import {test,expect} from '@playwright/test';

test('cube starts scrambled, stays still, and alternates on hover, click and keyboard',async({page})=>{
  test.setTimeout(60000);
  const stateTimeout={timeout:15000};
  await page.goto('/');
  const cube=page.locator('#cube-stage');
  await expect(cube).toHaveAttribute('data-render-state','ready');
  await expect(cube).toHaveAttribute('data-cube-state','scrambled');
  await page.waitForTimeout(1600);
  await expect(cube).toHaveAttribute('data-cube-state','scrambled');
  await cube.hover();
  await expect(cube).toHaveAttribute('data-cube-state','solved',stateTimeout);
  await cube.click();
  await expect(cube).toHaveAttribute('data-cube-state','scrambled',stateTimeout);
  await page.mouse.move(0,0);
  await cube.hover();
  await expect(cube).toHaveAttribute('data-cube-state','solved',stateTimeout);
  await cube.focus();await page.keyboard.press('Enter');
  await expect(cube).toHaveAttribute('data-cube-state','scrambled',stateTimeout);
});

test('method panels translate continuously with scroll without opacity changes',async({page})=>{
  await page.goto('/');await expect(page.locator('html')).toHaveAttribute('data-ready','true');
  async function position(progress){return page.evaluate(progress=>{
    const section=document.querySelector('.method');
    scrollTo(0,section.getBoundingClientRect().top+scrollY+(section.offsetHeight-innerHeight)*progress);
  },progress);}
  async function sample(){await page.waitForTimeout(120);return page.locator('.method-step').evaluateAll(els=>els.map(el=>({x:el.getBoundingClientRect().x,opacity:getComputedStyle(el).opacity,visibility:getComputedStyle(el).visibility})));}
  await position(.44);const before=await sample();
  await position(.48);const between=await sample();
  expect(between[1].x).toBeLessThan(before[1].x-200);
  expect(between[2].x).toBeLessThan(before[2].x-200);
  for(const state of between){expect(state.opacity).toBe('1');expect(state.visibility).toBe('visible');}
  await position(.52);await expect(page.locator('html')).toHaveAttribute('data-theme','pink');
  await position(.48);await expect(page.locator('html')).toHaveAttribute('data-theme','purple');
  await position(.44);const reverse=await sample();
  expect(Math.abs(reverse[1].x-before[1].x)).toBeLessThan(2);
});

test('brand wordmarks, yellow supplied SVGs and readable supporting copy are present',async({page})=>{
  await page.goto('/');await expect(page.locator('html')).toHaveAttribute('data-ready','true');
  await expect(page.locator('.hero-wordmark')).toHaveText('BERGERAC');
  await expect(page.locator('.footer-wordmark')).toHaveCount(0);
  await expect(page.locator('.method-index')).toHaveCount(0);
  await expect(page.locator('.question-mark')).toHaveCount(0);
  expect(await page.locator('.social-symbols').evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true);
  for(const selector of ['.hero-description','.about-copy p','.starting-aside p','.project-meta p']){
    expect(await page.locator(selector).first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(20);
  }
  await page.setViewportSize({width:390,height:844});
  expect(await page.locator('.hero-description').evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBe(20);
});

test('horizontal method keeps the complete current step inside its visible area',async({page})=>{
  await page.goto('/');await expect(page.locator('html')).toHaveAttribute('data-ready','true');
  for(const [width,height] of [[390,650],[360,760],[390,844],[768,900],[1024,650],[1440,900]]){
    await page.setViewportSize({width,height});await page.waitForTimeout(300);
    for(const id of ['estudiar','desarrollar']){
      await page.evaluate(id=>{location.hash=id;},id);
      await page.waitForTimeout(120);
      const clipped=await page.locator('#'+id).evaluate(panel=>{
        const frame=document.querySelector('.method-content').getBoundingClientRect();
        return [...panel.children].map(el=>{const r=el.getBoundingClientRect();return {text:el.textContent,top:r.top,bottom:r.bottom};}).filter(r=>r.top<frame.top-2||r.bottom>frame.bottom+2);
      });
      expect(clipped,`${width}x${height} ${id}`).toEqual([]);
    }
  }
});
