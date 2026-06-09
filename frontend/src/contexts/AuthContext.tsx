import { createContext, useContext, useState, type ReactNode } from "react";

interface User {
  id: string;
  email: string;
  role: "admin" | "agent" | "viewer";
  tenantId: string;
  companyName: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (companyName: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Dev user — backend uses DEV_AUTH_BYPASS=true so no real auth needed
const DEV_USER: User = {
  id: "dev-user-001",
  email: "admin@acmecorp.com",
  role: "admin",
  tenantId: "test-tenant-id",
  companyName: "Acme Corp",
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user] = useState<User | null>(DEV_USER);

  const login = async (email: string, _password: string) => {
    return { success: true };
  };

  const register = async (companyName: string, email: string, _password: string) => {
    return { success: true };
  };

  const logout = () => {
    // No-op in dev mode
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: true,
        isLoading: false,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
