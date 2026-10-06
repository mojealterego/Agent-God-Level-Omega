function positiveInt(value, fallback) {
  const number = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(number) || number < 1 || number > 100) throw new Error('limit must be an integer between 1 and 100');
  return number;
}

export function buildCiCommand({ provider, action, limit, runId, workflow, ref, fields } = {}) {
  if (provider === 'github') {
    if (action === 'list') return ['gh', 'run', 'list', '--limit', String(positiveInt(limit, 10)), '--json', 'databaseId,status,conclusion,headSha,workflowName,url'];
    if (action === 'view') {
      if (!runId) throw new Error('runId is required');
      return ['gh', 'run', 'view', String(runId), '--json', fields ?? 'databaseId,status,conclusion,headSha,workflowName,url,jobs'];
    }
    if (action === 'trigger') {
      if (!workflow) throw new Error('workflow is required');
      return ['gh', 'workflow', 'run', String(workflow), ...(ref ? ['--ref', String(ref)] : [])];
    }
    throw new Error(`Unsupported GitHub CI action: ${action}`);
  }
  if (provider === 'gitlab') {
    if (action === 'list') return ['glab', 'ci', 'list', '--per-page', String(positiveInt(limit, 10))];
    if (action === 'view') {
      if (!runId) throw new Error('runId is required');
      return ['glab', 'ci', 'view', String(runId)];
    }
    if (action === 'trigger') return ['glab', 'ci', 'run', ...(ref ? ['--branch', String(ref)] : [])];
    throw new Error(`Unsupported GitLab CI action: ${action}`);
  }
  throw new Error(`Unsupported CI provider: ${provider}`);
}
