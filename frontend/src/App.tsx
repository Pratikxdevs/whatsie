import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ClerkProvider, SignIn, SignUp } from "@clerk/clerk-react";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { setupErrorToasts } from "./utils/errors";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { DashboardPage } from "./pages/DashboardPage";
import { BotsPage } from "./pages/BotsPage";
import { LeadsPage } from "./pages/LeadsPage";
import { ConversationsPage } from "./pages/ConversationsPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { BillingPage } from "./pages/BillingPage";
import { SettingsPage } from "./pages/SettingsPage";
import { NotFoundPage } from "./pages/NotFoundPage";

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!CLERK_KEY) {
  throw new Error("VITE_CLERK_PUBLISHABLE_KEY is required — add it to your .env file");
}

function ClerkSignInPage() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
      <SignIn
        routing="path"
        path="/login"
        signUpUrl="/register"
        appearance={{
          variables: {
            colorPrimary: "#22c55e",
            colorBackground: "#0c0c0e",
            colorText: "#f4f4f5",
            colorInputBackground: "#18181b",
            colorInputText: "#f4f4f5",
            borderRadius: "0.75rem",
          },
        }}
      />
    </div>
  );
}

function ClerkSignUpPage() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
      <SignUp
        routing="path"
        path="/register"
        signInUrl="/login"
        appearance={{
          variables: {
            colorPrimary: "#22c55e",
            colorBackground: "#0c0c0e",
            colorText: "#f4f4f5",
            colorInputBackground: "#18181b",
            colorInputText: "#f4f4f5",
            borderRadius: "0.75rem",
          },
        }}
      />
    </div>
  );
}

export default function App() {
  useEffect(() => {
    setupErrorToasts();
  }, []);

  return (
    <ErrorBoundary>
      <ClerkProvider publishableKey={CLERK_KEY}>
        {/* Router must wrap AuthProvider so useNavigate() works inside AuthContext */}
        <Router>
          <AuthProvider>
            <Toaster position="top-right" richColors />
            <Routes>
              {/* Public routes — Clerk handles auth UI */}
              <Route path="/login/*" element={<ClerkSignInPage />} />
              <Route path="/register/*" element={<ClerkSignUpPage />} />

              {/* Protected routes */}
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/bots" element={<BotsPage />} />
                  <Route path="/leads" element={<LeadsPage />} />
                  <Route path="/conversations" element={<ConversationsPage />} />
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/billing" element={<BillingPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>
              </Route>

              {/* Catch all — show 404 page */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </AuthProvider>
        </Router>
      </ClerkProvider>
    </ErrorBoundary>
  );
}
