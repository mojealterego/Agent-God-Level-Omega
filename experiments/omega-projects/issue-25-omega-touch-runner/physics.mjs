export function next(state,dt){const step=Math.min(Math.max(dt,0),.05);const vy=state.vy+state.gravity*step;const y=Math.min(state.floor,state.y+vy*step);return {...state,y,vy:y===state.floor?0:vy,score:state.score+step*10}}
export function jump(state){return state.y>=state.floor?{...state,vy:-state.jumpVelocity}:state}
export function collides(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
