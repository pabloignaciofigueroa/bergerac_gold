import {test,expect} from '@playwright/test';
test('envía por API, conserva datos ante error y permite reintentar sin duplicar',async({page})=>{
 const ids=[];let attempt=0;
 await page.route('**/api/contact',async route=>{
  const data=route.request().postDataJSON();ids.push(data.requestId);
  expect(data.email).toBe('ana@example.com');
  await route.fulfill({status:attempt++===0?502:200,contentType:'application/json',body:attempt===1?JSON.stringify({ok:false,message:'No pudimos confirmar el envío.'}):JSON.stringify({ok:true})});
 });
 await page.goto('/#comencemos');await expect(page.locator('html')).toHaveAttribute('data-ready','true');
 await page.locator('#contact-name').fill('Ana');await page.locator('#contact-channel').fill('ana@example.com');await page.locator('#contact-message').fill('Necesito una web.');
 await page.locator('.form-submit').click();await expect(page.locator('.form-status')).toContainText('No pudimos');await expect(page.locator('#contact-message')).toHaveValue('Necesito una web.');
 await page.locator('.form-submit').click();await expect(page.locator('.form-status')).toContainText('fue enviada');await expect(page.locator('#contact-message')).toHaveValue('');expect(ids[0]).toBe(ids[1]);expect(page.url()).toContain('#comencemos');
});
