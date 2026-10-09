import test from 'node:test';import assert from 'node:assert/strict';import {normalizeTask,addTask,removeTask} from './core.mjs';
test('normalization and bounds',()=>{assert.equal(normalizeTask(' hello  world '),'hello world');assert.equal(normalizeTask('x'.repeat(300)).length,140)});
test('idempotent insertion',()=>{let tasks=addTask([],'hello','1');assert.equal(addTask(tasks,'hello','1').length,1);assert.equal(removeTask(tasks,'1').length,0)});
test('malformed task ignored',()=>assert.equal(addTask([],'  ','2').length,0));
