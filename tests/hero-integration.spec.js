import {test,expect} from '@playwright/test';

test('cube sits within the desktop hero and its resolution emphasizes copy without layout movement',async({page})=>{
  await page.setViewportSize({width:1888,height:900});
  await page.goto('/');
  const cube=page.locator('#cube-stage');
  const statement=page.locator('.hero-statement');
  await expect(cube).toHaveAttribute('data-render-state','ready');
  await page.waitForTimeout(1000);
  const before=await statement.boundingBox();
  const cubeBefore=await cube.boundingBox();
  const hero=await page.locator('.hero').boundingBox();
  expect(cubeBefore.y+cubeBefore.height).toBeLessThanOrEqual(hero.y+hero.height);
  const aboutLabel=await page.locator('.about .section-label').boundingBox();
  expect(aboutLabel.y-(hero.y+hero.height)).toBeLessThanOrEqual(40);
  await page.screenshot({path:'.runtime/hero-integration/final-desktop.png'});
  await cube.evaluate(el=>el.focus({preventScroll:true}));await page.keyboard.press('Enter');
  await expect(cube).toHaveAttribute('data-cube-state','solved',{timeout:15000});
  await expect(statement).toHaveClass(/is-cube-resolved/);
  expect(await statement.boundingBox()).toEqual(before);
  expect(await cube.boundingBox()).toEqual(cubeBefore);
  await page.waitForTimeout(400);
  await page.screenshot({path:'.runtime/hero-integration/final-emphasis.png'});
  await page.waitForTimeout(1400);
  expect(await statement.evaluate(el=>getComputedStyle(el,'::after').opacity)).toBe('0');
});

test('reduced motion retains the composition and skips the emphasis animation',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  const cube=page.locator('#cube-stage');
  await expect(cube).toHaveAttribute('data-render-state','ready');
  await cube.focus();await page.keyboard.press('Enter');
  await expect(cube).toHaveAttribute('data-cube-state','solved');
  const statement=page.locator('.hero-statement');
  await expect(statement).not.toHaveClass(/is-cube-resolved/);
  expect(await statement.evaluate(el=>getComputedStyle(el,'::after').animationName)).toBe('none');
  await page.screenshot({path:'.runtime/hero-integration/final-mobile.png'});
});
