import {test,expect} from '@playwright/test';

test('Estudiar stays still for an extra screen of scroll before moving horizontally',async({page})=>{
 await page.goto('/');await expect(page.locator('html')).toHaveAttribute('data-ready','true');
 const start=await page.locator('#metodo').evaluate(el=>el.getBoundingClientRect().top+scrollY);
 await page.evaluate(start=>scrollTo(0,start),start);await page.waitForTimeout(100);
 const x=await page.locator('#estudiar').evaluate(el=>el.getBoundingClientRect().x);
 await page.mouse.wheel(0,650);await page.waitForTimeout(200);
 expect(await page.locator('#estudiar').evaluate(el=>el.getBoundingClientRect().x)).toBeCloseTo(x,0);
 await expect(page.locator('.method')).toHaveAttribute('data-active-step','0');
 await page.mouse.wheel(0,500);await page.waitForTimeout(200);
 expect(await page.locator('#estudiar').evaluate(el=>el.getBoundingClientRect().x)).toBeLessThan(x-100);
});

test('image sits right of regular copy with the deliverable embedded inside it',async({page})=>{
 await page.goto('/#estudiar');await expect(page.locator('html')).toHaveAttribute('data-ready','true');
 const layout=await page.locator('#estudiar').evaluate(panel=>{
  const title=panel.querySelector('h3').getBoundingClientRect(),description=panel.querySelector('.step-description').getBoundingClientRect(),deliverable=panel.querySelector('.step-deliverable'),visual=panel.querySelector('.step-visual').getBoundingClientRect(),badge=deliverable.getBoundingClientRect();
  return {titleBottom:title.bottom,descriptionTop:description.top,descriptionRight:description.right,imageLeft:visual.left,embedded:badge.left>=visual.left&&badge.right<=visual.right&&badge.bottom<=visual.bottom,weight:getComputedStyle(panel.querySelector('.step-description')).fontWeight,uppercase:getComputedStyle(deliverable).textTransform,color:getComputedStyle(deliverable).color};
 });
 expect(layout.descriptionTop).toBeGreaterThanOrEqual(layout.titleBottom);
 expect(layout.imageLeft).toBeGreaterThan(layout.descriptionRight);
 expect(layout.color).toBe('rgb(253, 252, 250)');
 expect(layout.embedded).toBe(true);
 expect(layout.weight).toBe('400');
 expect(layout.uppercase).toBe('uppercase');
 await page.screenshot({path:'.runtime/method-reading.png'});
});

test('all four stages have a full reading stop in both scroll directions',async({page})=>{
 await page.goto('/');await expect(page.locator('html')).toHaveAttribute('data-ready','true');
 const ids=['estudiar','definir','desarrollar','afinar'];
 async function at(units){await page.evaluate(units=>{
  const el=document.querySelector('.method');
  scrollTo(0,el.getBoundingClientRect().top+scrollY+(el.offsetHeight-innerHeight)*units/7);
 },units);await page.waitForTimeout(100);}
 for(const i of [0,1,2,3,2,1,0]){
  await at(i*2+.12);const first=await page.locator('#'+ids[i]).boundingBox();
  await at(i*2+.85);const last=await page.locator('#'+ids[i]).boundingBox();
  expect(Math.abs(first.x-last.x)).toBeLessThan(2);
  if(i<3){
   const separation=await page.evaluate(index=>{
    const panels=[...document.querySelectorAll('.method-step')];
    return panels[index+1].querySelector('.step-copy').getBoundingClientRect().left-panels[index].querySelector('.step-visual').getBoundingClientRect().right;
   },i);
   expect(separation).toBeGreaterThanOrEqual(48);
  }
  await expect(page.locator('.method')).toHaveAttribute('data-active-step',String(i));
  await expect(page.locator('html')).toHaveAttribute('data-theme',i<2?'purple':'pink');
 }
});

test('footer matches the minimal reference and hero no longer repeats the location',async({page})=>{
 await page.goto('/');await expect(page.locator('html')).toHaveAttribute('data-ready','true');
 await expect(page.locator('.hero-foot')).not.toContainText('Estudio digital');
 await expect(page.locator('.footer p')).toContainText('Bergerac');
 await expect(page.locator('.footer-top')).toHaveText('Volver arriba');
 await expect(page.locator('.footer .brand,.footer nav,.footer-wordmark')).toHaveCount(0);
 await page.locator('.footer').scrollIntoViewIfNeeded();
 await page.waitForTimeout(350);
 await page.locator('.footer').screenshot({path:'.runtime/footer-minimal.png'});
});
