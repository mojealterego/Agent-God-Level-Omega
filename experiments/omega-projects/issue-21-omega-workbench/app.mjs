import { normalizeTask, addTask, removeTask } from './core.mjs';
const key = 'omega.task.queue.v1';
const list = document.querySelector('#tasks');
const counter = document.querySelector('#count');
let tasks;
try { const stored = JSON.parse(localStorage.getItem(key) || '[]'); tasks = Array.isArray(stored) ? stored.filter(x => x && typeof x.id==='string' && typeof x.label==='string').slice(0,100) : []; } catch {tasks=[];}
function render(){list.replaceChildren(); for (const t of tasks){const li=document.createElement('li'); li.className='task'; const span=document.createElement('span');span.textContent=t.label;const del=document.createElement('button');del.type='button';del.textContent='Remove';del.setAttribute('aria-label','Remove '+t.label);del.onclick=()=>{tasks=removeTask(tasks,t.id);persist();};li.append(span,del);list.append(li)}counter.textContent=tasks.length+' '+(tasks.length===1?'item':'items');}
function persist(){try{localStorage.setItem(key,JSON.stringify(tasks))}catch{}render()}
document.querySelector('#add-form').addEventListener('submit',e=>{e.preventDefault();const input=document.querySelector('#task');const label=normalizeTask(input.value);if(!label)return;tasks=addTask(tasks,label,crypto.randomUUID());input.value='';persist()});
if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(()=>{})}
render();