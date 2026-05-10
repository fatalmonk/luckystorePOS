import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background-default p-6 text-center">
          <div className="w-full max-w-lg">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-warning/10 text-warning mb-8">
              <AlertTriangle size={48} />
            </div>
            
            <h1 className="text-3xl font-black text-text-primary mb-4 tracking-tight">
              Oops! Something went wrong
            </h1>
            
            <p className="text-text-secondary font-medium mb-8 max-w-md mx-auto">
              An unexpected application error occurred. We've logged the incident and our team will look into it.
            </p>

            {this.state.error && (
              <Card className="mb-8 p-0 border-danger/20 bg-danger/5 overflow-hidden text-left">
                <div className="bg-danger/10 px-4 py-2 text-xs font-bold text-danger-dark uppercase tracking-wider">
                  Error Details
                </div>
                <pre className="p-4 text-xs font-mono text-danger-dark overflow-auto max-h-48 whitespace-pre-wrap">
                  {this.state.error.message}
                </pre>
              </Card>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={this.handleReload}
                icon={<RefreshCw size={18} />}
                className="h-12 px-8"
              >
                Reload Dashboard
              </Button>
              <Button 
                variant="secondary"
                onClick={() => window.location.href = '/'}
                className="h-12 px-8"
              >
                Go to Home
              </Button>
            </div>
            
            <p className="mt-12 text-xs text-text-muted font-medium">
              Reference ID: {Math.random().toString(36).substring(2, 10).toUpperCase()}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}