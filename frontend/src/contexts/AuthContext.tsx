import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useUser, useAuth as useClerkAuth, useClerk } from "@clerk/clerk-react";
import { clerkBridge } from "../lib/clerk-bridge";

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user: clerkUser, isLoaded: userLoaded } = useUser();
  const { isSignedIn, getToken } = useClerkAuth();
  const { signOut, openSignIn, openSignUp } = useClerk();
  const navigate = useNavigate();
  const wasSignedIn = useRef(false);

  // Map Clerk user to app User interface
  const user: User | null = clerkUser && isSignedIn
    ? {
        id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress || "",
        role: (clerkUser.publicMetadata?.role as "admin" | "agent" | "viewer") || "admin",
        tenantId: (clerkUser.publicMetadata?.tenantId as string) || clerkUser.id,
        companyName: (clerkUser.publicMetadata?.companyName as string) || clerkUser.firstName || "My Workspace",
      }
    : null;

  const login = async (_email: string, _password: string) => {
    openSignIn();
    return { success: true };
  };

  const register = async (_companyName: string, _email: string, _password: string) => {
    openSignUp();
    return { success: true };
  };

  const logout = () => {
    signOut();
  };

  // Detect session expiry — if user was signed in and Clerk has fully loaded but isSignedIn is now false
  useEffect(() => {
    if (!userLoaded) return;
    if (isSignedIn) {
      wasSignedIn.current = true;
    } else if (wasSignedIn.current && !isSignedIn) {
      // Was signed in, now signed out mid-session
      wasSignedIn.current = false;
      toast.info("Session expired — please sign in again");
      navigate("/login", { replace: true });
    }
  }, [isSignedIn, userLoaded, navigate]);

  // M-004: Wire module-level bridge instead of window monkey-patch
  clerkBridge.init(getToken, signOut);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!isSignedIn,
        isLoading: !userLoaded,
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
