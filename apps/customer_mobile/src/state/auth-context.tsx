import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  isHydrated: boolean;
  login: (params: LoginParams) => Promise<void>;
  signup: (params: SignupParams) => Promise<{ requiresEmailConfirmation?: boolean }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const authOpGeneration = useRef(0);

  useEffect(() => {
    let active = true;
    const currentGen = authOpGeneration.current;
    void (async () => {
      try {
        const raw = await getSecureItem(AUTH_SESSION_KEY);
        if (raw && active && authOpGeneration.current === currentGen) {
          const parsed = JSON.parse(raw);
          if (parsed.user) setUser(parsed.user);
          if (parsed.token) setToken(parsed.token);
        }
      } catch {
        // ignore malformed stored session
      } finally {
        if (active && authOpGeneration.current === currentGen) {
          setIsHydrated(true);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (params: LoginParams) => {
    authOpGeneration.current++;
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
    authOpGeneration.current++;
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
    authOpGeneration.current++;
    setUser(null);
    setToken(null);
    void removeSecureItem(AUTH_SESSION_KEY);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      isLoggedIn: Boolean(user),
      isHydrated,
      login,
      signup,
      logout,
    }),
    [user, token, isHydrated, login, signup, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
