#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig, getConfigErrors } from './config.js';

const config = loadConfig();

if (!config) {
  const errors = getConfigErrors();
  const missing = errors.map(e => e.variable).join(', ');
  const setupMessage = `Setup required — missing: ${missing}

1. Create a config file (e.g. ~/meta-quest-config.json):

{
  "apps": {
    "my-vr-game": { "appId": "123456789", "appSecret": "abc123..." }
  }
}

2. Set the following in your .mcp.json env block:

  "env": {
    "META_QUEST_CONFIG": "~/meta-quest-config.json"
  }

How to get app credentials:
1. Go to https://developer.oculus.com/manage/
2. Select your app > Development > API
3. Copy the App ID and App Secret

After updating .mcp.json, restart Claude Code for changes to take effect.`;

  const server = new McpServer(
    { name: 'meta-quest (needs setup)', version: '1.0.0' },
    { capabilities: { logging: {} } }
  );

  server.tool('meta_quest_setup', `Meta Quest MCP server is not configured. Call this tool for setup instructions.`, {}, async () => ({
    content: [{ type: 'text', text: setupMessage }],
    isError: true,
  }));

  const transport = new StdioServerTransport();
  await server.connect(transport);
} else {
  try {
    const server = new McpServer(
      { name: 'meta-quest-mcp-server', version: '1.0.0' },
      { capabilities: { logging: {} } }
    );

    const { MetaQuestClient } = await import('./client.js');
    const { registerBuildTools } = await import('./tools/builds.js');
    const { registerChannelTools } = await import('./tools/channels.js');
    const { registerAddonTools } = await import('./tools/addons.js');
    const { registerEntitlementTools } = await import('./tools/entitlements.js');

    const client = new MetaQuestClient(config);

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

    const transport = new StdioServerTransport();
    await server.connect(transport);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    const setupMessage = `Meta Quest MCP server failed to start: ${detail}

This usually means your config file is missing or invalid.

1. Create a config file (e.g. ~/meta-quest-config.json):

{
  "apps": {
    "my-vr-game": { "appId": "123456789", "appSecret": "abc123..." }
  }
}

2. Set the following in your .mcp.json env block:

  "env": {
    "META_QUEST_CONFIG": "~/meta-quest-config.json"
  }

After updating .mcp.json, restart Claude Code for changes to take effect.`;

    const fallback = new McpServer(
      { name: 'meta-quest (needs setup)', version: '1.0.0' },
      { capabilities: { logging: {} } }
    );
    fallback.tool('meta_quest_setup', `Meta Quest MCP server is not configured. Call this tool for setup instructions.`, {}, async () => ({
      content: [{ type: 'text', text: setupMessage }],
      isError: true,
    }));
    const transport = new StdioServerTransport();
    await fallback.connect(transport);
  }
}
