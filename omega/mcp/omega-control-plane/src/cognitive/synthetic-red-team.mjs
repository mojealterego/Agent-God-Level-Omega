function caseId(category, name) {
  return `${category}:${name}`.toLowerCase().replace(/[^a-z0-9:_-]+/g, '-');
}

export class SyntheticRedTeam {
  constructor({ maxCases = 64 } = {}) {
    if (!Number.isInteger(maxCases) || maxCases < 1 || maxCases > 512) {
      throw new RangeError('maxCases must be between 1 and 512');
    }
    this.maxCases = maxCases;
  }

  generate({ surface = 'generic', fields = [], capabilities = [] } = {}) {
    const cases = [];
    const push = (category, name, payload, expected) => {
      if (cases.length >= this.maxCases) return;
      cases.push({
        id: caseId(category, `${surface}:${name}`),
        category,
        surface,
        name,
        payload,
        expected
      });
    };

    push('boundary', 'empty-input', {}, 'reject-or-handle-explicitly');
    push('resilience', 'duplicate-request', { repeat: 2 }, 'idempotent-or-detected');
    push('resilience', 'timeout', { fault: 'timeout' }, 'bounded-timeout-and-cleanup');
    push('resilience', 'partial-failure', { fault: 'partial-write' }, 'rollback-or-consistent-recovery');

    for (const field of fields) {
      if (cases.length >= this.maxCases) break;
      const name = String(field.name ?? 'field');
      if (field.type === 'string') {
        push('boundary', `${name}-empty`, { [name]: '' }, 'validated');
        push('security', `${name}-injection`, { [name]: "'; DROP TABLE x; --" }, 'treated-as-data');
        if (/path/i.test(name)) push('security', `${name}-traversal`, { [name]: '../../etc/passwd' }, 'path-confined');
      } else if (field.type === 'number') {
        if (Number.isFinite(field.min)) push('boundary', `${name}-below-min`, { [name]: field.min - 1 }, 'rejected');
        if (Number.isFinite(field.max)) push('boundary', `${name}-above-max`, { [name]: field.max + 1 }, 'rejected');
        push('boundary', `${name}-nan`, { [name]: 'NaN' }, 'rejected');
      } else if (field.type === 'boolean') {
        push('boundary', `${name}-null`, { [name]: null }, 'explicit-null-policy');
      }
    }

    if (capabilities.includes('network')) {
      push('security', 'ssrf-loopback', { url: 'http://127.0.0.1/' }, 'blocked-or-explicitly-allowed');
      push('resilience', 'upstream-5xx', { fault: 'http-503' }, 'bounded-retry-and-circuit-break');
    }

    if (capabilities.includes('filesystem')) {
      push('security', 'symlink-escape', { path: 'workspace/link-outside' }, 'realpath-confined');
      push('resilience', 'disk-write-failure', { fault: 'enospc' }, 'atomic-failure-no-corruption');
    }

    return cases.slice(0, this.maxCases);
  }
}
