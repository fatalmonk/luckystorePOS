import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  loginUser,
  LoginParams,
  signupUser,
  SignupParams,
  User,
} from '../services/auth';
import {
  AUTH_SESSION_KEY,
  getSecureItem,
  removeSecureItem,
  setSecureItem,
} from '../services/storage';

export interface AuthContextState {
  user: User | null;
  token: string | null;
  isLoggedIn: boolean;
  login: (params: LoginParams) => Promise<void>;
  signup: (params: SignupParams) => Promise<{ requiresEmailConfirmation?: boolean }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const raw = await getSecureItem(AUTH_SESSION_KEY);
        if (raw && active) {
          const parsed = JSON.parse(raw);
          if (parsed.user) setUser(parsed.user);
          if (parsed.token) setToken(parsed.token);
        }
      } catch {
        // ignore malformed stored session
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (params: LoginParams) => {
    const result = await loginUser(params);
    setUser(result.user);
    if (result.token) {
      setToken(result.token);
      await setSecureItem(
        AUTH_SESSION_KEY,
        JSON.stringify({ user: result.user, token: result.token })
      );
    }
  }, []);

  const signup = useCallback(async (params: SignupParams) => {
    const result = await signupUser(params);
    if (result.token && result.user) {
      setUser(result.user);
      setToken(result.token);
      await setSecureItem(
        AUTH_SESSION_KEY,
        JSON.stringify({ user: result.user, token: result.token })
      );
    }
    return { requiresEmailConfirmation: result.requiresEmailConfirmation };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    void removeSecureItem(AUTH_SESSION_KEY);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      isLoggedIn: Boolean(user),
      login,
      signup,
      logout,
    }),
    [user, token, login, signup, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
