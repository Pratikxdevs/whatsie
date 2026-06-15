import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ClerkProvider } from "@clerk/clerk-react";
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
import { LoginView } from "./components/auth/LoginView";
import { RegisterView } from "./components/auth/RegisterView";

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!CLERK_KEY) {
  throw new Error("VITE_CLERK_PUBLISHABLE_KEY is required — add it to your .env file");
}

function CustomLoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return <LoginView />;
}

function CustomRegisterPage() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return <RegisterView />;
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
              {/* Public routes — Custom UI synced with Clerk */}
              <Route path="/login/*" element={<CustomLoginPage />} />
              <Route path="/register/*" element={<CustomRegisterPage />} />

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
