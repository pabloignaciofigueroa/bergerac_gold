import {test,expect} from '@playwright/test';

for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  test(`cube never shows its smaller CSS fallback while loading at ${viewport.width}px`,async({page})=>{
    await page.setViewportSize(viewport);
    let release;
    const held=new Promise(resolve=>{release=resolve;});
    let requested=false;
    await page.route(/\/src\/scripts\/hero-cube\.js(?:\?.*)?$/,async route=>{requested=true;await held;await route.continue();});
    await page.goto('/');
    const stage=page.locator('#cube-stage');
    const fallback=stage.locator('.cube-fallback');
    await expect(page.locator('html')).toHaveAttribute('data-ready','true');
    await expect.poll(()=>requested).toBe(true);
    await page.waitForTimeout(1000);
    await expect(fallback).toBeHidden();
    const before=await stage.boundingBox();
    release();
    await expect(stage).toHaveAttribute('data-render-state','ready');
    await expect(stage.locator('canvas')).toBeVisible();
    await expect(fallback).toBeHidden();
    const after=await stage.boundingBox();
    for(const key of ['x','y','width','height'])expect(Math.abs(after[key]-before[key])).toBeLessThan(1);
    await page.waitForTimeout(900);
    const settled=await stage.boundingBox();
    for(const key of ['x','y','width','height'])expect(Math.abs(settled[key]-after[key])).toBeLessThan(1);
  });
}

test('CSS cube appears only when the 3D module fails',async({page})=>{
  await page.route(/\/src\/scripts\/hero-cube\.js(?:\?.*)?$/,route=>route.abort());
  await page.goto('/');
  await expect(page.locator('#cube-stage')).toHaveAttribute('data-render-state','fallback');
  await expect(page.locator('.cube-fallback')).toBeVisible();
});
