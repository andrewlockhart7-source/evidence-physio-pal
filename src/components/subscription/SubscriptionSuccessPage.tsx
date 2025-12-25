import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Crown, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";

export const SubscriptionSuccessPage = () => {
  const { checkSubscription } = useSubscription();
  const { toast } = useToast();

  useEffect(() => {
    // Check subscription status after successful payment
    const timer = setTimeout(() => {
      checkSubscription();
      toast({
        title: "Welcome to Premium!",
        description: "Your subscription is now active. Enjoy all premium features!",
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [checkSubscription, toast]);

  return (
    <div className="min-h-screen">
      <Header />
      <div className="bg-gradient-to-br from-background to-muted/50 flex items-center justify-center p-4 min-h-[calc(100vh-4rem)]">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <CardTitle className="flex items-center justify-center gap-2 text-2xl">
            <Crown className="h-6 w-6 text-yellow-600" />
            Payment Successful!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <p className="text-lg font-medium">Welcome to PhysioEvidence Premium</p>
            <p className="text-muted-foreground">
              You now have access to all premium features including:
            </p>
          </div>
          
          <div className="text-left space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Advanced Analytics & Reporting</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Patient Management System</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Treatment Protocol Builder</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">All Condition Modules</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">CPD Tracking & Certification</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Collaboration Tools</span>
            </div>
          </div>

          <div className="space-y-3">
            <Link to="/" className="w-full">
              <Button className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Start Exploring Premium Features
              </Button>
            </Link>
            <Link to="/subscription" className="w-full">
              <Button variant="outline" className="w-full">
                Manage Subscription
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};