import {test,expect} from '@playwright/test';
import {pages,communes} from '../src/content/seo-pages.js';

test('all public pages have unique metadata, valid schema and reachable internal links',async({page,request})=>{
  const titles=new Set();const targets=new Set();
  for(const path of ['/',...pages.map(item=>item.path)]){
    const response=await page.goto(path);
    expect(response.status(),path).toBe(200);
    await expect(page.locator('h1')).toHaveCount(1);
    const title=await page.title();expect(titles.has(title),title).toBe(false);titles.add(title);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',`https://bergerac.cl${path}`);
    expect(await page.locator('meta[name="description"]').getAttribute('content')).toBeTruthy();
    expect(await page.locator('meta[name="robots"][content*="noindex"]').count()).toBe(0);
    const schema=JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
    expect(schema['@graph'].some(node=>node['@type']==='Organization')).toBe(true);
    for(const href of await page.locator('a[href]').evaluateAll(links=>links.map(link=>link.getAttribute('href')))){
      if(href.startsWith('/')&&!href.startsWith('//'))targets.add(href.split('#')[0].split('?')[0]||'/');
    }
  }
  for(const path of targets){expect((await request.get(path)).status(),`broken link ${path}`).toBe(200);}
  const sitemap=await request.get('/sitemap.xml');expect(sitemap.status()).toBe(200);
  const xml=await sitemap.text();for(const path of ['/',...pages.map(item=>item.path)])expect(xml).toContain(`<loc>https://bergerac.cl${path}</loc>`);
  expect((xml.match(/<url>/g)||[]).length).toBe(pages.length+1);
  expect(await (await request.get('/robots.txt')).text()).toContain('Sitemap: https://bergerac.cl/sitemap.xml');
});

for(const width of [375,1440]){
  test(`editorial content remains readable without JavaScript at ${width}px`,async({browser})=>{
    const context=await browser.newContext({javaScriptEnabled:false,viewport:{width,height:900}});
    const page=await context.newPage();
    for(const item of pages){
      await page.goto(`http://127.0.0.1:4173${item.path}`);
      await expect(page.locator('h1')).toBeVisible();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),item.path).toBe(true);
      await expect(page.getByRole('link',{name:'Compartir mi proyecto'})).toHaveAttribute('href','/#comencemos');
      const broken=await page.locator('img').evaluateAll(images=>images.filter(image=>!image.complete||image.naturalWidth===0).map(image=>image.src));
      expect(broken).toEqual([]);
      if(item.path==='/diseno-web-chiloe/')for(const commune of communes)await expect(page.locator('.communes')).toContainText(commune);
    }
    await page.goto('http://127.0.0.1:4173/servicios/diseno-web/');
    await page.screenshot({path:`.runtime/seo-20260913/service-${width}.png`,fullPage:true});
    await context.close();
  });
}

test('editorial CTA reaches working contact form and success stays yellow',async({page})=>{
  await page.route('**/api/contact',route=>route.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}));
  await page.goto('/servicios/diseno-web/');
  await page.getByRole('link',{name:'Compartir mi proyecto'}).click();
  await expect(page.locator('html')).toHaveAttribute('data-ready','true');
  await page.locator('#contact-name').fill('Prueba SEO');
  await page.locator('#contact-channel').fill('seo@example.com');
  await page.locator('#contact-message').fill('Consulta desde una página de servicio.');
  await page.locator('.form-submit').click();
  await expect(page.locator('.form-submit')).toHaveText('Mensaje enviado');
  await expect(page.locator('.form-submit')).toHaveCSS('background-color','rgb(255, 183, 1)');
  await expect(page.locator('.form-submit')).toHaveCSS('color','rgb(0, 0, 0)');
});
