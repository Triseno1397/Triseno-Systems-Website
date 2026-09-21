import { chromium } from '@playwright/test';
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist','--enable-gpu-rasterization','--window-position=-2400,0'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('about:blank');
const r = await p.evaluate(() => { const c = document.createElement('canvas').getContext('webgl'); const d = c.getExtension('WEBGL_debug_renderer_info'); return c.getParameter(d.UNMASKED_RENDERER_WEBGL); });
console.log(r); await b.close();
