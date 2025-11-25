/**
 * Environment variable validation
 * Validates required env vars - fails fast in production, warns in development
 */

const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST;
const isProd = process.env.NODE_ENV === 'production';

function getEnvVar(key: string, required: boolean = true): string {
  const value = process.env[key];

  if (!value && required) {
    if (isTest) {
      // Don't fail tests for missing env vars
      return `test-${key}`;
    }
    if (isProd) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    // Development - warn but don't crash
    console.warn(`[env] Warning: Missing environment variable: ${key}`);
  }

  return value || '';
}

function getEnvVarOptional(key: string): string | undefined {
  return process.env[key];
}

// Server-side only env vars (not exposed to client)
export const serverEnv = {
  get DATABASE_URL() { return getEnvVar('DATABASE_URL'); },
  get TMDB_API_KEY() { return getEnvVar('TMDB_API_KEY'); },
  get CLERK_SECRET_KEY() { return getEnvVar('CLERK_SECRET_KEY'); },
  get CLERK_WEBHOOK_SECRET() { return getEnvVarOptional('CLERK_WEBHOOK_SECRET'); },
} as const;

// Client-side env vars (prefixed with NEXT_PUBLIC_)
export const clientEnv = {
  get CLERK_PUBLISHABLE_KEY() { return getEnvVar('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'); },
  get APP_URL() { return getEnvVarOptional('NEXT_PUBLIC_APP_URL'); },
} as const;

// Validate all server env vars - call this at app startup
export function validateServerEnv(): boolean {
  if (isTest) return true;

  const required = ['DATABASE_URL', 'TMDB_API_KEY', 'CLERK_SECRET_KEY'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    const message = `Missing required environment variables: ${missing.join(', ')}`;
    if (isProd) {
      throw new Error(message);
    }
    console.warn(`[env] ${message}`);
    return false;
  }

  return true;
}
