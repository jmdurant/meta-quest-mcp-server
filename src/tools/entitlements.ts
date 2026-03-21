import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { MetaQuestClient } from '../client.js';
import { formatError } from '../errors.js';

export function registerEntitlementTools(server: McpServer, client: MetaQuestClient) {
  server.tool(
    'verify_entitlement',
    'Verify whether a user is entitled to the app (owns it)',
    {
      appName: z.string().describe('App name as configured in your meta-quest-config.json'),
      userId: z.string().describe('Oculus user ID to verify'),
    },
    async ({ appName, userId }) => {
      try {
        const app = client.getApp(appName);
        const result = await client.graphRequest<{ is_entitled: boolean }>(
          appName,
          `/${app.appId}/verify_entitlement`,
          {
            method: 'POST',
            body: { user_id: userId },
          }
        );

        return {
          content: [{
            type: 'text' as const,
            text: `User ${userId} entitlement for ${appName}: ${result.is_entitled ? 'ENTITLED' : 'NOT ENTITLED'}\n\n${JSON.stringify(result, null, 2)}`,
          }],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );

  server.tool(
    'get_leaderboards',
    'List leaderboards for an app',
    {
      appName: z.string().describe('App name as configured in your meta-quest-config.json'),
    },
    async ({ appName }) => {
      try {
        const app = client.getApp(appName);
        const result = await client.graphRequest<{ data: unknown[] }>(
          appName,
          `/${app.appId}/leaderboards`
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
    'List in-app purchase items (add-ons/DLC) for an app via Graph API',
    {
      appName: z.string().describe('App name as configured in your meta-quest-config.json'),
    },
    async ({ appName }) => {
      try {
        const app = client.getApp(appName);
        const result = await client.graphRequest<{ data: unknown[] }>(
          appName,
          `/${app.appId}/iap_items`
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
