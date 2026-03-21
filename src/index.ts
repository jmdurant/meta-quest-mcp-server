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

  // Built-in tool to list configured apps
  server.tool(
    'list_apps',
    'List all configured Meta Quest apps',
    {},
    async () => {
      const apps = client.listApps();
      return {
        content: [{
          type: 'text' as const,
          text: `Configured apps (${apps.length}):\n${apps.map(a => `  - ${a}`).join('\n')}`,
        }],
      };
    }
  );

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

      const statusLines: string[] = [];
      for (const e of errors) {
        statusLines.push(`  ${e.variable}: ${e.message}`);
      }

      const message = `Meta Quest MCP Server - Setup Required

1. Create a config file (e.g. ~/meta-quest-config.json):

{
  "apps": {
    "my-vr-game": {
      "appId": "123456789",
      "appSecret": "abc123..."
    },
    "my-other-app": {
      "appId": "987654321",
      "appSecret": "def456..."
    }
  }
}

2. Add to ~/.claude/settings.json:

"meta-quest": {
  "command": "node",
  "args": ["C:/Users/docto/meta-quest-mcp-server/dist/index.js"],
  "env": {
    "META_QUEST_CONFIG": "C:/Users/docto/meta-quest-config.json",
    "OVR_PLATFORM_UTIL_PATH": "C:/path/to/ovr-platform-util.exe"
  }
}

How to get app credentials:
1. Go to https://developer.oculus.com/manage/
2. Select your app → Development → API
3. Copy the App ID and App Secret
4. Add an entry to your config file for each app

For build uploads, you also need ovr-platform-util:
  Download from https://developer.oculus.com/downloads/

Issues found:
${statusLines.join('\n')}

After updating, restart Claude Code for changes to take effect.`;

      return { content: [{ type: 'text' as const, text: message }] };
    }
  );
}

const transport = new StdioServerTransport();
await server.connect(transport);
