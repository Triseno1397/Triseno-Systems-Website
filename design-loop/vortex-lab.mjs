import { chromium } from '@playwright/test';
import fs from 'node:fs';
/* Renders the vortex shader (FRAG from src/components/world/vortex.ts) at fixed
   moments, without a site build. node design-loop/vortex-lab.mjs [out.png] */
const src = fs.readFileSync('src/components/world/vortex.ts', 'utf8');
const frag = src.match(/const FRAG = `([\s\S]*?)`;/)[1];
const vert = src.match(/const VERT = `([\s\S]*?)`;/)[1];
const tex = 'data:image/webp;base64,' + fs.readFileSync('public/worlds/creative-vortex.webp').toString('base64');
// [time s, depth, front, eye, fade]
const shots = [[0.25, 0.3, 0.55, 0.06, 1], [0.8, 1.6, 1.4, 0.07, 1], [1.4, 3.2, 1.4, 0.09, 1], [2.0, 4.8, 1.4, 0.06, 1], [2.3, 5.6, 1.4, 0.6, 1], [2.5, 6.0, 1.4, 1.6, 0.8]];
const html = `<body style="margin:0;background:#556"><canvas id=c width=640 height=400></canvas><script>
const gl=c.getContext('webgl2',{premultipliedAlpha:true,preserveDrawingBuffer:true});
const sh=(t,s)=>{const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw gl.getShaderInfoLog(o);return o};
const p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,${JSON.stringify(vert)}));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,${JSON.stringify(frag)}));gl.linkProgram(p);gl.useProgram(p);
const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
const l=gl.getAttribLocation(p,'aPos');gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,2,gl.FLOAT,false,0,0);
const U=n=>gl.getUniformLocation(p,n);
window.draw=async(s)=>{const img=new Image();img.src=${JSON.stringify(tex)};await img.decode();
const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
for(const k of ['TEXTURE_WRAP_S','TEXTURE_WRAP_T'])gl.texParameteri(gl.TEXTURE_2D,gl[k],gl.MIRRORED_REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
gl.uniform2f(U('uRes'),640,400);gl.uniform1f(U('uTime'),s[0]);gl.uniform1f(U('uDepth'),s[1]);gl.uniform1f(U('uFront'),s[2]);gl.uniform1f(U('uEye'),s[3]);gl.uniform1f(U('uFade'),s[4]);gl.uniform1f(U('uTexOn'),1);gl.uniform1i(U('uTex'),0);
gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,3);return c.toDataURL()}
</script>`;
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0'] });
const p = await b.newPage({ viewport: { width: 640, height: 400 } });
await p.setContent(html);
const out = [];
for (const s of shots) out.push(await p.evaluate(s => window.draw(s), s));
await p.setContent(`<body style="margin:0;background:#556;display:grid;grid-template-columns:repeat(3,640px);gap:4px">${out.map(u => `<img src="${u}">`).join('')}</body>`);
await p.setViewportSize({ width: 1928, height: 804 });
await p.screenshot({ path: process.argv[2] || 'design-loop/shots/vlab.png' });
await b.close();
