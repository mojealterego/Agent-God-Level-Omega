import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';

/** Production-boundary rule: this factory never evaluates untrusted model output as executable code. */
export const KINDS = Object.freeze(['web', 'game', 'android', 'api']);
export const AGENT_PROFILES = Object.freeze({
  web: ['solution-architect', 'product-manager', 'frontend-engineer', 'design-systems-engineer', 'accessibility-auditor', 'web-performance-engineer', 'appsec-reviewer', 'quality-engineer'],
  game: ['game-director', 'gameplay-programmer', 'graphics-engineer', 'technical-artist', 'physics-engineer', 'level-designer', 'gameplay-tester', 'release-engineer'],
  android: ['mobile-architect', 'android-native-engineer', 'mobile-ui-engineer', 'touch-interaction-designer', 'mobile-performance-engineer', 'mobile-security-auditor', 'android-qa-engineer', 'play-store-release-engineer'],
  api: ['platform-architect', 'api-engineer', 'database-engineer', 'distributed-systems-engineer', 'observability-engineer', 'threat-modeler', 'integration-tester', 'sre-release-engineer'],
});

export function validateSpec(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('SPEC_OBJECT_REQUIRED');
  const { kind, slug, title = slug, description = 'Created with OMEGA Project Factory', accent = '#38bdf8' } = input;
  if (!KINDS.includes(kind)) throw new Error('UNSUPPORTED_PROJECT_KIND');
  if (typeof slug !== 'string' || !/^[a-z][a-z0-9-]{2,30}$/.test(slug)) throw new Error('INVALID_PROJECT_SLUG');
  if (typeof title !== 'string' || !title.trim() || title.length > 80 || /[<>\x00-\x1f]/.test(title)) throw new Error('INVALID_PROJECT_TITLE');
  if (typeof description !== 'string' || description.length > 180 || /[<>\x00-\x1f]/.test(description)) throw new Error('INVALID_PROJECT_DESCRIPTION');
  if (typeof accent !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(accent)) throw new Error('INVALID_PROJECT_ACCENT');
  return Object.freeze({ kind, slug, title: title.trim(), description, accent });
}

const json = value => JSON.stringify(value, null, 2) + '\n';
// Dependency-free PNG icons, generated deterministically for installable Android PWAs.
function crc32(input){let crc=-1;for(const byte of input){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}return (crc^-1)>>>0}
function pngChunk(type,payload){const head=Buffer.from(type,'ascii'),length=Buffer.alloc(4),crc=Buffer.alloc(4);length.writeUInt32BE(payload.length);crc.writeUInt32BE(crc32(Buffer.concat([head,payload])));return Buffer.concat([length,head,payload,crc])}
function brandPng(side,accent){
 const rgb=[parseInt(accent.slice(1,3),16),parseInt(accent.slice(3,5),16),parseInt(accent.slice(5,7),16)];
 const pix=Buffer.alloc(side*(side*4+1));const center=(side-1)/2,scale=side/512;
 for(let y=0;y<side;y++)for(let x=0;x<side;x++){
  const ix=y*(side*4+1)+1+x*4,dx=(x-center)/side,dy=(y-center)/side;
  const ring=Math.abs(Math.sqrt(dx*dx+dy*dy)-.27)<.033;
  const centerLine=(Math.abs(dx)<.024 && Math.abs(dy)<.26);
  const cap=(Math.abs(dy-.2)<.025&&Math.abs(dx)<.19);
  const branded=ring||centerLine||cap;const shade=Math.max(0,1-Math.sqrt(dx*dx+dy*dy));
  pix[ix]=branded?rgb[0]:Math.round(8+25*shade);pix[ix+1]=branded?rgb[1]:Math.round(11+27*shade);pix[ix+2]=branded?rgb[2]:Math.round(24+45*shade);pix[ix+3]=255;
 }
 const header=Buffer.alloc(13);header.writeUInt32BE(side,0);header.writeUInt32BE(side,4);header[8]=8;header[9]=6;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),pngChunk('IHDR',header),pngChunk('IDAT',deflateSync(pix,{level:9})),pngChunk('IEND',Buffer.alloc(0))]);
}

