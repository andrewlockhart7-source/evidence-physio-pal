import { Header } from "@/components/Header"
import { HeroSection } from "@/components/HeroSection"
import { SearchSection } from "@/components/SearchSection"
import { FeaturesSection } from "@/components/FeaturesSection"
import { EvidenceIntegration } from "@/components/evidence/EvidenceIntegration"
import { RealDataDashboard } from "@/components/dashboard/RealDataDashboard"
import { ErrorBoundary } from "@/components/common/ErrorBoundary"
import { useAuth } from "@/hooks/useAuth"
import { useSubscription } from "@/hooks/useSubscription"
import { useDataPopulation } from "@/hooks/useDataPopulation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Link } from "react-router-dom"
import { 
  ArrowRight, 
  PlayCircle, 
  BookOpen, 
  FileText, 
  Users, 
  Award,
  Sparkles,
  Crown,
  Loader2
} from "lucide-react"

const Index = () => {
  const { user } = useAuth();
  const { subscribed } = useSubscription();
  const { isPopulating } = useDataPopulation();

  return (
    <ErrorBoundary>
      <div className="min-h-screen">
        <Header />
        <main>
        <HeroSection />
        
        {/* Quick Start Guide - Only show for non-subscribed users */}
        {!subscribed && (
          <section className="py-16 bg-gradient-to-br from-medical-blue/5 to-medical-green/5">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <div className="inline-flex items-center px-4 py-2 rounded-full bg-medical-blue/10 text-medical-blue text-sm font-medium mb-4">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Get Started in 3 Steps
                </div>
                <h2 className="text-3xl font-bold text-foreground mb-4">Start Your Journey</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Access evidence-based physiotherapy resources in minutes
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                <Card className="relative overflow-hidden hover-scale border-2 hover:border-medical-blue transition-all">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-medical-blue/20 to-transparent rounded-bl-full" />
                  <CardHeader>
                    <div className="w-12 h-12 bg-gradient-to-br from-medical-blue to-medical-green rounded-lg flex items-center justify-center mb-4">
                      <PlayCircle className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle>1. Take the Tour</CardTitle>
                    <CardDescription>See what's possible with PhysioEvidence</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full" asChild>
                      <Link to="/onboarding">
                        Start Tour
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden hover-scale border-2 hover:border-medical-green transition-all">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-medical-green/20 to-transparent rounded-bl-full" />
                  <CardHeader>
                    <div className="w-12 h-12 bg-gradient-to-br from-medical-green to-medical-blue rounded-lg flex items-center justify-center mb-4">
                      <BookOpen className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle>2. Explore Content</CardTitle>
                    <CardDescription>Browse conditions and assessment tools</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full" asChild>
                      <Link to="/conditions">
                        View Conditions
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden hover-scale border-2 hover:border-medical-blue transition-all">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-medical-blue/20 to-transparent rounded-bl-full" />
                  <CardHeader>
                    <div className="w-12 h-12 bg-gradient-to-br from-medical-blue to-medical-green rounded-lg flex items-center justify-center mb-4">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle>3. Create Account</CardTitle>
                    <CardDescription>Unlock all features and save your work</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full" asChild>
                      <Link to="/auth">
                        Sign Up Free
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Premium CTA */}
              <div className="mt-12 max-w-3xl mx-auto">
                <Card className="bg-gradient-to-br from-medical-blue to-medical-green text-white border-0">
                  <CardContent className="p-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="flex items-start gap-4">
                        <Crown className="h-12 w-12 flex-shrink-0" />
                        <div>
                          <h3 className="text-2xl font-bold mb-2">Upgrade to Premium</h3>
                          <p className="text-white/90 mb-1">
                            Access all 21 conditions, patient management, CPD tracking, and more
                          </p>
                          <p className="text-xl font-bold">Just £3.99/month</p>
                        </div>
                      </div>
                      <Button size="lg" variant="secondary" className="flex-shrink-0" asChild>
                        <Link to="/subscription">
                          View Plans
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
        )}

        <SearchSection />
        <section className="py-20 bg-muted/50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                {isPopulating ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    Setting Up Your Database...
                  </span>
                ) : (
                  'Live Database Statistics'
                )}
              </h2>
              <p className="text-muted-foreground">
                {isPopulating 
                  ? 'Populating with real physiotherapy evidence - this will only take a moment'
                  : 'Real-time data from our comprehensive evidence database'
                }
              </p>
            </div>
            <RealDataDashboard />
            {user && (
              <div className="mt-12">
                <EvidenceIntegration />
              </div>
            )}
          </div>
        </section>
        <FeaturesSection />
      </main>
    </div>
    </ErrorBoundary>
  );
};

export default Index;
