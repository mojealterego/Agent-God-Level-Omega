export function normalizeTask(value){return typeof value==='string'?value.trim().replace(/\s+/g,' ').slice(0,140):''}
export function addTask(tasks,label,id){const clean=normalizeTask(label);if(!Array.isArray(tasks)||!clean||typeof id!=='string'||!id||tasks.some(t=>t.id===id)||tasks.length>=100)return tasks;return [...tasks,{id,label:clean}]}
export function removeTask(tasks,id){return tasks.filter(task=>task.id!==id)}
