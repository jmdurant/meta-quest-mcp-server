import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export interface Config {
  appId: string;
  appSecret: string;
  ovrPlatformUtilPath?: string;
}

export interface ConfigError {
  variable: string;
  message: string;
}

export function getConfigErrors(): ConfigError[] {
  const errors: ConfigError[] = [];

  if (!process.env.META_APP_ID) {
    errors.push({
      variable: 'META_APP_ID',
      message: 'Not set. Find your App ID in the Oculus Developer Dashboard → API tab.',
    });
  }

  if (!process.env.META_APP_SECRET) {
    errors.push({
      variable: 'META_APP_SECRET',
      message: 'Not set. Find your App Secret in the Oculus Developer Dashboard → API tab.',
    });
  }

  const ovrPath = process.env.OVR_PLATFORM_UTIL_PATH;
  if (ovrPath) {
    const resolvedPath = resolve(ovrPath);
    if (!existsSync(resolvedPath)) {
      errors.push({
        variable: 'OVR_PLATFORM_UTIL_PATH',
        message: `File not found at: ${resolvedPath}`,
      });
    }
  }

  return errors;
}

export function loadConfig(): Config | null {
  const errors = getConfigErrors();
  if (errors.length > 0) return null;

  return {
    appId: process.env.META_APP_ID!,
    appSecret: process.env.META_APP_SECRET!,
    ovrPlatformUtilPath: process.env.OVR_PLATFORM_UTIL_PATH
      ? resolve(process.env.OVR_PLATFORM_UTIL_PATH)
      : undefined,
  };
}
