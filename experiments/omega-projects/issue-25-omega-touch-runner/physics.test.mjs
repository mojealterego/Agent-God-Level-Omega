import test from 'node:test';import assert from 'node:assert/strict';import {next,jump,collides} from './physics.mjs';
test('jump moves player upwards',()=>{const s={y:300,vy:0,floor:300,gravity:800,jumpVelocity:350,score:0};assert(next(jump(s),.01).y<300)});
test('landing stops at floor',()=>{const s={y:299,vy:300,floor:300,gravity:800,jumpVelocity:350,score:0};assert.equal(next(s,.03).vy,0)});
test('collision hitbox',()=>{assert(collides({x:10,y:0,w:10,h:10},{x:15,y:0,w:3,h:3}));assert(!collides({x:0,y:0,w:3,h:3},{x:10,y:0,w:3,h:3}))});
