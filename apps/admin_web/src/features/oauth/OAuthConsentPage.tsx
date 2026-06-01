import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from "@/lib/supabase";
import { Shield, AppWindow, Check, X, Loader2, Info } from 'lucide-react';

interface AuthDetails {
  client: {
    name: string;
  };
  redirect_uri: string;
  scopes?: string[];
}

export function OAuthConsentPage() {
  const [searchParams] = useSearchParams();
  const authorizationId = searchParams.get('authorization_id');

  const [authDetails, setAuthDetails] = useState<AuthDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAuthDetails() {
      if (!authorizationId) {
        setError('Missing authorization request identifier.');
        setLoading(false);
        return;
      }

      try {
        // @ts-expect-error -- OAuth window globals not typed - Supabase types might not be updated in the environment yet
        const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);

        if (error) {
          setError(error.message);
        } else {
          setAuthDetails(data);
        }
      } catch (err: unknown) {
        setError(err.message || 'Failed to retrieve authorization details.');
      } finally {
        setLoading(false);
      }
    }

    loadAuthDetails();
  }, [authorizationId]);

  async function handleApprove() {
    if (!authorizationId) return;
    setActionLoading(true);

    try {
      // @ts-expect-error -- OAuth window globals not typed
      const { data, error } = await supabase.auth.oauth.approveAuthorization(authorizationId);

      if (error) {
        setError(error.message);
        setActionLoading(false);
      } else {
        // @ts-expect-error -- OAuth window globals not typed - redirect_to property based on Supabase auth OAuth flow
        window.location.href = data.redirect_to;
      }
    } catch (err: unknown) {
      setError(err.message || 'An error occurred during approval.');
      setActionLoading(false);
    }
  }

  async function handleDeny() {
    if (!authorizationId) return;
    setActionLoading(true);

    try {
      // @ts-expect-error -- OAuth window globals not typed
      const { data, error } = await supabase.auth.oauth.denyAuthorization(authorizationId);

      if (error) {
        setError(error.message);
        setActionLoading(false);
      } else {
        // @ts-expect-error -- OAuth window globals not typed - redirect_to property based on Supabase auth OAuth flow
        window.location.href = data.redirect_to;
      }
    } catch (err: unknown) {
      setError(err.message || 'An error occurred during denial.');
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-lg font-medium">Validating authorization request...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-md mx-auto p-8 bg-surface rounded-2xl border border-border text-center gap-4">
        <X className="w-16 h-16 text-danger" />
        <h2 className="text-2xl font-bold">Authorization Error</h2>
        <p className="text-text-primary">{error}</p>
        <button 
          onClick={() => window.history.back()}
          className="mt-4 px-6 py-2 bg-primary text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!authDetails) return null;

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6">
      <div className="bg-surface rounded-3xl border border-border shadow-2xl overflow-hidden transition-all hover:shadow-primary/5">
        {/* Header Section */}
        <div className="bg-surface p-8 text-center border-b border-border relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface p-4 rounded-2xl border border-border shadow-lg">
            <Shield className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mt-4 mb-2">Allow Access?</h1>
          <p className="text-text-primary font-medium opacity-80">
            A third-party application is requesting access to your Lucky Store account.
          </p>
        </div>

        {/* Client Info */}
        <div className="p-8 space-y-8">
          <div className="flex items-center gap-6 p-6 bg-surface rounded-2xl border border-border">
            <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center">
              <AppWindow className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-xl font-bold text-text-primary">{authDetails.client.name}</h3>
              <p className="text-sm opacity-70 break-all">{authDetails.redirect_uri}</p>
            </div>
          </div>

          {/* Permissions Section */}
          <div>
            <div className="flex items-center gap-2 mb-4 text-text-primary font-bold uppercase tracking-wider text-sm">
              <Info className="w-4 h-4" />
              <span>Requested Permissions</span>
            </div>
            
            <div className="grid gap-3">
              {(authDetails.scopes || ['email']).map((scope: string) => (
                <div key={scope} className="flex items-start gap-3 p-4 bg-surface border border-border rounded-xl transition-colors hover:border-primary/30">
                  <div className="mt-1 p-1 bg-success-subtle rounded-full">
                    <Check className="w-4 h-4 text-success" />
                  </div>
                  <div className="text-left">
                    <span className="font-bold text-text-primary capitalize">{scope}</span>
                    <p className="text-sm opacity-70">
                      Allows {authDetails.client.name} to view your {scope} information.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-warning-subtle border border-warning rounded-xl text-left text-sm text-warning-dark">
            <strong>Warning:</strong> Only approve access if you trust <strong>{authDetails.client.name}</strong>. By clicking Approve, you are granting them access to the data listed above.
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button
              onClick={handleApprove}
              disabled={actionLoading}
              className="flex-1 py-4 px-8 bg-primary text-white rounded-2xl font-bold text-lg shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              Approve Access
            </button>
            <button
              onClick={handleDeny}
              disabled={actionLoading}
              className="flex-1 py-4 px-8 bg-surface border-2 border-border text-text-primary rounded-2xl font-bold text-lg hover:bg-danger-subtle hover:border-danger hover:text-danger transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <X className="w-5 h-5" />
              Deny
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-surface text-center text-xs opacity-50 border-t border-border">
          Lucky Store OAuth 2.1 Identity Provider • Secure Authorization
        </div>
      </div>
    </div>
  );
}
