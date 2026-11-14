export interface AppConfig {
  supabaseUrl: string;
  supabasePublishableKey: string;
  apiBaseUrl: string;
}

export class MissingConfigurationError extends Error {
  override name = "MissingConfigurationError";
}

export function readConfig(environment: Record<string, string | undefined>): AppConfig {
  return {
    supabaseUrl: required(environment, "VITE_SUPABASE_URL"),
    supabasePublishableKey: required(environment, "VITE_SUPABASE_PUBLISHABLE_KEY"),
    apiBaseUrl: environment.VITE_API_URL || "/api",
  };
}

function required(environment: Record<string, string | undefined>, name: string): string {
  const value = environment[name];
  if (!value) {
    throw new MissingConfigurationError(`${name} is not set`);
  }
  return value;
}
