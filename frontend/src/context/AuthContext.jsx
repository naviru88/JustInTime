import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  signup as signupRequest,
  login as loginRequest,
  googleLogin as googleLoginRequest,
  fetchMe,
  setAuthToken,
} from "../services/api.js";

const AuthContext = createContext(null);

const TOKEN_KEY = "jit_token";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Keep the axios client's Authorization header in sync with the token.
  useEffect(() => {
    setAuthToken(token);
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }, [token]);

  // On first load, if we have a stored token, verify it's still valid and load the user.
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    fetchMe()
      .then(setUser)
      .catch(() => {
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyAuthResult = ({ token: newToken, user: newUser }) => {
    // Attach the token to axios synchronously, *before* setToken/setUser
    // trigger a re-render. Otherwise a newly-mounted child (e.g. PantryPage
    // mounting because isAuthenticated just flipped true) can fire its own
    // data fetch in the same commit and race the `useEffect` below that
    // normally does this — losing that race means the request goes out
    // with no Authorization header, gets a 401, and triggers an immediate
    // auto-logout right after a successful login.
    setAuthToken(newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const signup = async (name, email, password) => {
    const result = await signupRequest(name, email, password);
    applyAuthResult(result);
  };

  const login = async (email, password) => {
    const result = await loginRequest(email, password);
    applyAuthResult(result);
  };

  const loginWithGoogle = async (credential) => {
    const result = await googleLoginRequest(credential);
    applyAuthResult(result);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  // A 401 from any API call means the session is no longer valid server-side.
  useEffect(() => {
    const handleUnauthorized = () => logout();
    window.addEventListener("jit:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("jit:unauthorized", handleUnauthorized);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      loading,
      signup,
      login,
      loginWithGoogle,
      logout,
    }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}