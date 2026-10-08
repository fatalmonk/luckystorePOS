import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
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

  const login = useCallback(async (params: LoginParams) => {
    const result = await loginUser(params);
    setUser(result.user);
    if (result.token) setToken(result.token);
  }, []);

  const signup = useCallback(async (params: SignupParams) => {
    const result = await signupUser(params);
    if (result.token && result.user) {
      setUser(result.user);
      setToken(result.token);
    }
    return { requiresEmailConfirmation: result.requiresEmailConfirmation };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
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
