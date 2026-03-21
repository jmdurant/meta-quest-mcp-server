import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { MetaQuestClient } from '../client.js';
import { formatError } from '../errors.js';

export function registerAddonTools(server: McpServer, client: MetaQuestClient) {
  server.tool(
    'upload_addon',
    'Upload a DLC/add-on asset to the Meta Quest Store',
    {
      addonId: z.string().describe('Add-on/DLC ID'),
      assetsDir: z.string().describe('Absolute path to the assets directory'),
      channel: z.string().optional().describe('Release channel (default: ALPHA)'),
    },
    async ({ addonId, assetsDir, channel }) => {
      try {
        const { existsSync } = await import('node:fs');
        if (!existsSync(assetsDir)) {
          return formatError(new Error(`Assets directory not found: ${assetsDir}`));
        }

        const args = [
          'upload-add-on',
          '--addon-id', addonId,
          '--assets-dir', assetsDir,
          '--channel', channel ?? 'ALPHA',
        ];

        const { stdout, stderr } = await client.ovrCommand(args);

        return {
          content: [{
            type: 'text' as const,
            text: `Add-on ${addonId} uploaded successfully!\n` +
              `Channel: ${channel ?? 'ALPHA'}\n\n` +
              `${(stdout + '\n' + stderr).trim()}`,
          }],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );
}
