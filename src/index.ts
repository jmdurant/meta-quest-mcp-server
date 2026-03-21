#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig, getConfigErrors } from './config.js';

const config = loadConfig();

const server = new McpServer(
  { name: 'meta-quest-mcp-server', version: '1.0.0' },
  {
    capabilities: { logging: {} },
    ...(!config && {
      instructions: 'Meta Quest MCP Server — setup required. Run the "setup" tool for configuration instructions.',
    }),
  }
);

if (config) {
  const { MetaQuestClient } = await import('./client.js');
  const { registerBuildTools } = await import('./tools/builds.js');
  const { registerChannelTools } = await import('./tools/channels.js');
  const { registerAddonTools } = await import('./tools/addons.js');
  const { registerEntitlementTools } = await import('./tools/entitlements.js');

  const client = new MetaQuestClient(config);

  registerBuildTools(server, client);
  registerChannelTools(server, client);
  registerAddonTools(server, client);
  registerEntitlementTools(server, client);
} else {
  server.tool(
    'setup',
    'Show setup instructions for the Meta Quest MCP server',
    {},
    async () => {
      const errors = getConfigErrors();

      const envVars: Record<string, { required: boolean; description: string }> = {
        META_APP_ID: {
          required: true,
          description: 'Your App ID from the Oculus Developer Dashboard → API tab',
        },
        META_APP_SECRET: {
          required: true,
          description: 'Your App Secret from the Oculus Developer Dashboard → API tab',
        },
        OVR_PLATFORM_UTIL_PATH: {
          required: false,
          description: 'Absolute path to ovr-platform-util binary (optional if on PATH)',
        },
      };

      const statusLines: string[] = [];
      for (const [name, info] of Object.entries(envVars)) {
        const value = process.env[name];
        const errorEntry = errors.find(e => e.variable === name);
        if (errorEntry) {
          statusLines.push(`  ${name}: MISSING — ${errorEntry.message}`);
        } else if (value) {
          statusLines.push(`  ${name}: Set`);
        } else {
          statusLines.push(`  ${name}: Not set${info.required ? ' (REQUIRED)' : ' (optional)'}`);
        }
      }

      const missingList = errors.map(e => `- ${e.variable}: ${e.message}`).join('\n');

      const message = `Meta Quest MCP Server - Setup Required

This server needs the following environment variables configured in your Claude settings (~/.claude/settings.json):

"meta-quest": {
  "command": "node",
  "args": ["C:/Users/docto/meta-quest-mcp-server/dist/index.js"],
  "env": {
    "META_APP_ID": "your-app-id",
    "META_APP_SECRET": "your-app-secret",
    "OVR_PLATFORM_UTIL_PATH": "C:/path/to/ovr-platform-util.exe"
  }
}

How to get these values:
1. Go to https://developer.oculus.com/manage/
2. Select your app
3. Navigate to the API tab
4. Copy the App ID and App Secret

For build uploads, you also need ovr-platform-util:
1. Download from https://developer.oculus.com/downloads/native-linux/ (or Windows/Mac)
2. Set OVR_PLATFORM_UTIL_PATH to the binary path, or add it to your system PATH

Environment variable status:
${statusLines.join('\n')}

Missing:
${missingList}

After updating settings, restart Claude Code for changes to take effect.`;

      return { content: [{ type: 'text' as const, text: message }] };
    }
  );
}

const transport = new StdioServerTransport();
await server.connect(transport);
