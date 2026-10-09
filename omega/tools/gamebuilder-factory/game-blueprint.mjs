const text=v=>String(v??'').trim();
const uniq=a=>[...new Set(a.map(text).filter(Boolean))];

const ROLE_MAP={
  physics:'omega-game-physics-engineer',
  rendering:'omega-game-rendering-architect',
  sprite:'omega-game-rendering-architect',
  state:'omega-game-systems-designer',
  gameplay:'omega-game-gameplay-architect',
  audio:'omega-game-audio-systems-engineer',
  networking:'omega-game-networking-engineer',
  ui:'omega-game-ui-hud-engineer',
  save:'omega-game-save-state-engineer',
  performance:'omega-game-cpu-performance-engineer',
  testing:'omega-game-automated-gameplay-tester'
};

export function buildGameBlueprint(input={}){
  const modules=uniq(Array.isArray(input.modules)?input.modules:[]);
  const roles=uniq(modules.map(m=>{
    const k=m.toLowerCase();
    return Object.entries(ROLE_MAP).find(([key])=>k.includes(key))?.[1]||'omega-game-technical-director';
  }));
  return {
    title:text(input.title),
    engine:text(input.engine),
    targetPlatforms:uniq(Array.isArray(input.targetPlatforms)?input.targetPlatforms:[]),
    coreLoop:text(input.coreLoop),
    modules,
    specialistRoles:roles,
    performanceBudget:input.performanceBudget??null,
    memoryBudget:input.memoryBudget??null,
    testPlan:uniq(Array.isArray(input.testPlan)?input.testPlan:[])
  };
}

export function scoreGameBuildPlan(input={}){
  const b=buildGameBlueprint(input);
  let score=0;
  if(b.engine)score+=0.15;
  if(b.targetPlatforms.length)score+=0.15;
  if(b.coreLoop)score+=0.20;
  if(b.modules.length)score+=0.15;
  if(b.performanceBudget)score+=0.10;
  if(b.memoryBudget)score+=0.10;
  if(b.testPlan.length)score+=0.15;
  return Number(Math.min(1,score).toFixed(3));
}
