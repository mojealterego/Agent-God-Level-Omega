import {
  classifySecretPlacement,
  selectVerificationPlan,
  securityReleaseGate,
  revertImpact,
  designSystemAdherence
} from '../tools/lovable-assurance/project-readiness.mjs';

export function lovablePreflight(input={}){
  const security=securityReleaseGate(input.security??{});
  const secrets=(Array.isArray(input.secrets)?input.secrets:[]).map(classifySecretPlacement);
  const design=input.designSystem?designSystemAdherence(input.designSystem):{passed:true,blockers:[]};
  const revert=input.revert?revertImpact(input.revert):{passed:true,blockers:[]};
  const blockers=[
    ...security.blockers,
    ...secrets.flatMap(x=>x.blockers),
    ...design.blockers,
    ...revert.blockers
  ];
  return {
    passed:blockers.length===0,
    status:blockers.length===0?'READY_FOR_VERIFICATION':'BLOCKED',
    blockers:[...new Set(blockers)],
    verification:selectVerificationPlan(input.verification??{})
  };
}

export function lovableReleaseGate({preflight,verificationObserved=false,buildObserved=false,publishRequested=false,publishObserved=false}={}){
  const blockers=[];
  if(preflight?.passed!==true)blockers.push(...(preflight?.blockers??['PREFLIGHT_NOT_PASSED']));
  if(verificationObserved!==true)blockers.push('VERIFICATION_NOT_OBSERVED');
  if(buildObserved!==true)blockers.push('BUILD_NOT_OBSERVED');
  if(publishRequested===true&&publishObserved!==true)blockers.push('PUBLISH_NOT_OBSERVED');
  return {passed:blockers.length===0,status:blockers.length===0?'ACCEPTED':'BLOCKED',blockers:[...new Set(blockers)]};
}
