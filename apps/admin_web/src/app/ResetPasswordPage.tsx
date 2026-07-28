import { useEffect, useState } from 'react';
import { KeyRound, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components';
import { Card } from '@/components';
import { Input } from '@/components';

type RecoveryState = 'checking' | 'ready' | 'saving' | 'success' | 'error';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [initialHashError] = useState(() => {
    const value = new URLSearchParams(window.location.hash.slice(1)).get('error_description');
    return value ? decodeURIComponent(value.replace(/\+/g, ' ')) : null;
  });
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [state, setState] = useState<RecoveryState>(
    initialHashError ? 'error' : 'checking',
  );
  const [message, setMessage] = useState(
    initialHashError ?? 'Validating your recovery link…',
  );

  useEffect(() => {
    let active = true;

    if (initialHashError) return;

    const markReady = () => {
      if (!active) return;
      setState('ready');
      setMessage('');
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN')) {
        markReady();
      }
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setState('error');
        setMessage(error.message);
        return;
      }
      if (data.session) {
        markReady();
        return;
      }

      setState('error');
      setMessage('This recovery link is invalid or has expired. Request a new password reset email.');
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [initialHashError]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (password.length < 12) {
      setState('error');
      setMessage('Use at least 12 characters for the new password.');
      return;
    }
    if (password !== confirmation) {
      setState('error');
      setMessage('The passwords do not match.');
      return;
    }

    setState('saving');
    setMessage('');

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setState('error');
      setMessage(error.message);
      return;
    }

    await supabase.auth.signOut({ scope: 'global' });
    setPassword('');
    setConfirmation('');
    setState('success');
    setMessage('Password updated. All sessions have been signed out.');
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background-default px-4 py-10">
      <div className="w-full max-w-md">
        <header className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary shadow-level-2 mb-5">
            <ShoppingBag className="text-primary-on w-7 h-7" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-black text-text-primary tracking-tight mb-2">
            Choose a new password
          </h1>
          <p className="text-text-muted">
            Update your Lucky Store administrator password.
          </p>
        </header>

        <Card className="p-8 shadow-level-3 border-border-default bg-surface">
          {state === 'checking' && (
            <div role="status" className="text-center text-text-muted">
              {message}
            </div>
          )}

          {(state === 'ready' || state === 'saving' || state === 'error') && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="New password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (state === 'error') {
                    setState('ready');
                    setMessage('');
                  }
                }}
                minLength={12}
                required
              />
              <Input
                label="Confirm new password"
                type="password"
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => {
                  setConfirmation(event.target.value);
                  if (state === 'error') {
                    setState('ready');
                    setMessage('');
                  }
                }}
                minLength={12}
                required
              />

              {state === 'error' && message && (
                <div role="alert" className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm font-medium">
                  {message}
                </div>
              )}

              <Button
                type="submit"
                loading={state === 'saving'}
                className="w-full h-12 text-base font-bold"
                icon={<KeyRound size={20} aria-hidden="true" />}
              >
                Update password
              </Button>
            </form>
          )}

          {state === 'success' && (
            <div className="text-center space-y-5" role="status">
              <p className="text-text-primary font-semibold">{message}</p>
              <Button type="button" className="w-full" onClick={() => navigate('/', { replace: true })}>
                Return to sign in
              </Button>
            </div>
          )}
        </Card>

        <p className="mt-6 text-center text-xs text-text-muted">
          Recovery links are single-use and expire automatically.
        </p>
      </div>
    </main>
  );
}
