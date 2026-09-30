import { chromium } from '@playwright/test';
import fs from 'node:fs';
/* Renders the vortex shader (FRAG from src/components/world/vortex.ts) at fixed
   moments, without a site build. node design-loop/vortex-lab.mjs [out.png] */
const src = fs.readFileSync('src/components/world/vortex.ts', 'utf8');
const frag = src.match(/const FRAG = `([\s\S]*?)`;/)[1];
const vert = src.match(/const VERT = `([\s\S]*?)`;/)[1];
const tex = 'data:image/webp;base64,' + fs.readFileSync(process.env.TEX || 'public/worlds/ai-storm-3072.webp').toString('base64');
// [time s, depth, front, open, reveal, zoom, fade]
const shots = [[0,0,0,0,0,0.04,0,0,0,1],[0,0,0,0,0,0.04,1,0.068,0,1],[0.2,0.05,0.03,2.0,0.5,1.0,1,0.068,0,1],[2.5,0.8,0.5,4.0,1,2.24,1,0.07,0,1],[5.5,1,1.1,7.2,1,2.24,1,0.066,0,1],[7.0,1,1.4,9.0,1,2.24,1,0.9,0.2,1]];
const bg = 'data:image/webp;base64,' + fs.readFileSync('public/worlds/creative-desktop.webp').toString('base64');
const html = `<body style="margin:0;background:#556"><canvas id=c width=640 height=400></canvas><script>
const gl=c.getContext('webgl2',{premultipliedAlpha:true,preserveDrawingBuffer:true});
const sh=(t,s)=>{const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw gl.getShaderInfoLog(o);return o};
const p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,${JSON.stringify(vert)}));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,${JSON.stringify(frag)}));gl.linkProgram(p);gl.useProgram(p);
const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
const l=gl.getAttribLocation(p,'aPos');gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,2,gl.FLOAT,false,0,0);
const U=n=>gl.getUniformLocation(p,n);
const bendAt=(s)=>[Math.sin(s*0.42)*1.7+Math.sin(s*0.17+2)*1.2,Math.sin(s*0.33+1.3)*1.3+Math.cos(s*0.15)*1.0];
const deepest=(depth,wander,aspect)=>{if(wander<0.001)return[0,0];const f=0.2,base=bendAt(depth);const Z=[],X=[],Y=[];
for(let j=-9;j<=9;j++)for(let i=-14;i<=14;i++){const px=i/14*0.5*aspect*0.9,py=j/9*0.45;let z=f/Math.max(Math.hypot(px,py),0.004);
for(let k=0;k<6;k++){const b=bendAt(depth+Math.min(z,6)),d=Math.max(z,0.4),qx=px-f*(b[0]-base[0])/d*wander,qy=py-f*(b[1]-base[1])/d*wander;z+=(Math.min(f/Math.max(Math.hypot(qx,qy),0.004),40)-z)*0.7}
Z.push(z);X.push(px);Y.push(py)}const top=Math.max(...Z)*0.85;let sw=0,bx=0,by=0;Z.forEach((z,i)=>{if(z<top)return;sw+=z;bx+=X[i]*z;by+=Y[i]*z});return[bx/sw,by/sw]};
window.draw=async(s)=>{const img=new Image();img.src=${JSON.stringify(tex)};await img.decode();
const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
for(const k of ['TEXTURE_WRAP_S','TEXTURE_WRAP_T'])gl.texParameteri(gl.TEXTURE_2D,gl[k],gl.MIRRORED_REPEAT);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.uniform1f(U('uImgAspect'),img.width/img.height);
gl.uniform2f(U('uRes'),640,400);const n=['uDepth','uWander','uSpin','uSweep','uTwist','uFrontR','uDark','uEye','uGlow','uAlpha'];n.forEach((k,i)=>gl.uniform1f(U(k),s[i]));gl.uniform1f(U('uTexOn'),1);gl.uniform1i(U('uTex'),0);const vp=deepest(s[0],s[1],640/400);gl.uniform2f(U('uVP'),vp[0],vp[1]);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,3);return c.toDataURL()}
</script>`;
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0'] });
const p = await b.newPage({ viewport: { width: 640, height: 400 } });
await p.setContent(html);
const out = [];
for (const s of shots) out.push(await p.evaluate(s => window.draw(s), s));
await p.setContent(`<body style="margin:0;background:#556;display:grid;grid-template-columns:repeat(3,640px);gap:4px">${out.map(u => `<div style="width:640px;height:400px;background:url(${bg}) center/cover"><img src="${u}" style="display:block"></div>`).join('')}</body>`);
await p.setViewportSize({ width: 1928, height: 804 });
await p.screenshot({ path: process.argv[2] || 'design-loop/shots/vlab.png' });
await b.close();
