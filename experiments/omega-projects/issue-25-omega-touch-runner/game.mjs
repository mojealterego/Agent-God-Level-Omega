import {next,jump,collides} from './physics.mjs';
const canvas=document.querySelector('#game'),ctx=canvas.getContext('2d'),scoreEl=document.querySelector('#score');const floor=300;
let state,obstacles,last,playing=false,raf=0;let best=Number(localStorage.getItem('omega.arcade.best')||0);
function reset(){cancelAnimationFrame(raf);state={x:95,y:floor,vy:0,floor,gravity:850,jumpVelocity:410,score:0};obstacles=[];last=0;playing=true;raf=requestAnimationFrame(frame);canvas.focus()}
function onJump(){if(playing)state=jump(state)};
window.addEventListener('keydown',e=>{if(['Space','ArrowUp'].includes(e.code)){e.preventDefault();onJump()}});canvas.addEventListener('pointerdown',onJump);document.querySelector('#start').addEventListener('click',reset);
function frame(t){if(!playing)return;const dt=last?Math.min((t-last)/1000,.05):0;last=t;state=next(state,dt);const speed=190+Math.min(280,state.score*2);for(const o of obstacles)o.x-=speed*dt;obstacles=obstacles.filter(x=>x.x>-35);if(!obstacles.length||obstacles.at(-1).x<390)obstacles.push({x:660,y:floor+6,w:24,h:34});
ctx.fillStyle='#081326';ctx.fillRect(0,0,640,360);ctx.fillStyle='#f97316';ctx.fillRect(0,339,640,2);ctx.fillStyle='#b4ecff';ctx.fillRect(state.x,state.y,28,38);ctx.fillStyle='#ff558d';for(const o of obstacles){ctx.fillRect(o.x,o.y,o.w,o.h);if(collides({x:state.x,y:state.y,w:28,h:38},o)){playing=false;best=Math.max(best,Math.floor(state.score));try{localStorage.setItem('omega.arcade.best',String(best))}catch{}break;}}scoreEl.textContent='Score: '+Math.floor(state.score)+' | Best: '+best+(playing?'':' | Game over');if(playing)raf=requestAnimationFrame(frame)}
ctx.fillStyle='#e8f0ff';ctx.font='22px sans-serif';ctx.fillText('Press Start',240,175);
