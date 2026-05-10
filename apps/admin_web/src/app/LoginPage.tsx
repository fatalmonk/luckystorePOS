import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogIn, ShoppingBag } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-secondary/5 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full max-w-md shadow-level-3 relative z-10" padding="lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary/10 text-primary mb-4">
            <ShoppingBag size={32} strokeWidth={2.5} />
          </div>
          <h2 className="text-3xl font-bold text-text-primary tracking-tight">
            Lucky Store
          </h2>
          <p className="text-text-secondary mt-2">Admin Workspace</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@luckystore.com"
            required
            autoComplete="email"
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />

          {error && (
            <div className="p-3 rounded-md bg-danger/10 border border-danger/20 text-danger text-sm font-medium animate-in fade-in slide-in-from-top-1">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-12 text-lg"
            variant="primary"
            loading={loading}
            icon={<LogIn size={20} />}
          >
            Sign In
          </Button>

          <p className="text-center text-xs text-text-muted pt-4">
            Authorized access only. Technical issues? Contact support.
          </p>
        </form>
      </Card>
    </div>
  );
}
