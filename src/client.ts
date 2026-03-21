import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { MetaQuestError } from './errors.js';
import type { Config } from './config.js';

const execFileAsync = promisify(execFile);

const GRAPH_API_BASE = 'https://graph.oculus.com';

export class MetaQuestClient {
  private appId: string;
  private appSecret: string;
  private ovrPath: string;

  constructor(config: Config) {
    this.appId = config.appId;
    this.appSecret = config.appSecret;
    this.ovrPath = config.ovrPlatformUtilPath ?? 'ovr-platform-util';
  }

  get accessToken(): string {
    return `OC|${this.appId}|${this.appSecret}`;
  }

  // --- Graph API methods ---

  async graphRequest<T>(path: string, options?: {
    method?: string;
    params?: Record<string, string>;
    body?: Record<string, string>;
  }): Promise<T> {
    const method = options?.method ?? 'GET';
    let url = `${GRAPH_API_BASE}${path}`;

    const allParams = { ...options?.params, access_token: this.accessToken };
    const searchParams = new URLSearchParams(allParams);

    if (method === 'GET') {
      url += `?${searchParams.toString()}`;
    }

    const headers: Record<string, string> = {};
    let reqBody: string | undefined;

    if (method === 'POST' && options?.body) {
      const formData = new URLSearchParams({ ...options.body, access_token: this.accessToken });
      reqBody = formData.toString();
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }

    const response = await fetch(url, { method, headers, body: reqBody });

    if (!response.ok) {
      interface GraphErrorResponse { error?: { message?: string; type?: string; code?: number } }
      let errorInfo: GraphErrorResponse | null = null;
      try {
        errorInfo = await response.json() as GraphErrorResponse;
      } catch { /* not JSON */ }

      if (errorInfo?.error) {
        throw new MetaQuestError(
          errorInfo.error.code ?? response.status,
          errorInfo.error.type ?? 'UNKNOWN',
          errorInfo.error.message ?? 'No error message'
        );
      }
      throw new MetaQuestError(
        response.status,
        'UNKNOWN',
        await response.text().catch(() => 'No response body')
      );
    }

    return response.json() as Promise<T>;
  }

  // --- CLI wrapper methods ---

  async ovrCommand(args: string[]): Promise<{ stdout: string; stderr: string }> {
    const fullArgs = [...args, '--app-id', this.appId, '--app-secret', this.appSecret];

    try {
      const result = await execFileAsync(this.ovrPath, fullArgs, {
        maxBuffer: 50 * 1024 * 1024,
        timeout: 600000,
      });
      return result;
    } catch (error) {
      if (error instanceof Error && 'stderr' in error) {
        const execError = error as unknown as { stdout: string; stderr: string; code: number };
        throw new MetaQuestError(
          execError.code ?? 1,
          'CLI_ERROR',
          execError.stderr || execError.stdout || error.message
        );
      }
      throw error;
    }
  }

  getAppId(): string {
    return this.appId;
  }
}
