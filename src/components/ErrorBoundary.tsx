import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        // Log error to an error reporting service in production
        if (import.meta.env.PROD) {
            // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
            // errorTrackingService.captureException(error, { extra: errorInfo });
        }

        console.error('Error caught by ErrorBoundary:', error, errorInfo);
        this.setState({ errorInfo });
    }

    handleReset = (): void => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        window.location.reload();
    };

    handleGoHome = (): void => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        window.location.href = '/';
    };

    render(): ReactNode {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen flex items-center justify-center bg-background p-4">
                    <div className="max-w-md w-full bg-card rounded-2xl shadow-lg p-8 text-center">
                        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
                            <AlertTriangle className="w-8 h-8 text-destructive" />
                        </div>

                        <h1 className="text-2xl font-bold text-foreground mb-2">
                            Something went wrong
                        </h1>

                        <p className="text-muted-foreground mb-6">
                            We're sorry, but something unexpected happened. Please try refreshing the page or go back to the home page.
                        </p>

                        {import.meta.env.DEV && this.state.error && (
                            <div className="mb-6 p-4 bg-muted rounded-lg text-left overflow-auto max-h-40">
                                <p className="text-sm font-mono text-destructive">
                                    {this.state.error.message}
                                </p>
                            </div>
                        )}

                        <div className="flex gap-3 justify-center">
                            <Button onClick={this.handleReset} className="gap-2">
                                <RefreshCw className="w-4 h-4" />
                                Refresh Page
                            </Button>
                            <Button variant="outline" onClick={this.handleGoHome} className="gap-2">
                                <Home className="w-4 h-4" />
                                Go Home
                            </Button>
                        </div>

                        <p className="mt-6 text-xs text-muted-foreground">
                            If this problem persists, please contact support.
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
