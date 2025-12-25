import { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

interface SubscriptionContextType {
  subscribed: boolean;
  subscriptionTier: string | null;
  subscriptionEnd: string | null;
  loading: boolean;
  isTrial: boolean;
  trialEnd: string | null;
  checkSubscription: () => Promise<void>;
  createCheckout: (tier?: string, priceId?: string, promoCode?: string) => Promise<void>;
  openCustomerPortal: () => Promise<void>;
  hasAccess: (requiredTier?: string) => boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

export const SubscriptionProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  
  const [subscribed, setSubscribed] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [isTrial, setIsTrial] = useState(false);
  const [trialEnd, setTrialEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const checkSubscription = async () => {
    console.log('checkSubscription called:', { user: !!user, session: !!session });
    if (!user || !session) {
      console.log('No user or session, resetting subscription state');
      setSubscribed(false);
      setSubscriptionTier(null);
      setSubscriptionEnd(null);
      setIsTrial(false);
      setTrialEnd(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      console.log('Subscription check result:', data);
      setSubscribed(data.subscribed || false);
      setSubscriptionTier(data.subscription_tier || null);
      setSubscriptionEnd(data.subscription_end || null);
      setIsTrial(data.is_trial || false);
      setTrialEnd(data.trial_end || null);
    } catch (error: any) {
      console.error('Error checking subscription:', error);
      
      // Handle specific error cases gracefully
      if (error.message?.includes("temporarily unavailable")) {
        // Service is down, but don't reset subscription state
        console.log("Subscription service temporarily unavailable, keeping current state");
      } else {
        // Other errors, reset subscription state
        setSubscribed(false);
        setSubscriptionTier(null);
        setSubscriptionEnd(null);
        setIsTrial(false);
        setTrialEnd(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const createCheckout = async (tier: string = 'basic', priceId: string = 'price_basic', promoCode?: string) => {
    console.log("🔄 createCheckout called", { user: !!user, session: !!session });
    if (!user || !session) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to subscribe",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log("🚀 Starting checkout process...");
      setLoading(true);
      
      console.log("📡 Calling create-checkout function...");
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          tier,
          price_id: priceId,
          promo_code: promoCode,
          trial_days: 14
        }
      });
      
      console.log("📨 Edge function response:", { data, error });

      if (error) {
        console.error("❌ Edge function error:", error);
        throw error;
      }

      if (!data?.url) {
        console.error("❌ No checkout URL received:", data);
        throw new Error("No checkout URL received");
      }
      
      console.log("✅ Got checkout URL:", data.url);

      // Open Stripe checkout in a new tab
      console.log("🔗 Opening checkout URL in new tab...");
      window.open(data.url, '_blank');
      
      toast({
        title: "Redirecting to Payment",
        description: "Opening Stripe checkout in a new tab...",
      });
    } catch (error: any) {
      console.error('💥 Error creating checkout:', error, { 
        message: error.message, 
        details: error.details,
        code: error.code 
      });
      
      let errorMessage = "Failed to create checkout session. Please try again.";
      
      if (error.message?.includes("temporarily unavailable")) {
        errorMessage = "Payment service is temporarily unavailable. Please try again in a few minutes.";
      } else if (error.message?.includes("Authentication")) {
        errorMessage = "Please sign in again to continue.";
      }
      
      toast({
        title: "Payment Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openCustomerPortal = async () => {
    if (!user || !session) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to manage subscription",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (!data?.url) {
        throw new Error("No portal URL received");
      }

      // Open customer portal in a new tab
      window.open(data.url, '_blank');
      
      toast({
        title: "Opening Customer Portal",
        description: "Redirecting to manage your subscription...",
      });
    } catch (error: any) {
      console.error('Error opening customer portal:', error);
      
      let errorMessage = "Failed to open customer portal";
      let errorTitle = "Portal Error";
      
      if (error.message?.includes("Stripe Customer Portal not configured")) {
        errorTitle = "Setup Required";
        errorMessage = "Please activate the Stripe Customer Portal in your Stripe Dashboard settings first.";
      } else if (error.message?.includes("No subscription found")) {
        errorMessage = "No subscription found. Please create a subscription first.";
      } else if (error.message?.includes("Authentication")) {
        errorMessage = "Please sign in again to continue.";
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Check if user has access based on tier hierarchy
  const hasAccess = (requiredTier?: string) => {
    if (!requiredTier) return subscribed;
    
    const tierHierarchy = ['basic', 'professional', 'enterprise'];
    const userTierIndex = subscriptionTier ? tierHierarchy.indexOf(subscriptionTier) : -1;
    const requiredTierIndex = tierHierarchy.indexOf(requiredTier);
    
    return subscribed && userTierIndex >= requiredTierIndex;
  };

  // Check subscription on auth state changes
  useEffect(() => {
    if (user) {
      setTimeout(() => {
        checkSubscription();
      }, 0);
    } else {
      setSubscribed(false);
      setSubscriptionTier(null);
      setSubscriptionEnd(null);
      setIsTrial(false);
      setTrialEnd(null);
      setLoading(false);
    }
  }, [user, session]);

  // Auto-refresh subscription status every 30 seconds
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      checkSubscription();
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);

  return (
    <SubscriptionContext.Provider value={{
    subscribed,
    subscriptionTier,
    subscriptionEnd,
    isTrial,
    trialEnd,
    loading,
    checkSubscription,
    createCheckout,
    openCustomerPortal,
    hasAccess,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
};