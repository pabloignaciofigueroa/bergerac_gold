import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir:'./tests',testMatch:['seo.spec.js','contact-form.spec.js','contact-validation.spec.js'],timeout:60000,workers:2,
  use:{channel:'chrome',baseURL:'http://127.0.0.1:4173',viewport:{width:1440,height:900},launchOptions:{args:['--enable-unsafe-swiftshader']},screenshot:'only-on-failure'},
  reporter:[['list']],
  webServer:{command:'npm run preview -- --port 4173',url:'http://127.0.0.1:4173',reuseExistingServer:true}
});
