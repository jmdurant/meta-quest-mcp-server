import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { MetaQuestClient } from '../client.js';
import { formatError } from '../errors.js';

export function registerChannelTools(server: McpServer, client: MetaQuestClient) {
  server.tool(
    'set_release_channel',
    'Move a build from one release channel to another (e.g. ALPHA → RELEASE)',
    {
      sourceChannel: z.string().describe('Source release channel (e.g. ALPHA)'),
      destinationChannel: z.string().describe('Destination release channel (e.g. BETA, RC, RELEASE)'),
      ageGroup: z.enum(['TEENS_AND_ADULTS', 'MIXED_AGES', 'CHILDREN']).optional()
        .describe('Age group certification (default: TEENS_AND_ADULTS)'),
    },
    async ({ sourceChannel, destinationChannel, ageGroup }) => {
      try {
        const args = [
          'set-release-channel-build',
          '--source-channel', sourceChannel,
          '--destination-channel', destinationChannel,
          '--age-group', ageGroup ?? 'TEENS_AND_ADULTS',
        ];

        const { stdout, stderr } = await client.ovrCommand(args);

        return {
          content: [{
            type: 'text' as const,
            text: `Build promoted from ${sourceChannel} → ${destinationChannel}\n` +
              `App ID: ${client.getAppId()}\n\n` +
              `${(stdout + '\n' + stderr).trim()}`,
          }],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );
}
