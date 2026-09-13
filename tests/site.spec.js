import {test,expect} from '@playwright/test';

const colors={blue:'rgb(0, 161, 255)',paper:'rgb(253, 252, 250)',graphite:'rgb(40, 40, 40)',purple:'rgb(111, 2, 186)',pink:'rgb(251, 2, 120)',yellow:'rgb(255, 183, 1)'};
async function load(page,path='/'){
  await page.goto(path);
  await expect(page.locator('html')).toHaveAttribute('data-ready','true');
  // Section-color checks begin after the brand opening; data-ready remains functional readiness.
  await expect(page.locator('#site-intro')).toHaveCount(0);
}
async function color(page,name){
  await expect(page.locator('html')).toHaveAttribute('data-theme',name);
  await expect.poll(()=>page.evaluate(()=>getComputedStyle(document.documentElement).backgroundColor)).toBe(colors[name]);
}
async function jump(page,id,offset=100){
  await page.evaluate(({id,offset})=>window.scrollTo({top:document.getElementById(id).getBoundingClientRect().top+scrollY-offset,behavior:'instant'}),{id,offset});
}

test('global colors follow all sections in both directions; method changes between steps two and three',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await load(page);await color(page,'blue');
  await jump(page,'nosotros');await color(page,'paper');
  await jump(page,'punto-de-partida');await color(page,'graphite');
  await jump(page,'metodo',0);await color(page,'purple');
  for(const [id,theme,index] of [['definir','purple','1'],['desarrollar','pink','2'],['afinar','pink','3'],['desarrollar','pink','2'],['definir','purple','1'],['estudiar','purple','0']]){
    await page.evaluate(id=>{location.hash=id;},id);
    await color(page,theme);
    await expect(page.locator('.method')).toHaveAttribute('data-active-step',index);
    await expect(page.locator(`#${id}`)).toHaveAttribute('aria-hidden','false');
  }
  await jump(page,'trabajos');await color(page,'paper');
  await jump(page,'comencemos');await color(page,'yellow');
  await jump(page,'trabajos');await color(page,'paper');
  await page.evaluate(()=>{location.hash='afinar';});await color(page,'pink');
  await jump(page,'punto-de-partida');await color(page,'graphite');
  await jump(page,'nosotros');await color(page,'paper');
  await jump(page,'inicio',0);await color(page,'blue');
  expect(errors).toEqual([]);
});

test('theme transition is short, completes without more scrolling, and reverses from its current color',async({page})=>{
  await load(page);
  const samples=await page.evaluate(async()=>{
    const bg=()=>getComputedStyle(document.documentElement).backgroundColor;
    const top=document.getElementById('nosotros').getBoundingClientRect().top+scrollY-innerHeight*.62;
    scrollTo(0,top+5);
    await new Promise(resolve=>setTimeout(resolve,100));
    const intermediate=bg();
    await new Promise(resolve=>setTimeout(resolve,300));
    const finished=bg();
    scrollTo(0,top-8);
    await new Promise(resolve=>setTimeout(resolve,100));
    scrollTo(0,top+8);
    await new Promise(resolve=>setTimeout(resolve,400));
    return{intermediate,finished,reversed: bg()};
  });
  expect(samples.intermediate).not.toBe(colors.blue);
  expect(samples.intermediate).not.toBe(colors.paper);
  expect(samples.finished).toBe(colors.paper);
  expect(samples.reversed).toBe(colors.paper);
});

test('direct step links and refresh preserve the correct step and color',async({page})=>{
  await load(page,'/#desarrollar');await color(page,'pink');
  await expect(page.locator('.method')).toHaveAttribute('data-active-step','2');
  await page.reload();await expect(page.locator('html')).toHaveAttribute('data-ready','true');await color(page,'pink');
  await page.setViewportSize({width:390,height:844});
  await page.locator('.site-header .brand').click();await color(page,'blue');
  await page.evaluate(()=>{location.hash='desarrollar';});await color(page,'pink');
  await page.evaluate(()=>{location.hash='definir';});await color(page,'purple');
});

