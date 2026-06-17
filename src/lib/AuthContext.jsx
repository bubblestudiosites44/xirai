import React, { createContext, useContext, useEffect, useState } from "react";
import { authClient } from "@/lib/authClient";
import { XIRAKO_LOGIN_URL } from "@/lib/xirakoAuth";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const syncSession = (nextSession) => {
      if (!isMounted) {
        return;
      }

      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setIsAuthenticated(Boolean(nextSession?.user));
      setIsLoadingAuth(false);
    };

    const bootstrapAuth = async () => {
      setIsLoadingAuth(true);
      setAuthError(null);

      const {
        data: { session: currentSession },
        error,
      } = await authClient.auth.getSession();

      if (error && isMounted) {
        setAuthError({
          type: "session_error",
          message: error.message,
        });
      }

      syncSession(currentSession ?? null);
    };

    bootstrapAuth();

    const {
      data: { subscription },
    } = authClient.auth.onAuthStateChange((event, nextSession) => {
      if (event === "SIGNED_OUT") {
        setAuthError(null);
      }

      syncSession(nextSession ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    setAuthError(null);
    const { error } = await authClient.auth.signOut();

    if (error) {
      setAuthError({
        type: "sign_out",
        message: error.message,
      });
    }

    return { error };
  };

  const navigateToLogin = () => {
    window.location.assign(XIRAKO_LOGIN_URL);
  };

  const clearAuthError = () => {
    setAuthError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        isAuthenticated,
        isLoadingAuth,
        authError,
        logout,
        navigateToLogin,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
