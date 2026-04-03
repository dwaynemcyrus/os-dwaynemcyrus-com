import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useState,
} from 'react';
import { supabase } from './supabase';

const defaultAuthState = {
  session: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

const AuthContext = createContext(defaultAuthState);

function toAuthState(session, error = null) {
  return {
    session,
    user: session?.user ?? null,
    isAuthenticated: Boolean(session?.user),
    isLoading: false,
    error,
  };
}

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(defaultAuthState);

  useEffect(() => {
    let isMounted = true;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!isMounted) {
          return;
        }

        const errorMessage = error?.message ?? null;
        setAuthState(toAuthState(data.session ?? null, errorMessage));
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        setAuthState(toAuthState(null, error.message));
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return;
      }

      setAuthState(toAuthState(session ?? null));
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return createElement(AuthContext.Provider, { value: authState }, children);
}

export function useAuth() {
  return useContext(AuthContext);
}
