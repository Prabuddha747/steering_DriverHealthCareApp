/**
 * Type declarations for AuthContext (implemented in AuthContext.js).
 * Firebase User has uid, email, etc. Role comes from our DB.
 */
import type { User } from 'firebase/auth';

export interface AuthContextValue {
  user: User | null;
  role: string | null;
  loading: boolean;
  disabled: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

export function AuthProvider(props: { children: React.ReactNode }): React.ReactElement;

export function useAuth(): AuthContextValue;
