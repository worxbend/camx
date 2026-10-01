import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./tests',timeout:30000,expect:{timeout:7000},fullyParallel:false,
 reporter:'list',use:{baseURL:'http://127.0.0.1:5188',headless:true,trace:'retain-on-failure'},
 webServer:{command:'npm run dev -- --host 127.0.0.1 --port 5188',url:'http://127.0.0.1:5188',reuseExistingServer:!process.env.CI},
});
