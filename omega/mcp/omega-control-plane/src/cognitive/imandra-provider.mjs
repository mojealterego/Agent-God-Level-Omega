const DEFAULT_TOOL_PATTERNS = [/reason.*code/i, /verify.*code/i, /formal/i, /codelogician/i, /analy[sz]e.*code/i];

export function imandraCodeLogicianPreset({ id = 'imandra', priority = 100, apiKeyEnv = 'IMANDRA_API_KEY' } = {}) {
  return {
    id,
    endpoint: 'https://api.imandra.ai/v1beta1/tools/mcp/code_logician',
    priority,
    capabilities: ['formal', 'verification', 'codelogician'],
    auth: { type: 'bearer-env', env: apiKeyEnv },
    metadata: { vendor: 'Imandra', service: 'CodeLogician', transport: 'streamable-http' }
  };
}

export class ImandraCodeLogicianProvider {
  constructor({ federation, providerId = 'imandra', toolName = null, toolPatterns = DEFAULT_TOOL_PATTERNS } = {}) {
    if (!federation) throw new TypeError('federation is required');
    this.federation = federation;
    this.providerId = providerId;
    this.toolName = toolName;
    this.toolPatterns = toolPatterns;
  }

  async discover() {
    const tools = await this.federation.listTools(this.providerId);
    if (!Array.isArray(tools) || tools.length === 0) throw new Error('Imandra/CodeLogician MCP exposed no tools');
    let selected = this.toolName ? tools.find((t) => t.name === this.toolName) : null;
    if (!selected) selected = tools.find((t) => this.toolPatterns.some((pattern) => pattern.test(t.name ?? '')));
    if (!selected) throw new Error('No CodeLogician verification tool was discoverable; configure toolName explicitly');
    this.toolName = selected.name;
    return { providerId: this.providerId, toolName: selected.name, tool: selected, tools };
  }

  async verify({ source, property = null, language = null, metadata = {} }) {
    if (!source) throw new TypeError('source is required');
    if (!this.toolName) await this.discover();
    const payload = { source, metadata };
    if (property !== null) payload.property = property;
    if (language !== null) payload.language = language;
    const out = await this.federation.callTool({ providerId: this.providerId, name: this.toolName, arguments: payload });
    return { providerId: this.providerId, toolName: this.toolName, result: out.result };
  }
}