const esc = v => String(v).replace(/[&"'<>]/g, s => ({'&':'&amp;','"':'&quot;', "'":'&#39;', '<':'&lt;', '>':'&gt;'}[s]));
const safeJsonInline = o => JSON.stringify(o).replaceAll('<', '\\u003c');

function baseWeb(spec) {
  const home = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#080b18"><meta name="description" content="${esc(spec.description)}"><link rel="manifest" href="/manifest.webmanifest"><link rel="stylesheet" href="/style.css">
<title>${esc(spec.title)}</title></head><body><a class="skip" href="#main">Skip to content</a><div id="root">
<header class="top"><div class="mark" aria-hidden="true">Ω</div><div><small>OMEGA / ENGINEERING STUDIO</small><h1>${esc(spec.title)}</h1></div><span class="status" aria-label="Service available"><i></i> Local-first</span></header>
<main id="main"><div class="hero"><p class="eyebrow">MOBILE • WEB • OFFLINE READY</p><h2>Build with clarity.<br><span>Ship with evidence.</span></h2><p>${esc(spec.description)}</p></div>
<section class="panel" aria-labelledby="tasks-label"><div class="panelhead"><h3 id="tasks-label">Work queue</h3><span id="count" aria-live="polite">0 items</span></div>
<form id="add-form"><label for="task">New engineering work item</label><div class="formrow"><input required maxlength="140" id="task" name="task" placeholder="e.g. Review Android release gates" autocomplete="off"><button type="submit">Add task</button></div></form><ul id="tasks" aria-live="polite"></ul><p class="hint">Stored only on this device. No account or backend required.</p></section></main>
<footer>OMEGA FOUNDATION · Verifiable engineering, no simulated completions.</footer></div><script type="module" src="/app.mjs"></script></body></html>`;
  const style = `:root{color-scheme:dark;--accent:${spec.accent};--ink:#e8f0ff;--sub:#91a2bb;--card:#141e34;--line:#2b3c56;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 20% -15%,#1e4660,transparent 42%),#080b18;color:var(--ink)}.skip{position:absolute;left:-100vw}.skip:focus{left:1rem;top:1rem;background:#fff;color:#000;padding:1rem;z-index:10}#root{min-height:100dvh;max-width:1090px;margin:auto;padding:clamp(16px,3vw,44px);display:flex;flex-direction:column;gap:38px}.top{display:flex;align-items:center;gap:14px}.mark{width:54px;height:54px;border-radius:16px;background:linear-gradient(140deg,var(--accent),#2563eb);color:#06111d;font-size:35px;text-align:center;font-weight:800}.top small{font-size:10px;letter-spacing:.2em;color:var(--sub)}.top h1{font-size:20px;margin:2px 0}.status{margin-left:auto;font-size:12px;color:#97ffd8;white-space:nowrap}.status i{display:inline-block;background:#45dca3;width:7px;height:7px;border-radius:100%;margin-right:5px}.hero{padding:45px 0 26px}.eyebrow{letter-spacing:.2em;color:var(--accent);font-size:12px;font-weight:700}.hero h2{font-size:clamp(35px,6.7vw,76px);letter-spacing:-.055em;line-height:1.05;margin:22px 0}.hero h2 span{color:var(--accent)}.hero>p:last-child{max-width:550px;color:var(--sub);line-height:1.7}.panel{background:linear-gradient(145deg,#17223b,#0f162a);border:1px solid var(--line);border-radius:24px;padding:clamp(17px,3vw,32px);box-shadow:0 25px 75px #0005}.panelhead,.formrow{display:flex;gap:12px;align-items:center}.panelhead{justify-content:space-between}.panelhead h3{font-size:22px;margin:0}.panelhead span,.hint{font-size:12px;color:var(--sub)}form{margin-top:30px}label{display:block;color:var(--sub);font-size:13px;margin-bottom:11px}input{flex:1;min-width:0;background:#0a1222;color:var(--ink);font:inherit;padding:16px;border:1px solid #405572;border-radius:12px}input:focus-visible,button:focus-visible,.task button:focus-visible{outline:3px solid var(--accent);outline-offset:3px}button{cursor:pointer;border:0;border-radius:12px;background:var(--accent);color:#071022;font-weight:800;padding:16px 20px}.task button{background:#283c54;color:#e7f1ff;padding:10px 14px}#tasks{list-style:none;padding:0;margin:24px 0 0;display:grid;gap:10px}.task{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border:1px solid var(--line);border-radius:12px;overflow-wrap:anywhere}.task span{flex:1}.hint{margin-top:20px}footer{margin-top:auto;color:#778ca5;font-size:11px;text-align:center;padding:25px 0}@media(max-width:540px){.top h1{font-size:16px}.mark{width:43px;height:43px;font-size:28px}.status{font-size:10px}.hero{padding:14px 0}.formrow{flex-direction:column;align-items:stretch}button,input{width:100%}}@media(prefers-reduced-motion:no-preference){button{transition:transform .2s}button:hover{transform:translateY(-1px)}}`;
  const app = `import { normalizeTask, addTask, removeTask } from './core.mjs';
const key = 'omega.task.queue.v1';
const list = document.querySelector('#tasks');
const counter = document.querySelector('#count');
let tasks;
try { const stored = JSON.parse(localStorage.getItem(key) || '[]'); tasks = Array.isArray(stored) ? stored.filter(x => x && typeof x.id==='string' && typeof x.label==='string').slice(0,100) : []; } catch {tasks=[];}
function render(){list.replaceChildren(); for (const t of tasks){const li=document.createElement('li'); li.className='task'; const span=document.createElement('span');span.textContent=t.label;const del=document.createElement('button');del.type='button';del.textContent='Remove';del.setAttribute('aria-label','Remove '+t.label);del.onclick=()=>{tasks=removeTask(tasks,t.id);persist();};li.append(span,del);list.append(li)}counter.textContent=tasks.length+' '+(tasks.length===1?'item':'items');}
function persist(){try{localStorage.setItem(key,JSON.stringify(tasks))}catch{}render()}
document.querySelector('#add-form').addEventListener('submit',e=>{e.preventDefault();const input=document.querySelector('#task');const label=normalizeTask(input.value);if(!label)return;tasks=addTask(tasks,label,crypto.randomUUID());input.value='';persist()});
if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(()=>{})}
render();`;
  const core = `export function normalizeTask(value){return typeof value==='string'?value.trim().replace(/\\s+/g,' ').slice(0,140):''}
export function addTask(tasks,label,id){const clean=normalizeTask(label);if(!Array.isArray(tasks)||!clean||typeof id!=='string'||!id||tasks.some(t=>t.id===id)||tasks.length>=100)return tasks;return [...tasks,{id,label:clean}]}
export function removeTask(tasks,id){return tasks.filter(task=>task.id!==id)}\n`;
  const tests = `import test from 'node:test';import assert from 'node:assert/strict';import {normalizeTask,addTask,removeTask} from './core.mjs';
test('normalization and bounds',()=>{assert.equal(normalizeTask(' hello  world '),'hello world');assert.equal(normalizeTask('x'.repeat(300)).length,140)});
test('idempotent insertion',()=>{let tasks=addTask([],'hello','1');assert.equal(addTask(tasks,'hello','1').length,1);assert.equal(removeTask(tasks,'1').length,0)});
test('malformed task ignored',()=>assert.equal(addTask([],'  ','2').length,0));\n`;
  const sw = `const CACHE='omega-${spec.slug}-v1'; const ASSETS=['/','/index.html','/style.css','/app.mjs','/core.mjs','/manifest.webmanifest','/icon-192.png','/icon-512.png'];self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting()});self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});self.addEventListener('fetch',event=>{if(event.request.method==='GET'&&new URL(event.request.url).origin===self.location.origin){event.respondWith(caches.match(event.request).then(x=>x||fetch(event.request)))}});\n`;
  const server = `import {createServer} from 'node:http';import {readFile,stat} from 'node:fs/promises';import {resolve,extname,sep} from 'node:path';import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('.',import.meta.url)));const allowed=new Set(['/index.html','/style.css','/app.mjs','/core.mjs','/game.mjs','/physics.mjs','/sw.js','/manifest.webmanifest','/icon-192.png','/icon-512.png']);const mime={'.png':'image/png','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json'};
export function appServer(){return createServer(async(req,res)=>{let p;try{if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,{Allow:'GET, HEAD'}).end();return}p=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);if(!p.startsWith('/')||p.includes('\\0'))throw Error('bad');if(p==='/')p='/index.html';if(!allowed.has(p))throw Error('unlisted');const file=resolve(root,'.'+p);if(file!==root&&!file.startsWith(root+sep))throw Error('bad');const st=await stat(file);if(!st.isFile())throw Error('bad');const data=await readFile(file);res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream','x-content-type-options':'nosniff','referrer-policy':'no-referrer','content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",'cache-control':'no-store'});res.end(req.method==='HEAD'?undefined:data)}catch{res.writeHead(404).end('Not found')}})}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){const port=Number(process.env.PORT||8765);appServer().listen(port,'0.0.0.0',()=>console.log('OMEGA web on '+port))}\n`;
  const integration = `import test from 'node:test';import assert from 'node:assert/strict';import {once} from 'node:events';import {appServer} from './server.mjs';
test('HTTP serves application and blocks traversal',async()=>{const server=appServer().listen(0,'127.0.0.1');await once(server,'listening');try{const base='http://127.0.0.1:'+server.address().port;const a=await fetch(base+'/');assert.equal(a.status,200);assert.match(await a.text(),/Work queue/);assert.match(a.headers.get('content-security-policy'),/object-src/);assert.equal((await fetch(base+'/../../.env')).status,404);assert.equal((await fetch(base+'/',{method:'POST'})).status,405)}finally{server.close()}});\n`;
  return {
    'index.html': home, 'style.css':style, 'app.mjs':app, 'core.mjs':core, 'core.test.mjs':tests,
    'sw.js':sw, 'server.mjs':server, 'server.test.mjs':integration,
    'icon-192.png':brandPng(192,spec.accent), 'icon-512.png':brandPng(512,spec.accent),
    'manifest.webmanifest':json({name:spec.title,short_name:spec.title.slice(0,22),description:spec.description,start_url:'/',display:'standalone',background_color:'#080b18',theme_color:'#080b18',icons:[{src:'/icon-192.png',sizes:'192x192',type:'image/png',purpose:'any maskable'},{src:'/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any maskable'}]}),
    'package.json':json({name:spec.slug,version:'1.0.0',private:true,type:'module',scripts:{start:'node server.mjs',test:'node --test *.test.mjs'}}),
    'README.md':`# ${spec.title}\n\nMobile-first offline-ready web application.\n\nRun: \`npm start\`\nTest: \`npm test\`\n\nNo remote data transfer; content persists in localStorage. No paid services required.\n`
  };
}

function game(spec){
 const files=baseWeb(spec);
 files['index.html']=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><link rel="manifest" href="/manifest.webmanifest"><meta name="theme-color" content="#080b18"><link rel="stylesheet" href="/style.css"><title>${esc(spec.title)}</title></head><body><main id="root"><header class="top"><div class="mark">Ω</div><h1>${esc(spec.title)}</h1><span class="status">Touch-ready • Offline</span></header><section class="panel"><p class="eyebrow">OMEGA ARCADE</p><h2>Neon runner</h2><p>Tap or press SPACE to jump. Avoid obstacles. Scores save locally.</p><canvas id="game" width="640" height="360" aria-label="Game view: jump to avoid hazards" style="display:block;width:100%;height:auto;border-radius:12px;background:#071426;touch-action:manipulation" tabindex="0"></canvas><p id="score" role="status">Score: 0</p><button id="start">Start / Restart</button></section></main><script type="module" src="/game.mjs"></script></body></html>`;
 files['physics.mjs']=`export function next(state,dt){const step=Math.min(Math.max(dt,0),.05);const vy=state.vy+state.gravity*step;const y=Math.min(state.floor,state.y+vy*step);return {...state,y,vy:y===state.floor?0:vy,score:state.score+step*10}}
export function jump(state){return state.y>=state.floor?{...state,vy:-state.jumpVelocity}:state}
export function collides(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}\n`;
 files['physics.test.mjs']=`import test from 'node:test';import assert from 'node:assert/strict';import {next,jump,collides} from './physics.mjs';
test('jump moves player upwards',()=>{const s={y:300,vy:0,floor:300,gravity:800,jumpVelocity:350,score:0};assert(next(jump(s),.01).y<300)});
test('landing stops at floor',()=>{const s={y:299,vy:300,floor:300,gravity:800,jumpVelocity:350,score:0};assert.equal(next(s,.03).vy,0)});
test('collision hitbox',()=>{assert(collides({x:10,y:0,w:10,h:10},{x:15,y:0,w:3,h:3}));assert(!collides({x:0,y:0,w:3,h:3},{x:10,y:0,w:3,h:3}))});\n`;
 files['game.mjs']=`import {next,jump,collides} from './physics.mjs';
const canvas=document.querySelector('#game'),ctx=canvas.getContext('2d'),scoreEl=document.querySelector('#score');const floor=300;
let state,obstacles,last,playing=false,raf=0;let best=Number(localStorage.getItem('omega.arcade.best')||0);
function reset(){cancelAnimationFrame(raf);state={x:95,y:floor,vy:0,floor,gravity:850,jumpVelocity:410,score:0};obstacles=[];last=0;playing=true;raf=requestAnimationFrame(frame);canvas.focus()}
function onJump(){if(playing)state=jump(state)};
window.addEventListener('keydown',e=>{if(['Space','ArrowUp'].includes(e.code)){e.preventDefault();onJump()}});canvas.addEventListener('pointerdown',onJump);document.querySelector('#start').addEventListener('click',reset);
function frame(t){if(!playing)return;const dt=last?Math.min((t-last)/1000,.05):0;last=t;state=next(state,dt);const speed=190+Math.min(280,state.score*2);for(const o of obstacles)o.x-=speed*dt;obstacles=obstacles.filter(x=>x.x>-35);if(!obstacles.length||obstacles.at(-1).x<390)obstacles.push({x:660,y:floor+6,w:24,h:34});
ctx.fillStyle='#081326';ctx.fillRect(0,0,640,360);ctx.fillStyle='${spec.accent}';ctx.fillRect(0,339,640,2);ctx.fillStyle='#b4ecff';ctx.fillRect(state.x,state.y,28,38);ctx.fillStyle='#ff558d';for(const o of obstacles){ctx.fillRect(o.x,o.y,o.w,o.h);if(collides({x:state.x,y:state.y,w:28,h:38},o)){playing=false;best=Math.max(best,Math.floor(state.score));try{localStorage.setItem('omega.arcade.best',String(best))}catch{}break;}}scoreEl.textContent='Score: '+Math.floor(state.score)+' | Best: '+best+(playing?'':' | Game over');if(playing)raf=requestAnimationFrame(frame)}
ctx.fillStyle='#e8f0ff';ctx.font='22px sans-serif';ctx.fillText('Press Start',240,175);\n`;
 files['sw.js']=files['sw.js'].replace("'/app.mjs','/core.mjs'","'/game.mjs','/physics.mjs'");
 files['style.css']+='\n#game{display:block;width:100%;height:auto;border-radius:12px;background:#071426;touch-action:manipulation}';
 delete files['app.mjs'];delete files['core.mjs'];delete files['core.test.mjs'];
 files['README.md']=`# ${spec.title}\n\nResponsive HTML5 Canvas mobile game. Tap to jump; SPACE/UP on desktop. Includes offline PWA caching, local high score, deterministic physics tests.\n\n\`npm test\` then \`npm start\`. No external game engine, assets or account.\n`;
 files['server.test.mjs']=files['server.test.mjs'].replace('/Work queue/','/Neon runner/');
 return files;
}

function api(spec){
 const apiSource=`import {createServer} from 'node:http';import {randomUUID} from 'node:crypto';
export function makeService(){const data=new Map();const json=(res,status,v)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}).end(JSON.stringify(v))};return createServer(async(req,res)=>{const path=new URL(req.url,'http://localhost').pathname;if(path==='/health'&&req.method==='GET')return json(res,200,{status:'ok'});if(path==='/tasks'&&req.method==='GET')return json(res,200,{items:[...data.values()]});if(path==='/tasks'&&req.method==='POST'){let str='';for await(const chunk of req){str+=chunk;if(str.length>10000)return json(res,413,{error:'too_large'})}let body;try{body=JSON.parse(str)}catch{return json(res,400,{error:'bad_json'})}if(typeof body.title!=='string'||!body.title.trim()||body.title.length>140)return json(res,422,{error:'invalid_title'});const item={id:randomUUID(),title:body.title.trim(),done:false};data.set(item.id,item);return json(res,201,item)}const m=/^\\/tasks\\/([a-f0-9-]{36})$/.exec(path);if(m&&req.method==='DELETE'){const removed=data.delete(m[1]);return json(res,removed?200:404,{removed})}return json(res,404,{error:'not_found'})})}
if(process.argv[1]&&import.meta.url.endsWith(process.argv[1]))makeService().listen(Number(process.env.PORT||8765),'0.0.0.0');\n`;
 const tests=`import test from 'node:test';import assert from 'node:assert/strict';import {once} from 'node:events';import {makeService} from './server.mjs';
test('CRUD and health E2E',async()=>{const server=makeService().listen(0,'127.0.0.1');await once(server,'listening');const origin='http://127.0.0.1:'+server.address().port;try{assert.equal((await fetch(origin+'/health')).status,200);const a=await fetch(origin+'/tasks',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title:'ship release'})});assert.equal(a.status,201);const item=await a.json();const all=await(await fetch(origin+'/tasks')).json();assert.equal(all.items.length,1);assert.equal((await fetch(origin+'/tasks/'+item.id,{method:'DELETE'})).status,200);assert.equal((await(await fetch(origin+'/tasks')).json()).items.length,0);assert.equal((await fetch(origin+'/tasks',{method:'POST',body:'{}'})).status,422)}finally{server.close()}});\n`;
 return {'server.mjs':apiSource,'server.test.mjs':tests,'package.json':json({name:spec.slug,version:'1.0.0',private:true,type:'module',scripts:{start:'node server.mjs',test:'node --test *.test.mjs'}}),'README.md':`# ${spec.title}\n\nSmall dependency-free JSON API reference. In-memory, non-production data store.\n\nRoutes: GET /health, GET /tasks, POST /tasks, DELETE /tasks/:id. Run: \`npm test\` / \`npm start\`.\n`};
}

function android(spec){
 const pkg='org.mojealterego.omega.'+spec.slug.replaceAll('-','_');
 const javaPath='app/src/main/java/'+pkg.replaceAll('.','/')+'/MainActivity.java';
 const java=`package ${pkg};
import android.app.Activity;import android.os.Bundle;import android.view.View;import android.view.MotionEvent;import android.graphics.Canvas;import android.graphics.Paint;import android.graphics.Color;
public class MainActivity extends Activity {
 @Override public void onCreate(Bundle b){super.onCreate(b);setContentView(new GameView());}
 class GameView extends View {Paint paint=new Paint(3);float x=150,y=150,r=26,velocity=0;long last=0;int score=0;GameView(){super(MainActivity.this);setFocusable(true);} 
 @Override public void onDraw(Canvas canvas){super.onDraw(canvas);long now=System.nanoTime();float dt=last==0?0:Math.min(.05f,(now-last)/1000000000f);last=now;float floor=getHeight()*.82f;velocity+=820*dt;y=Math.min(floor, y+velocity*dt);if(y==floor)velocity=0;canvas.drawColor(Color.rgb(8,11,24));paint.setColor(Color.rgb(56,189,248));canvas.drawCircle(x,y,r,paint);paint.setColor(Color.WHITE);paint.setTextSize(36);canvas.drawText("${esc(spec.title).replaceAll('&quot;','')}",28,60,paint);paint.setTextSize(24);canvas.drawText("Tap to jump | Jumps: "+score,28,105,paint);postInvalidateDelayed(16);}
 @Override public boolean onTouchEvent(MotionEvent event){if(event.getAction()==MotionEvent.ACTION_DOWN){velocity=-490;score++;invalidate();return true;}return true;}}
}
`;
 return {
 'settings.gradle':`pluginManagement { repositories { google(); mavenCentral(); gradlePluginPortal() } }\ndependencyResolutionManagement { repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS); repositories { google(); mavenCentral() } }\nrootProject.name='${spec.slug}'\ninclude ':app'\n`,
 'build.gradle':`plugins { id 'com.android.application' version '8.7.3' apply false }\n`,
 'app/build.gradle':`plugins { id 'com.android.application' }\nandroid { namespace '${pkg}'; compileSdk 35; defaultConfig { applicationId '${pkg}'; minSdk 26; targetSdk 35; versionCode 1; versionName '1.0' }; compileOptions { sourceCompatibility JavaVersion.VERSION_17; targetCompatibility JavaVersion.VERSION_17 } }\n`,
 'gradle.properties':'org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8\nandroid.useAndroidX=true\n',
 'app/src/main/AndroidManifest.xml':`<manifest xmlns:android="http://schemas.android.com/apk/res/android"><application android:theme="@android:style/Theme.Material.NoActionBar" android:label="${esc(spec.title)}" android:allowBackup="false" android:usesCleartextTraffic="false"><activity android:name=".MainActivity" android:exported="true"><intent-filter><action android:name="android.intent.action.MAIN"/><category android:name="android.intent.category.LAUNCHER"/></intent-filter></activity></application></manifest>`,
 [javaPath]:java,
 'README.md':`# ${spec.title}\n\nNative Android Java 17 Canvas prototype, no webview and no third-party dependencies. Gradle AGP 8.7.3, compile SDK 35.\n\nBuild on a machine with Android SDK 35, JDK 17 and Gradle 8.9: \`gradle assembleDebug\`. Output: \`app/build/outputs/apk/debug/app-debug.apk\`.\n\nOnly Android CI/device tests can prove an installable APK. Template generation is not equivalent to a verified build.\n`
 };
}

export function createFiles(specInput){
 const spec=validateSpec(specInput);
 const files=spec.kind==='web'?baseWeb(spec):spec.kind==='game'?game(spec):spec.kind==='api'?api(spec):android(spec);
 for(const [name,content] of Object.entries(files)){
  if(name.startsWith('/')||name.includes('..')||name.includes('\\')||/\x00/.test(name)||!(typeof content==='string'||Buffer.isBuffer(content)))throw new Error('INVALID_TEMPLATE_PATH');
 }
 return Object.freeze({...files});
}

export function scaffold(specInput,{out,allowExisting=false}={}){
 const spec=validateSpec(specInput);if(typeof out!=='string'||out.length<2)throw new Error('OUTPUT_REQUIRED');
 const target=resolve(out);if(existsSync(target)&&!allowExisting)throw new Error('OUTPUT_ALREADY_EXISTS');
 const files=createFiles(spec);mkdirSync(target,{recursive:true});const hashes=[];
 for(const name of Object.keys(files).sort()){const path=join(target,name);mkdirSync(resolve(path,'..'),{recursive:true});writeFileSync(path,files[name],{flag:'wx'});hashes.push({name,sha256:createHash('sha256').update(files[name]).digest('hex')})}
 writeFileSync(join(target,'omega-evidence.json'),json({format:'omega.project.v1',spec,files:hashes,verifiedBuild:false,verifiedAndroidApk:false}),{flag:'wx'});
 return {target,spec,fileCount:hashes.length+1,files:hashes};
}

export async function main(args=process.argv.slice(2)){
 if(args.length!==4||args[0]!=='create'){console.error('Usage: node scripts/omega-project-factory.mjs create <web|game|android|api> <slug> <out-path>');return 2}
 const [,kind,slug,out]=args;try{const value=scaffold({kind,slug,title:slug.replaceAll('-',' ').replace(/\b\w/g,c=>c.toUpperCase())},{out});console.log(json({ok:true,kind:value.spec.kind,output:relative(process.cwd(),value.target),files:value.fileCount,androidBuildVerified:false}));return 0}catch(e){console.error(e.message);return 1}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){main().then(code=>{process.exitCode=code})}
