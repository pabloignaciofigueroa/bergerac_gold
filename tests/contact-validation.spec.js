import {test,expect} from '@playwright/test';
test('validacion propia con marca, foco y sin envio invalido',async({page})=>{
 let requests=0;await page.route('**/api/contact',r=>{requests++;return r.abort()});
 await page.goto('/#comencemos');await expect(page.locator('html')).toHaveAttribute('data-ready','true');
 await page.locator('.form-submit').click();
 const bubble=page.locator('#contact-validation');await expect(bubble).toHaveText('!Completa este campo.');await expect(page.locator('#contact-name')).toBeFocused();await expect(page.locator('#contact-name')).toHaveAttribute('aria-describedby','contact-validation');
 await expect(bubble).toHaveCSS('font-family',/Mona/);await expect(bubble.locator('.form-validation-icon')).toHaveCSS('background-color','rgb(40, 40, 40)');await expect(bubble.locator('.form-validation-icon')).toHaveCSS('color','rgb(253, 252, 250)');
 await page.locator('.contact-action').screenshot({path:'.runtime/contact-validation-desktop.png'});
 await page.locator('#contact-name').fill('Ana');await expect(bubble).toBeHidden();await page.locator('#contact-channel').fill('incorrecto');await page.locator('.form-submit').click();await expect(bubble).toContainText('Escribe un correo válido');await expect(page.locator('#contact-channel')).toBeFocused();
 await page.setViewportSize({width:390,height:844});await page.locator('#contact-channel').scrollIntoViewIfNeeded();await page.locator('.contact-action').screenshot({path:'.runtime/contact-validation-mobile.png'});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(requests).toBe(0);
});
