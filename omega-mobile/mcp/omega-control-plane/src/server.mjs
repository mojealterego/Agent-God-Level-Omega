import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { pathToFileURL } from 'node:url';
import * as z from 'zod/v4';
import { OmegaControlPlane } from './core/control-plane.mjs';

function success(value) {
  return {
    content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
    structuredContent: { result: value }
  };
}

function failure(error) {
  const value = {
    name: error?.name ?? 'Error',
    code: error?.code ?? null,
    message: error?.message ?? String(error)
  };
  return {
    content: [{ type: 'text', text: JSON.stringify({ error: value }, null, 2) }],
    structuredContent: { error: value },
    isError: true
  };
}

async function invoke(handler) {
  try {
    return success(await handler());
  } catch (error) {
    return failure(error);
  }
}

export function createServer(context = {}) {
  const plane = new OmegaControlPlane();
  const server = new McpServer({ name: 'omega-control-plane', version: '4.3.2' });

  server.registerTool(
    'omega_capabilities',
    {
      description: 'Discover the live OMEGA control-plane capabilities available on this machine.',
      inputSchema: z.object({})
    },
    async () => invoke(() => plane.capabilities())
  );

  server.registerTool(
    'omega_host_info',
    {
      description: 'Identify the execution host, including Android/Termux detection and configured workspace roots, without exposing environment secrets.',
      inputSchema: z.object({})
    },
    async () => invoke(() => plane.hostInfo())
  );

  server.registerTool(
    'omega_terminal_run',
    {
      description: 'Run one argv-based local process inside configured workspace roots. Restricted mode is read-only by default; no shell string is used.',
      inputSchema: z.object({
        argv: z.array(z.string().min(1)).min(1).max(128),
        cwd: z.string().min(1),
        sideEffect: z.enum(['R', 'L', 'E', 'H']).default('R'),
        timeoutMs: z.number().int().min(1).max(900000).default(120000),
        maxOutputBytes: z.number().int().min(1).max(16777216).default(1048576)
      })
    },
    async (input) => invoke(() => plane.terminalRun(input))
  );

  server.registerTool(
    'omega_repository_inspect',
    {
      description: 'Inspect repository identity, branch, HEAD, status and remotes without changing branch state.',
      inputSchema: z.object({ cwd: z.string().min(1) })
    },
    async ({ cwd }) => invoke(() => plane.repositoryInspect(cwd))
  );

  server.registerTool(
    'omega_sandbox_create',
    {
      description: 'Create a detached Git worktree sandbox while proving that the source branch and HEAD remain unchanged.',
      inputSchema: z.object({
        repository: z.string().min(1),
        destination: z.string().min(1),
        revision: z.string().min(1).default('HEAD')
      })
    },
    async (input) => invoke(() => plane.sandboxCreate(input))
  );

  server.registerTool(
    'omega_ci',
    {
      description: 'Inspect or trigger GitHub/GitLab CI through native CLIs. Triggering is an external mutation and is disabled unless explicitly enabled by policy.',
      inputSchema: z.object({
        cwd: z.string().min(1),
        provider: z.enum(['github', 'gitlab']),
        action: z.enum(['list', 'view', 'trigger']),
        limit: z.number().int().min(1).max(100).optional(),
        runId: z.union([z.string().min(1), z.number().int().positive()]).optional(),
        workflow: z.string().min(1).optional(),
        ref: z.string().min(1).optional()
      })
    },
    async (input) => invoke(() => plane.ci(input))
  );

  server.registerTool(
    'omega_container_run',
    {
      description: 'Run a bounded ephemeral Docker/Podman container with network disabled and a read-only workspace mount by default.',
      inputSchema: z.object({
        engine: z.enum(['docker', 'podman']).default('docker'),
        image: z.string().min(1).max(256),
        workspace: z.string().min(1),
        command: z.array(z.string()).min(1).max(128),
        writable: z.boolean().default(false),
        network: z.literal('none').default('none'),
        memory: z.string().regex(/^\d+[kKmMgG]$/).default('2g'),
        cpus: z.string().regex(/^\d+(?:\.\d+)?$/).default('2'),
        timeoutMs: z.number().int().min(1).max(900000).default(300000),
        maxOutputBytes: z.number().int().min(1).max(16777216).default(2097152),
        env: z.record(z.string(), z.string()).default({})
      })
    },
    async (input) => invoke(() => plane.containerRun(input))
  );

  server.registerTool(
    'omega_build_run',
    {
      description: 'Run a project build/test command under bounded execution. Project code execution is policy-gated.',
      inputSchema: z.object({
        cwd: z.string().min(1),
        argv: z.array(z.string().min(1)).min(1).max(128),
        timeoutMs: z.number().int().min(1).max(900000).default(600000),
        maxOutputBytes: z.number().int().min(1).max(16777216).default(4194304)
      })
    },
    async (input) => invoke(() => plane.buildRun(input))
  );

  server.registerTool(
    'omega_verify',
    {
      description: 'Run an ordered verification suite and stop on the first failing gate, returning evidence for every observed check.',
      inputSchema: z.object({
        cwd: z.string().min(1),
        timeoutMs: z.number().int().min(1).max(900000).default(600000),
        checks: z.array(z.object({
          name: z.string().min(1).optional(),
          argv: z.array(z.string().min(1)).min(1).max(128),
          timeoutMs: z.number().int().min(1).max(900000).optional()
        })).min(1).max(20)
      })
    },
    async (input) => invoke(() => plane.verify(input))
  );

  server.registerTool(
    'omega_device',
    {
      description: 'List or operate Android devices/emulators through ADB/emulator with explicit serial targeting for device mutation.',
      inputSchema: z.object({
        cwd: z.string().min(1),
        kind: z.enum(['adb', 'emulator']).default('adb'),
        action: z.enum(['list', 'shell', 'install', 'logcat', 'list-avds', 'start']),
        serial: z.string().min(1).optional(),
        command: z.array(z.string()).min(1).max(64).optional(),
        artifact: z.string().min(1).optional(),
        pid: z.number().int().positive().optional(),
        avd: z.string().min(1).optional(),
        wipeData: z.boolean().default(false),
        noWindow: z.boolean().default(false)
      })
    },
    async (input) => invoke(() => plane.device(input))
  );

  server.registerTool(
    'omega_knowledge_info',
    {
      description: 'Report whether the read-only phone knowledge folder is configured and which file types can be extracted.',
      inputSchema: z.object({})
    },
    async () => invoke(() => plane.knowledgeInfo())
  );

  server.registerTool(
    'omega_knowledge_list',
    {
      description: 'List files and folders under the configured phone knowledge root without exposing files outside it.',
      inputSchema: z.object({
        path: z.string().default(''),
        recursive: z.boolean().default(false),
        maxEntries: z.number().int().min(1).max(20000).default(1000)
      })
    },
    async (input) => invoke(() => plane.knowledgeList(input))
  );

  server.registerTool(
    'omega_knowledge_metadata',
    {
      description: 'Return read-only metadata for one path under the configured phone knowledge root.',
      inputSchema: z.object({ path: z.string().min(1) })
    },
    async (input) => invoke(() => plane.knowledgeMetadata(input))
  );

  server.registerTool(
    'omega_knowledge_read',
    {
      description: 'Extract bounded text from TXT/MD/HTML/JSON/code/PDF/DOCX/ODT files under the configured phone knowledge root.',
      inputSchema: z.object({
        path: z.string().min(1),
        offset: z.number().int().min(0).max(9007199254740991).default(0),
        maxBytes: z.number().int().min(1).max(4194304).default(1048576)
      })
    },
    async (input) => invoke(() => plane.knowledgeRead(input))
  );

  server.registerTool(
    'omega_knowledge_search',
    {
      description: 'Search supported documents under the configured phone knowledge root using bounded read-only extraction.',
      inputSchema: z.object({
        query: z.string().min(1).max(512),
        path: z.string().default(''),
        recursive: z.boolean().default(true),
        maxFiles: z.number().int().min(1).max(2000).default(250),
        maxMatches: z.number().int().min(1).max(500).default(100),
        maxBytesPerFile: z.number().int().min(1024).max(1048576).default(262144)
      })
    },
    async (input) => invoke(() => plane.knowledgeSearch(input))
  );

  server.registerTool(
    'omega_artifact_inspect',
    {
      description: 'Verify a local artifact inside workspace roots and return immutable size, extension, timestamp and SHA-256 metadata.',
      inputSchema: z.object({ path: z.string().min(1) })
    },
    async ({ path }) => invoke(() => plane.artifactInspect(path))
  );


  server.registerTool(
    'omega_gateway_info',
    {
      description: 'Report the active OMEGA transport/runtime lane and normalized authenticated caller metadata without exposing bearer tokens or secrets.',
      inputSchema: z.object({})
    },
    async () => invoke(async () => ({
      transport: context.transport ?? 'stdio',
      authenticated: Boolean(context.authInfo),
      client_id: context.authInfo?.clientId ?? null,
      scopes: Array.isArray(context.authInfo?.scopes) ? [...context.authInfo.scopes] : [],
      cloud_run: Boolean(process.env.K_SERVICE),
      cloud_run_service: process.env.K_SERVICE ?? null,
      cloud_run_revision: process.env.K_REVISION ?? null,
      termux_secure_mcp_preserved: true,
      remote_mcp_endpoint: context.transport === 'remote-http' ? '/mcp' : null
    }))
  );

  return server;
}

export function startStdio() {
  const handle = serveStdio(() => createServer({ transport: 'stdio' }));
  console.error('OMEGA MCP control plane v4.3.2 running on stdio');
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      void handle.close().finally(() => process.exit(0));
    });
  }
  return handle;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startStdio();
}
