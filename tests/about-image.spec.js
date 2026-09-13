import {test,expect} from '@playwright/test';
for(const width of [1888,390])test(`Nosotros keeps animated backgrounds with a larger rounded image at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});
  if(width===390)await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/#nosotros');
  await expect(page.locator('html')).toHaveAttribute('data-ready','true');
  await expect(page.locator('html')).toHaveAttribute('data-theme','paper');
  await expect(page.locator('.about-backdrop')).toHaveCount(0);
  const figure=page.locator('.about-picture');
  await figure.scrollIntoViewIfNeeded();
  await expect.poll(()=>figure.evaluate(el=>getComputedStyle(el).opacity)).toBe('1');
  await expect.poll(()=>figure.locator('img').evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true);
  const bounds=await figure.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(20);expect(bounds.x+bounds.width).toBeLessThanOrEqual(width-20);
  expect(await figure.locator('.image-clip').evaluate(el=>parseFloat(getComputedStyle(el).borderRadius))).toBeGreaterThanOrEqual(24);
  if(width===1888){
    const expected=await page.locator('.about-grid').evaluate(el=>{const s=getComputedStyle(el),gap=parseFloat(s.columnGap);return 2*((el.clientWidth-11*gap)/12*7+6*gap)});
    expect(Math.abs(bounds.width-expected)).toBeLessThan(1);
  }
  await page.locator('#nosotros').screenshot({path:`.runtime/about-restored-${width}.png`});
});
