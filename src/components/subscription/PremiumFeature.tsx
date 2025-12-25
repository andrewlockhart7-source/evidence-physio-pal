import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { Crown, Lock, Zap } from "lucide-react";
import { Link } from "react-router-dom";

interface PremiumFeatureProps {
  children: ReactNode;
  feature?: string;
  showUpgrade?: boolean;
  requiredTier?: 'basic' | 'professional' | 'enterprise';
}

export const PremiumFeature = ({ 
  children, 
  feature = "this feature", 
  showUpgrade = true,
  requiredTier = 'basic'
}: PremiumFeatureProps) => {
  const { hasAccess, loading } = useSubscription();
  const { user } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (hasAccess(requiredTier)) {
    return <>{children}</>;
  }

  if (!showUpgrade) {
    return null;
  }

  return (
    <Card className="border-dashed border-2 border-muted-foreground/30">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
        </div>
        <CardTitle className="flex items-center justify-center gap-2">
          <Crown className="h-5 w-5 text-yellow-600" />
          Premium Feature
        </CardTitle>
        <CardDescription>
          Upgrade to {requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)} tier or higher to access {feature}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <div className="space-y-2">
          <Badge variant="outline" className="border-yellow-600 text-yellow-600">
            <Zap className="h-3 w-3 mr-1" />
            {requiredTier === 'basic' && '£3.99/month'}
            {requiredTier === 'professional' && '£9.99/month'}
            {requiredTier === 'enterprise' && '£19.99/month'}
          </Badge>
          <p className="text-sm text-muted-foreground">
            Get unlimited access to all premium features
          </p>
        </div>
        
        {user ? (
          <Link to="/subscription">
            <Button className="w-full">
              <Crown className="h-4 w-4 mr-2" />
              Upgrade to Premium
            </Button>
          </Link>
        ) : (
          <Link to="/auth">
            <Button className="w-full">
              Sign In to Upgrade
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
};

interface FreeTierBannerProps {
  currentItem: number;
  totalItems: number;
  category: string;
}

export const FreeTierBanner = ({ currentItem, totalItems, category }: FreeTierBannerProps) => {
  const { subscribed, loading } = useSubscription();
  const { user } = useAuth();

  // Hide banner if loading or if user is subscribed
  if (loading || subscribed) return null;

  return (
    <Card className="mb-6 border-yellow-200 bg-yellow-50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Lock className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-800">
                Free Access: {currentItem} of {totalItems} {category} conditions
              </p>
              <p className="text-sm text-yellow-700">
                Upgrade to access all {totalItems} conditions and premium features
              </p>
            </div>
          </div>
          {user ? (
            <Link to="/subscription">
              <Button size="sm" variant="outline" className="border-yellow-600 text-yellow-600 hover:bg-yellow-100">
                <Crown className="h-3 w-3 mr-1" />
                Upgrade
              </Button>
            </Link>
          ) : (
            <Link to="/auth">
              <Button size="sm" variant="outline" className="border-yellow-600 text-yellow-600 hover:bg-yellow-100">
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
};