import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir:'./tests',timeout:45000,workers:2,
  use:{baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:900},launchOptions:{args:['--enable-unsafe-swiftshader']},screenshot:'only-on-failure',trace:'retain-on-failure'},
  reporter:[['list']],
  webServer:{command:'npm run dev',url:'http://127.0.0.1:5173',reuseExistingServer:true},
});
