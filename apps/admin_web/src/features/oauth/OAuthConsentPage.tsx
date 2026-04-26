import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Shield, AppWindow, Check, X, Loader2, Info } from 'lucide-react';

export function OAuthConsentPage() {
  const [searchParams] = useSearchParams();
  const authorizationId = searchParams.get('authorization_id');

  const [authDetails, setAuthDetails] = useState<any>(null);
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
        // @ts-ignore - Supabase types might not be updated in the environment yet
        const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);

        if (error) {
          setError(error.message);
        } else {
          setAuthDetails(data);
        }
      } catch (err: any) {
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
      // @ts-ignore
      const { data, error } = await supabase.auth.oauth.approveAuthorization(authorizationId);

      if (error) {
        setError(error.message);
        setActionLoading(false);
      } else {
        // Redirect back to the third-party client
        window.location.href = data.redirect_to;
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during approval.');
      setActionLoading(false);
    }
  }

  async function handleDeny() {
    if (!authorizationId) return;
    setActionLoading(true);

    try {
      // @ts-ignore
      const { data, error } = await supabase.auth.oauth.denyAuthorization(authorizationId);

      if (error) {
        setError(error.message);
        setActionLoading(false);
      } else {
        // Redirect back to the third-party client with error
        window.location.href = data.redirect_to;
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during denial.');
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-12 h-12 text-accent animate-spin" />
        <p className="text-lg font-medium">Validating authorization request...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-md mx-auto p-8 bg-accent-bg rounded-2xl border border-accent-border text-center gap-4">
        <X className="w-16 h-16 text-red-500" />
        <h2 className="text-2xl font-bold">Authorization Error</h2>
        <p className="text-text">{error}</p>
        <button 
          onClick={() => window.history.back()}
          className="mt-4 px-6 py-2 bg-accent text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!authDetails) return null;

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6">
      <div className="bg-bg rounded-3xl border border-border shadow-2xl overflow-hidden transition-all hover:shadow-accent/5">
        {/* Header Section */}
        <div className="bg-accent-bg p-8 text-center border-b border-accent-border relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-bg p-4 rounded-2xl border border-border shadow-lg">
            <Shield className="w-10 h-10 text-accent" />
          </div>
          <h1 className="text-3xl font-bold mt-4 mb-2">Allow Access?</h1>
          <p className="text-text-h font-medium opacity-80">
            A third-party application is requesting access to your Lucky Store account.
          </p>
        </div>

        {/* Client Info */}
        <div className="p-8 space-y-8">
          <div className="flex items-center gap-6 p-6 bg-social-bg rounded-2xl border border-border">
            <div className="w-16 h-16 bg-accent/10 rounded-xl flex items-center justify-center">
              <AppWindow className="w-8 h-8 text-accent" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-xl font-bold text-text-h">{authDetails.client.name}</h3>
              <p className="text-sm opacity-70 break-all">{authDetails.redirect_uri}</p>
            </div>
          </div>

          {/* Permissions Section */}
          <div>
            <div className="flex items-center gap-2 mb-4 text-text-h font-bold uppercase tracking-wider text-sm">
              <Info className="w-4 h-4" />
              <span>Requested Permissions</span>
            </div>
            
            <div className="grid gap-3">
              {(authDetails.scopes || ['email']).map((scope: string) => (
                <div key={scope} className="flex items-start gap-3 p-4 bg-bg border border-border rounded-xl transition-colors hover:border-accent/30">
                  <div className="mt-1 p-1 bg-green-500/10 rounded-full">
                    <Check className="w-4 h-4 text-green-500" />
                  </div>
                  <div className="text-left">
                    <span className="font-bold text-text-h capitalize">{scope}</span>
                    <p className="text-sm opacity-70">
                      Allows {authDetails.client.name} to view your {scope} information.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-xl text-left text-sm text-orange-600 dark:text-orange-400">
            <strong>Warning:</strong> Only approve access if you trust <strong>{authDetails.client.name}</strong>. By clicking Approve, you are granting them access to the data listed above.
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button
              onClick={handleApprove}
              disabled={actionLoading}
              className="flex-1 py-4 px-8 bg-accent text-white rounded-2xl font-bold text-lg shadow-lg shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              Approve Access
            </button>
            <button
              onClick={handleDeny}
              disabled={actionLoading}
              className="flex-1 py-4 px-8 bg-bg border-2 border-border text-text-h rounded-2xl font-bold text-lg hover:bg-red-500/5 hover:border-red-500/30 hover:text-red-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <X className="w-5 h-5" />
              Deny
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-social-bg text-center text-xs opacity-50 border-t border-border">
          Lucky Store OAuth 2.1 Identity Provider • Secure Authorization
        </div>
      </div>
    </div>
  );
}
