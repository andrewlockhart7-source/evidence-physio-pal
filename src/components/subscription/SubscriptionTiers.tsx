import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Zap, Building } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { PromoCodeInput } from "./PromoCodeInput";

interface SubscriptionTiersProps {
  onTierSelect: (tier: string, price: number, priceId: string, promoCode?: string) => void;
}

export const SubscriptionTiers = ({ onTierSelect }: SubscriptionTiersProps) => {
  const { user } = useAuth();
  const { subscribed, subscriptionTier } = useSubscription();
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [appliedPromo, setAppliedPromo] = useState<{code: string, discount: {percent?: number, amount?: number}} | null>(null);

  const tiers = [
    {
      id: 'basic',
      name: 'Basic',
      price: 3.99,
      priceId: 'price_basic',
      description: 'Perfect for individual practitioners',
      icon: <Crown className="h-6 w-6" />,
      popular: true,
      features: [
        'Access to all conditions',
        'Treatment protocols',
        'Evidence-based research',
        'Patient management (up to 50)',
        'Basic analytics',
        'ZygoteBody Premium features',
        'Email support'
      ]
    },
    {
      id: 'professional',
      name: 'Professional',
      price: 9.99,
      priceId: 'price_professional',
      description: 'For established practices',
      icon: <Zap className="h-6 w-6" />,
      popular: false,
      features: [
        'Everything in Basic',
        'Unlimited patients',
        'Advanced analytics',
        'Custom protocol templates',
        'Collaboration tools',
        'Priority support',
        'White-label options'
      ]
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 19.99,
      priceId: 'price_enterprise',
      description: 'For healthcare facilities',
      icon: <Building className="h-6 w-6" />,
      popular: false,
      features: [
        'Everything in Professional',
        'Multi-user management',
        'Custom integrations',
        'Advanced security',
        'Dedicated account manager',
        'Custom training',
        'SLA guarantees'
      ]
    }
  ];

  const calculateDiscountedPrice = (originalPrice: number) => {
    if (!appliedPromo) return originalPrice;
    
    if (appliedPromo.discount.percent) {
      return originalPrice * (1 - appliedPromo.discount.percent / 100);
    }
    
    if (appliedPromo.discount.amount) {
      return Math.max(0, originalPrice - (appliedPromo.discount.amount / 100));
    }
    
    return originalPrice;
  };

  const handleTierSelect = (tier: any) => {
    const discountedPrice = calculateDiscountedPrice(tier.price);
    onTierSelect(tier.id, discountedPrice, tier.priceId, appliedPromo?.code);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Choose Your Plan</h2>
        <p className="text-muted-foreground">
          Start with a 14-day free trial on any paid plan
        </p>
      </div>

      <PromoCodeInput
        onCodeApplied={(discount) => setAppliedPromo({code: 'APPLIED', discount})}
        onCodeRemoved={() => setAppliedPromo(null)}
        appliedCode={appliedPromo?.code}
      />

      <div className="grid md:grid-cols-3 gap-6">
        {tiers.map((tier) => {
          const isCurrentTier = subscriptionTier === tier.id;
          const discountedPrice = calculateDiscountedPrice(tier.price);
          const hasDiscount = discountedPrice < tier.price;

          return (
            <Card 
              key={tier.id} 
              className={`relative ${tier.popular ? 'border-primary' : ''} ${
                selectedTier === tier.id ? 'ring-2 ring-primary' : ''
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="px-3 py-1">Most Popular</Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-2 p-2 w-fit rounded-lg bg-primary/10">
                  {tier.icon}
                </div>
                <CardTitle className="text-xl">{tier.name}</CardTitle>
                <CardDescription>{tier.description}</CardDescription>
                
                <div className="space-y-1">
                  {hasDiscount && (
                    <div className="text-sm text-muted-foreground line-through">
                      £{tier.price.toFixed(2)}/month
                    </div>
                  )}
                  <div className="text-3xl font-bold">
                    £{discountedPrice.toFixed(2)}
                    <span className="text-base font-normal text-muted-foreground">/month</span>
                  </div>
                  {hasDiscount && (
                    <Badge variant="secondary" className="text-xs">
                      {appliedPromo?.discount.percent}% OFF
                    </Badge>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                
                {user ? (
                  <Button
                    className="w-full"
                    variant={isCurrentTier ? "outline" : "default"}
                    disabled={isCurrentTier}
                    onClick={() => handleTierSelect(tier)}
                  >
                    {isCurrentTier ? 'Current Plan' : `Start 14-Day Free Trial`}
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => window.location.href = '/auth'}
                  >
                    Sign In to Subscribe
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      <div className="text-center text-sm text-muted-foreground">
        <p>All plans include 14-day free trial • Cancel anytime • No setup fees</p>
      </div>
    </div>
  );
};