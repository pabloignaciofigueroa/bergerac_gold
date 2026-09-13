import {test,expect} from '@playwright/test';

for(const width of [1440,390])test(`cube returns to the same brand faces after varied mixes at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  const cube=page.locator('#cube-stage');
  await expect(cube).toHaveAttribute('data-render-state','ready');
  await cube.scrollIntoViewIfNeeded();
  const canvas=cube.locator('canvas');
  const initial=await canvas.screenshot({path:`.runtime/cube-${width}-palette-initial.png`});
  await cube.focus();await page.keyboard.press('Enter');
  await expect(cube).toHaveAttribute('data-cube-state','solved');
  const solved=await canvas.screenshot({path:`.runtime/cube-${width}-palette-solved.png`});
  expect(initial.equals(solved)).toBe(false);
  let previous=initial;
  for(let cycle=0;cycle<3;cycle++){
    await page.keyboard.press('Enter');
    await expect(cube).toHaveAttribute('data-cube-state','scrambled');
    const mixed=await canvas.screenshot();
    expect(mixed.equals(previous)).toBe(false);
    previous=mixed;
    await page.keyboard.press('Enter');
    await expect(cube).toHaveAttribute('data-cube-state','solved');
    expect((await canvas.screenshot()).equals(solved)).toBe(true);
  }
});
