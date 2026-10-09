const text=v=>String(v??'').trim();

export function gameBuilderGate(input={}){
  const blockers=[],warnings=[];
  if(!text(input.engine))blockers.push('ENGINE_REQUIRED');
  if(!Array.isArray(input.targetPlatforms)||input.targetPlatforms.length===0)blockers.push('TARGET_PLATFORM_REQUIRED');
  if(!text(input.coreLoop))blockers.push('CORE_LOOP_REQUIRED');
  if(!Array.isArray(input.modules)||input.modules.length===0)blockers.push('MODULE_GRAPH_REQUIRED');
  if(input.assetRightsConfirmed!==true)blockers.push('ASSET_RIGHTS_NOT_CONFIRMED');
  if(!input.performanceBudget)blockers.push('PERFORMANCE_BUDGET_REQUIRED');
  if(!Array.isArray(input.testPlan)||input.testPlan.length===0)blockers.push('TEST_PLAN_REQUIRED');
  if(input.storePolicyReviewed!==true)warnings.push('STORE_POLICY_NOT_REVIEWED');
  return {passed:blockers.length===0,status:blockers.length?'BLOCKED':'READY',blockers:[...new Set(blockers)],warnings:[...new Set(warnings)]};
}
