// Environment variable validation
// This ensures all required environment variables are present before the app starts

interface EnvConfig {
    // Required
    SUPABASE_URL: string;
    SUPABASE_PUBLISHABLE_KEY: string;

    // Optional
    SUPABASE_PROJECT_ID?: string;
    GEMINI_API_KEY?: string;

    // Computed
    IS_PRODUCTION: boolean;
    IS_DEVELOPMENT: boolean;
}

function validateEnv(): EnvConfig {
    const requiredEnvVars = [
        'VITE_SUPABASE_URL',
        'VITE_SUPABASE_PUBLISHABLE_KEY',
    ] as const;

    const missingVars: string[] = [];

    for (const envVar of requiredEnvVars) {
        if (!import.meta.env[envVar]) {
            missingVars.push(envVar);
        }
    }

    if (missingVars.length > 0) {
        const errorMessage = `Missing required environment variables:\n${missingVars.map(v => `  - ${v}`).join('\n')}\n\nPlease check your .env file.`;

        // In production, log error but don't crash
        if (import.meta.env.PROD) {
            console.error(errorMessage);
        } else {
            // In development, show a warning in console
            console.warn(errorMessage);
        }
    }

    return {
        SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || '',
        SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
        SUPABASE_PROJECT_ID: import.meta.env.VITE_SUPABASE_PROJECT_ID,
        GEMINI_API_KEY: import.meta.env.VITE_GEMINI_API_KEY,
        IS_PRODUCTION: import.meta.env.PROD,
        IS_DEVELOPMENT: import.meta.env.DEV,
    };
}

export const env = validateEnv();

// Type-safe environment access
export function getEnvVar(key: keyof EnvConfig): string | boolean | undefined {
    return env[key];
}

// Check if a feature is enabled
export function isFeatureEnabled(feature: 'ai_chatbot'): boolean {
    switch (feature) {
        case 'ai_chatbot':
            return Boolean(env.GEMINI_API_KEY);
        default:
            return false;
    }
}
