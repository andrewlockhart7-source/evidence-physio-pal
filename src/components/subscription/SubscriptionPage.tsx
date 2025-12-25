import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { Crown, Check, Zap, Users, BarChart3, Lock, LogOut, LogIn } from "lucide-react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";

export const SubscriptionPage = () => {
  const { user, signOut } = useAuth();
  const { subscribed, subscriptionTier, subscriptionEnd, loading, createCheckout, openCustomerPortal } = useSubscription();
  const [processing, setProcessing] = useState(false);

  const handleSubscribe = async () => {
    console.log("🎯 handleSubscribe called - starting subscription process");
    setProcessing(true);
    await createCheckout();
    setProcessing(false);
  };

  const handleManageSubscription = async () => {
    setProcessing(true);
    await openCustomerPortal();
    setProcessing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading subscription status...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-4xl">
      <div className="flex justify-end mb-4">
        {user ? (
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        ) : (
          <Button variant="outline" size="sm" asChild>
            <Link to="/auth">
              <LogIn className="h-4 w-4 mr-2" />
              Sign In
            </Link>
          </Button>
        )}
      </div>
      
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Choose Your Plan</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Get full access to evidence-based physiotherapy resources, advanced protocols, and professional tools.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Free Plan */}
        <Card className={`relative ${!subscribed ? 'border-2 border-primary' : ''}`}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Free Access
                </CardTitle>
                <CardDescription>Perfect for getting started</CardDescription>
              </div>
              {!subscribed && (
                <Badge variant="secondary">Current Plan</Badge>
              )}
            </div>
            <div className="text-3xl font-bold">£0<span className="text-lg font-normal text-muted-foreground">/month</span></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm">First condition in MSK category</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm">First condition in Respiratory category</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm">First condition in Neurological category</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm">Basic assessment tools</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Limited evidence access</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Premium Plan */}
        <Card className={`relative ${subscribed ? 'border-2 border-primary' : ''}`}>
          {subscribed && (
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground">
                <Crown className="h-3 w-3 mr-1" />
                Current Plan
              </Badge>
            </div>
          )}
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-yellow-600" />
                  Premium Access
                </CardTitle>
                <CardDescription>Complete physiotherapy resource suite</CardDescription>
              </div>
              {!subscribed && (
                <Badge variant="outline" className="border-primary text-primary">
                  Most Popular
                </Badge>
              )}
            </div>
            <div className="text-3xl font-bold">£3.99<span className="text-lg font-normal text-muted-foreground">/month</span></div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm">All 21 conditions across all categories</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm">Complete assessment tools library</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm">Treatment protocol builder</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm">Patient management system</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm">CPD tracking & certification</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm">Collaboration & peer review</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm">Advanced analytics dashboard</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-600" />
                <span className="text-sm">Priority support</span>
              </div>
            </div>

            <div className="pt-4">
              {subscribed ? (
                <div className="space-y-3">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      Subscription active until {subscriptionEnd ? new Date(subscriptionEnd).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <Button 
                    onClick={handleManageSubscription}
                    disabled={processing}
                    variant="outline"
                    className="w-full"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Manage Subscription
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={handleSubscribe}
                  disabled={processing || !user}
                  className="w-full"
                  size="lg"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  {processing ? 'Processing...' : 'Upgrade to Premium'}
                </Button>
              )}
              
              {!user && (
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Sign in required to subscribe
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feature Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>What's Included</CardTitle>
          <CardDescription>
            Compare features between Free and Premium access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Evidence-Based Content</h4>
              <p className="text-sm text-muted-foreground">
                {subscribed ? 'Full access to all conditions and evidence levels A-D' : 'Limited to 3 basic conditions'}
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Professional Tools</h4>
              <p className="text-sm text-muted-foreground">
                {subscribed ? 'Complete suite including protocols, patient management, and analytics' : 'Basic assessment tools only'}
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Collaboration</h4>
              <p className="text-sm text-muted-foreground">
                {subscribed ? 'Share protocols, peer review, and professional networking' : 'View-only access'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      </main>
    </div>
  );
};