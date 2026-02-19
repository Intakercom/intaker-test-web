import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { AuthResponse } from "@/lib/api";

interface AuthUser {
  userId: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (response: AuthResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function parseToken(): AuthUser | null {
  const token = localStorage.getItem("auth_token");
  const userId = localStorage.getItem("auth_userId");
  const email = localStorage.getItem("auth_email");
  const role = localStorage.getItem("auth_role");

  if (!token || !userId || !email || !role) return null;
  return { userId, email, role };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(parseToken);
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem("auth_token")
  );

  const login = useCallback((response: AuthResponse) => {
    localStorage.setItem("auth_token", response.token);
    localStorage.setItem("auth_userId", response.userId);
    localStorage.setItem("auth_email", response.email);
    localStorage.setItem("auth_role", response.role?.toLowerCase());
    setToken(response.token);
    setUser({
      userId: response.userId,
      email: response.email,
      role: response.role?.toLowerCase(),
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_userId");
    localStorage.removeItem("auth_email");
    localStorage.removeItem("auth_role");
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, isAuthenticated: !!user, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
