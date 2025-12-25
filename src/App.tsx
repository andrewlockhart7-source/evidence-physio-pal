import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import GuidelinesPage from "./pages/GuidelinesPage";
import EvidencePage from "./pages/EvidencePage";
import AssessmentPage from "./pages/AssessmentPage";
import ConditionsPage from "./pages/ConditionsPage";
import { AuthPage } from "./components/auth/AuthPage";
import { AuthProvider } from "./hooks/useAuth";
import { SubscriptionProvider } from "./hooks/useSubscription";
import { ConditionModules } from "./components/conditions/ConditionModules";
import AssessmentsPage from "./pages/AssessmentsPage";
import { PersonalizedDashboard } from "./components/dashboard/PersonalizedDashboard";
import CPDPage from "./pages/CPDPage";
import CollaborationPage from "./pages/CollaborationPage";
import ProtocolsPage from "./pages/ProtocolsPage";
import SecurityPage from "./pages/SecurityPage";
import SubscriptionAnalyticsPage from "./pages/SubscriptionAnalyticsPage";
import { AnalyticsDashboard } from "./components/analytics/AnalyticsDashboard";
import { SubscriptionPage } from "./components/subscription/SubscriptionPage";
import { SubscriptionSuccessPage } from "./components/subscription/SubscriptionSuccessPage";
import { AdvancedFeatures } from "./components/advanced/AdvancedFeatures";
import { HealthcareProviderVerification } from "./components/admin/HealthcareProviderVerification";
import { OnboardingFlow } from "./components/onboarding/OnboardingFlow";
import { DataPopulationPage } from "./pages/DataPopulationPage";
import AuthCallback from "./pages/AuthCallback";
import AuthDebug from "./pages/AuthDebug";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import ContactUsPage from "./pages/ContactUsPage";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";


const queryClient = new QueryClient();

// Handles cases where auth tokens are in the URL hash or code in search on any route
const AuthHashHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Redirect to /auth/callback when tokens are present but we're on a different route
  useEffect(() => {
    const hasAuthHash = typeof window !== 'undefined' && window.location.hash?.includes('access_token');
    const hasErrorHash = typeof window !== 'undefined' && window.location.hash?.includes('error');
    const searchParams = new URLSearchParams(location.search);
    const code = searchParams.get('code');
    const token = searchParams.get('token');
    const type = searchParams.get('type');
    
    // Handle magic link tokens and other auth flows
    const hasAuthParams = hasAuthHash || hasErrorHash || code || (token && type);
    
    if (hasAuthParams && location.pathname !== '/auth/callback') {
      const target = `/auth/callback${location.search}${window.location.hash || ''}`;
      console.log('AuthHashHandler: Redirecting to callback', { target, pathname: location.pathname });
      navigate(target, { replace: true });
    }
  }, [location, navigate]);

  return null;
};

const App = () => (
  <>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SubscriptionProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            {/* Global error boundary to prevent blank screen on unexpected errors */}
            <BrowserRouter>
              <ErrorBoundary>
                <AuthHashHandler />
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/onboarding" element={<OnboardingFlow />} />
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="/verify" element={<AuthCallback />} />
                  <Route path="/auth/debug" element={<AuthDebug />} />
                  <Route path="/dashboard" element={<ProtectedRoute><PersonalizedDashboard /></ProtectedRoute>} />
                  <Route path="/conditions" element={<ConditionsPage />} />
                  <Route path="/assessments" element={<AssessmentsPage />} />
                  <Route path="/assessment/:toolId" element={<AssessmentPage />} />
                  <Route path="/protocols" element={<ProtectedRoute><ProtocolsPage /></ProtectedRoute>} />
                  <Route path="/guidelines" element={<GuidelinesPage />} />
                  <Route path="/evidence" element={<EvidencePage />} />
                  <Route path="/cpd" element={<ProtectedRoute><CPDPage /></ProtectedRoute>} />
                  <Route path="/collaboration" element={<ProtectedRoute><CollaborationPage /></ProtectedRoute>} />
                  <Route path="/analytics" element={<ProtectedRoute><AnalyticsDashboard /></ProtectedRoute>} />
                  <Route path="/advanced" element={<ProtectedRoute><AdvancedFeatures /></ProtectedRoute>} />
                  <Route path="/subscription" element={<ProtectedRoute><SubscriptionPage /></ProtectedRoute>} />
                  <Route path="/subscription-success" element={<ProtectedRoute><SubscriptionSuccessPage /></ProtectedRoute>} />
                  <Route path="/subscription-analytics" element={<ProtectedRoute><SubscriptionAnalyticsPage /></ProtectedRoute>} />
                  <Route path="/verification" element={<ProtectedRoute><HealthcareProviderVerification /></ProtectedRoute>} />
                  <Route path="/security" element={<ProtectedRoute><SecurityPage /></ProtectedRoute>} />
                  <Route path="/populate-data" element={<DataPopulationPage />} />
                  <Route path="/privacy" element={<PrivacyPolicyPage />} />
                  <Route path="/contact" element={<ContactUsPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </ErrorBoundary>
            </BrowserRouter>
          </TooltipProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </QueryClientProvider>
  </>
);

export default App;
