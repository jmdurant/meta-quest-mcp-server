import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { MetaQuestClient } from '../client.js';
import { formatError } from '../errors.js';

export function registerEntitlementTools(server: McpServer, client: MetaQuestClient) {
  server.tool(
    'verify_entitlement',
    'Verify whether a user is entitled to the app (owns it)',
    {
      userId: z.string().describe('Oculus user ID to verify'),
    },
    async ({ userId }) => {
      try {
        const result = await client.graphRequest<{ is_entitled: boolean }>(
          `/${client.getAppId()}/verify_entitlement`,
          {
            method: 'POST',
            body: { user_id: userId },
          }
        );

        return {
          content: [{
            type: 'text' as const,
            text: `User ${userId} entitlement: ${result.is_entitled ? 'ENTITLED' : 'NOT ENTITLED'}\n\n${JSON.stringify(result, null, 2)}`,
          }],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );

  server.tool(
    'get_leaderboards',
    'List leaderboards for the app',
    {},
    async () => {
      try {
        const result = await client.graphRequest<{ data: unknown[] }>(
          `/${client.getAppId()}/leaderboards`
        );

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify(result.data ?? result, null, 2),
          }],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );

  server.tool(
    'get_iap_items',
    'List in-app purchase items (add-ons/DLC) for the app via Graph API',
    {},
    async () => {
      try {
        const result = await client.graphRequest<{ data: unknown[] }>(
          `/${client.getAppId()}/iap_items`
        );

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify(result.data ?? result, null, 2),
          }],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );
}
