// Production-safe logging utility
// Logs are only shown in development mode

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogOptions {
    context?: string;
    data?: unknown;
}

const isDev = import.meta.env.DEV;

function formatMessage(level: LogLevel, message: string, options?: LogOptions): string {
    const timestamp = new Date().toISOString();
    const context = options?.context ? `[${options.context}]` : '';
    return `${timestamp} ${level.toUpperCase()} ${context} ${message}`;
}

export const logger = {
    /**
     * Debug level logging - only in development
     */
    debug(message: string, options?: LogOptions): void {
        if (isDev) {
            console.log(formatMessage('debug', message, options), options?.data || '');
        }
    },

    /**
     * Info level logging - only in development
     */
    info(message: string, options?: LogOptions): void {
        if (isDev) {
            console.info(formatMessage('info', message, options), options?.data || '');
        }
    },

    /**
     * Warning level logging - shown in development, suppressed in production
     */
    warn(message: string, options?: LogOptions): void {
        if (isDev) {
            console.warn(formatMessage('warn', message, options), options?.data || '');
        }
    },

    /**
     * Error level logging - always logged
     * In production, this should be sent to an error tracking service
     */
    error(message: string, error?: Error | unknown, options?: LogOptions): void {
        const formattedMessage = formatMessage('error', message, options);

        // Always log errors
        console.error(formattedMessage, error || '');

        // In production, send to error tracking service
        if (!isDev && error) {
            // TODO: Integrate with error tracking service
            // Example: Sentry.captureException(error);
        }
    },

    /**
     * Group related logs together
     */
    group(label: string, fn: () => void): void {
        if (isDev) {
            console.group(label);
            fn();
            console.groupEnd();
        }
    },

    /**
     * Measure performance
     */
    time(label: string): void {
        if (isDev) {
            console.time(label);
        }
    },

    timeEnd(label: string): void {
        if (isDev) {
            console.timeEnd(label);
        }
    },
};

export default logger;
