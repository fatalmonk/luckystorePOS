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

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-default relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/5 rounded-full blur-3xl" />
      
      <div className="w-full max-w-md px-4 relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary shadow-level-3 mb-6 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
            <ShoppingBag className="text-primary-on w-8 h-8" />
          </div>
          <h1 className="text-4xl font-black text-text-primary tracking-tight mb-2">
            Lucky Store
          </h1>
          <p className="text-text-muted font-medium">Admin Management Portal</p>
        </div>

        <Card className="p-8 shadow-level-3 border-border-default bg-surface/80 backdrop-blur-xl">
          <form onSubmit={handleLogin} className="space-y-6">
            <Input 
              label="Admin Email"
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@luckystore.com"
              required
              className="bg-surface"
            />

            <Input 
              label="Password"
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="bg-surface"
            />

            {error && (
              <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm font-medium animate-in fade-in slide-in-from-top-2">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              loading={loading}
              className="w-full h-12 text-base font-bold shadow-level-2"
              icon={<LogIn size={20} />}
            >
              Sign In to Dashboard
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-border-default text-center">
            <p className="text-xs text-text-muted font-medium">
              Secured by Supabase Auth • Lucky Store v1.2.0
            </p>
          </div>
        </Card>

        <p className="mt-8 text-center text-sm text-text-muted">
          Forgot password? <span className="text-primary font-semibold cursor-pointer hover:underline">Contact System Admin</span>
        </p>
      </div>
    </div>
  );
}
