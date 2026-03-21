import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { MetaQuestClient } from '../client.js';
import { formatError } from '../errors.js';

export function registerBuildTools(server: McpServer, client: MetaQuestClient) {
  server.tool(
    'upload_build',
    'Upload an APK to the Meta Quest Store via ovr-platform-util. Requires ovr-platform-util to be installed.',
    {
      appName: z.string().describe('App name as configured in your meta-quest-config.json'),
      apkPath: z.string().describe('Absolute path to the APK file'),
      channel: z.string().optional().describe('Release channel (default: ALPHA)'),
      notes: z.string().optional().describe('Release notes for this build'),
      ageGroup: z.enum(['TEENS_AND_ADULTS', 'MIXED_AGES', 'CHILDREN']).optional()
        .describe('Age group certification (default: TEENS_AND_ADULTS)'),
    },
    async ({ appName, apkPath, channel, notes, ageGroup }) => {
      try {
        const { existsSync } = await import('node:fs');
        if (!existsSync(apkPath)) {
          return formatError(new Error(`APK file not found: ${apkPath}`));
        }

        const app = client.getApp(appName);
        const args = [
          'upload-quest-build',
          '--apk', apkPath,
          '--channel', channel ?? 'ALPHA',
          '--age-group', ageGroup ?? 'TEENS_AND_ADULTS',
        ];

        if (notes) {
          args.push('--notes', notes);
        }

        const { stdout, stderr } = await client.ovrCommand(appName, args);
        const output = (stdout + '\n' + stderr).trim();

        const buildIdMatch = output.match(/Build ID:\s*(\d+)/i) ?? output.match(/(\d{10,})/);

        return {
          content: [{
            type: 'text' as const,
            text: `Build uploaded successfully!\n` +
              `App: ${appName} (${app.appId})\n` +
              `Channel: ${channel ?? 'ALPHA'}\n` +
              (buildIdMatch ? `Build ID: ${buildIdMatch[1]}\n` : '') +
              `\nOutput:\n${output}`,
          }],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );

  server.tool(
    'download_build',
    'Download a build from the Meta Quest Store by build ID',
    {
      appName: z.string().describe('App name as configured in your meta-quest-config.json'),
      buildId: z.string().describe('Build ID to download'),
      outputDir: z.string().describe('Absolute path to the output directory'),
    },
    async ({ appName, buildId, outputDir }) => {
      try {
        const { existsSync } = await import('node:fs');
        if (!existsSync(outputDir)) {
          return formatError(new Error(`Output directory not found: ${outputDir}`));
        }

        const args = [
          'download-quest-build',
          '--build_id', buildId,
          '--download_dir', outputDir,
        ];

        const { stdout, stderr } = await client.ovrCommand(appName, args);

        return {
          content: [{
            type: 'text' as const,
            text: `Build ${buildId} downloaded to ${outputDir}\n\n${(stdout + '\n' + stderr).trim()}`,
          }],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );

  server.tool(
    'upload_debug_symbols',
    'Upload debug symbols for a previously uploaded build',
    {
      appName: z.string().describe('App name as configured in your meta-quest-config.json'),
      buildId: z.string().describe('Build ID to attach symbols to'),
      symbolsDir: z.string().describe('Absolute path to the debug symbols directory'),
      pattern: z.string().optional().describe('File pattern for symbols (e.g. "*.so")'),
    },
    async ({ appName, buildId, symbolsDir, pattern }) => {
      try {
        const { existsSync } = await import('node:fs');
        if (!existsSync(symbolsDir)) {
          return formatError(new Error(`Symbols directory not found: ${symbolsDir}`));
        }

        const args = [
          'upload-debug-symbols',
          '--parent', buildId,
          '--debug-symbols-dir', symbolsDir,
        ];

        if (pattern) {
          args.push('--debug-symbols-pattern', pattern);
        }

        const { stdout, stderr } = await client.ovrCommand(appName, args);

        return {
          content: [{
            type: 'text' as const,
            text: `Debug symbols uploaded for build ${buildId}\n\n${(stdout + '\n' + stderr).trim()}`,
          }],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );
}
