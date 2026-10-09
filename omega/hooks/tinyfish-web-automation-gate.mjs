import {preflight} from '../tools/tinyfish-web-automation/adapter.mjs';

/** Reusable deterministic guard. Provider actions must independently repeat this check. */
export function tinyfishWebAutomationGate(request, environment) {
  const verdict=preflight(request,environment);
  return {passed:verdict.allowed,status:verdict.allowed?'APPROVED_FOR_RUNTIME':'BLOCKED',blockers:verdict.blockers,host:verdict.host,scope:verdict.scope};
}
