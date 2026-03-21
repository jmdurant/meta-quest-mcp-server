import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface AppCredentials {
  appId: string;
  appSecret: string;
}

export interface Config {
  apps: Record<string, AppCredentials>;
  ovrPlatformUtilPath?: string;
}

export interface ConfigError {
  variable: string;
  message: string;
}

export function getConfigErrors(): ConfigError[] {
  const errors: ConfigError[] = [];

  const configPath = process.env.META_QUEST_CONFIG;
  if (!configPath) {
    errors.push({
      variable: 'META_QUEST_CONFIG',
      message: 'Not set. Must be an absolute path to a JSON config file with your app credentials.',
    });
  } else {
    const resolvedPath = resolve(configPath);
    if (!existsSync(resolvedPath)) {
      errors.push({
        variable: 'META_QUEST_CONFIG',
        message: `File not found at: ${resolvedPath}`,
      });
    } else {
      try {
        const raw = JSON.parse(readFileSync(resolvedPath, 'utf-8'));
        if (!raw.apps || typeof raw.apps !== 'object' || Object.keys(raw.apps).length === 0) {
          errors.push({
            variable: 'META_QUEST_CONFIG',
            message: 'Config file must have an "apps" object with at least one app entry.',
          });
        }
      } catch (e) {
        errors.push({
          variable: 'META_QUEST_CONFIG',
          message: `Invalid JSON: ${e instanceof Error ? e.message : String(e)}`,
        });
      }
    }
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

  const configPath = resolve(process.env.META_QUEST_CONFIG!);
  const raw = JSON.parse(readFileSync(configPath, 'utf-8'));

  return {
    apps: raw.apps as Record<string, AppCredentials>,
    ovrPlatformUtilPath: process.env.OVR_PLATFORM_UTIL_PATH
      ? resolve(process.env.OVR_PLATFORM_UTIL_PATH)
      : undefined,
  };
}