test('both projects are visible and play together, pause offscreen and link to their live sites',async({page})=>{
  await load(page);await jump(page,'trabajos',-420);
  const first=page.locator('.project-video').nth(0),second=page.locator('.project-video').nth(1);
  await expect.poll(()=>first.evaluate(v=>v.videoWidth)).toBe(1742);
  await expect.poll(()=>first.evaluate(v=>v.currentTime)).toBeGreaterThan(0);
  await expect.poll(()=>second.evaluate(v=>v.paused)).toBe(false);
  const boxes=await page.locator('.project-screen').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};}));
  expect(boxes[0].right).toBeLessThan(boxes[1].left);
  for(const box of boxes){expect(box.top).toBeGreaterThanOrEqual(0);expect(box.bottom).toBeLessThanOrEqual(900);}
  await expect(page.locator('#project-dialog')).toHaveCount(0);
  const links=page.locator('.project-open');
  await expect(links.nth(0)).toHaveAttribute('href','https://www.survec.cl/');
  await expect(links.nth(1)).toHaveAttribute('href','https://as-estudio.vercel.app/');
  for(const link of await links.all())await expect(link).toHaveAttribute('target','_blank');
  await jump(page,'comencemos',-500);
  await expect.poll(()=>second.evaluate(v=>v.paused)).toBe(true);
});

test('mobile menu has working links, Escape and focus return; method flows vertically',async({page})=>{
  await page.setViewportSize({width:390,height:844});await load(page);
  await page.locator('.menu-toggle').click();
  await expect(page.locator('#mobile-menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#mobile-menu')).not.toBeVisible();
  await expect(page.locator('.menu-toggle')).toBeFocused();
  await page.locator('.menu-toggle').click();
  await page.locator('#mobile-menu a[href="#metodo"]').click();
  await expect(page.locator('#mobile-menu')).not.toBeVisible();await color(page,'purple');
  await expect(page.locator('.method')).not.toHaveClass(/is-sticky/);
  for(const [id,theme] of [['definir','purple'],['desarrollar','pink'],['afinar','pink'],['definir','purple']]){await page.evaluate(id=>{location.hash=id;},id);await color(page,theme);expect(await page.locator('#'+id).getAttribute('aria-hidden')).toBeNull();}
});

test('video playback falls back to the local MP4 when WebM is unavailable',async({page})=>{
  await page.route('**/*.webm',route=>route.abort());
  await load(page);await jump(page,'trabajos',-430);
  const video=page.locator('.project-video').first();
  await expect.poll(()=>video.evaluate(v=>v.currentSrc)).toMatch(/SURVEC_WEBPAGE\.mp4$/);
  await expect.poll(()=>video.evaluate(v=>v.videoWidth)).toBe(1742);
  await expect.poll(()=>video.evaluate(v=>v.currentTime)).toBeGreaterThan(0);
});

test('reduced motion keeps content, theme switching and real video playback available',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await load(page);
  await expect(page.locator('.method')).not.toHaveClass(/is-sticky/);
  await jump(page,'desarrollar');await color(page,'pink');
  await jump(page,'trabajos',-430);
  const video=page.locator('.project-video').first();
  await expect.poll(()=>video.evaluate(v=>v.readyState)).toBeGreaterThan(0);
  expect(await video.evaluate(v=>v.paused)).toBe(true);
  await page.locator('.video-toggle').first().click();
  await expect.poll(()=>video.evaluate(v=>v.paused)).toBe(false);
});

test('layout fits the supported widths and hero lettering is not clipped',async({page})=>{
  await load(page);
  const issues=[];
  for(const width of [360,390,768,900,1024,1440,1920]){
    await page.setViewportSize({width,height:900});await page.waitForTimeout(350);
    await jump(page,'inicio',0);
    const result=await page.evaluate(()=>{
      const clipping=[...document.querySelectorAll('.hero-title .line-mask,.hero-wordmark,.footer-wordmark')].map(el=>{
        const range=document.createRange();range.selectNodeContents(el.querySelector('span')||el);
        return {text:el.textContent,content:range.getBoundingClientRect().width,box:el.getBoundingClientRect().width};
      }).filter(item=>item.content>item.box+2);
      return {viewport:innerWidth,page:document.documentElement.scrollWidth,clipping};
    });
    if(result.page>width+1||result.clipping.length)issues.push(result);
  }
  expect(issues).toEqual([]);
});

test('graphite is the only dark ink and the contact form validates without claiming delivery',async({page})=>{
  await load(page,'/#desarrollar');await color(page,'pink');
  expect(await page.locator('.step-description').nth(2).evaluate(el=>getComputedStyle(el).color)).toBe(colors.paper);
  expect(await page.locator('.site-header .brand').evaluate(el=>getComputedStyle(el).color)).toBe(colors.graphite);
  await jump(page,'comencemos',-500);await color(page,'yellow');
  await page.locator('#contact-name').fill('Prueba');
  await page.locator('#contact-channel').fill('incorrecto');
  await page.locator('#contact-message').fill('Consulta de prueba local.');
  await page.locator('.form-submit').click();
  expect(await page.locator('#contact-channel').evaluate(el=>el.validationMessage)).toContain('correo');
  await expect(page.locator('.form-status')).not.toContainText('enviado');
});
