import {test,expect} from '@playwright/test';
for(const viewport of [{width:360,height:800},{width:900,height:900},{width:1024,height:650},{width:1440,height:900}]){
 test(`method illustrations fit at ${viewport.width}x${viewport.height}`,async({page})=>{
  await page.setViewportSize(viewport);
  for(const id of ['estudiar','definir','desarrollar','afinar']){
   await page.goto('/#'+id);
   await expect(page.locator('html')).toHaveAttribute('data-ready','true');
   const panel=page.locator('#'+id),img=panel.locator('.step-visual img');
   await expect(img).toBeVisible();
   await expect.poll(()=>img.evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true);
   const data=await panel.evaluate(el=>{
    const visual=el.querySelector('.step-visual').getBoundingClientRect(),image=el.querySelector('img').getBoundingClientRect(),badge=el.querySelector('.step-deliverable').getBoundingClientRect();
    return {left:visual.left,right:visual.right,width:innerWidth,ratio:image.width/image.height,badgeFits:badge.left>=visual.left&&badge.right<=visual.right&&badge.bottom<=visual.bottom,bg:getComputedStyle(el.querySelector('.step-copy')).backgroundColor};
   });
   expect(data.left).toBeGreaterThanOrEqual(0);
   expect(data.right).toBeLessThanOrEqual(data.width);
   expect(data.ratio).toBeCloseTo(1672/941,2);
   expect(data.badgeFits).toBe(true);
   expect(data.bg).toBe('rgba(0, 0, 0, 0)');
   if(id==='estudiar')await page.screenshot({path:`.runtime/method-images/${viewport.width}.png`});
  }
 });
}
